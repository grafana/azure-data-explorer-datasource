package client

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScopeCache_GetExpiry(t *testing.T) {
	c := newScopeCache(50*time.Millisecond, negativeCacheTTL)

	if _, ok := c.get("cluster"); ok {
		t.Fatal("expected miss on empty cache")
	}

	c.entries.Store("cluster", scopeCacheEntry{scope: "scope", expiry: time.Now().Add(50 * time.Millisecond)})
	got, ok := c.get("cluster")
	require.True(t, ok)
	assert.Equal(t, "scope", got.scope)

	// Store an already-expired entry and confirm it's treated as a miss and
	// evicted from the map.
	c.entries.Store("cluster", scopeCacheEntry{scope: "scope", expiry: time.Now().Add(-time.Second)})
	_, ok = c.get("cluster")
	assert.False(t, ok)
	_, stillStored := c.entries.Load("cluster")
	assert.False(t, stillStored, "expired entries should be evicted on access")
}

func TestScopeCache_ResolveCachesSuccess(t *testing.T) {
	c := newScopeCache(time.Hour, negativeCacheTTL)
	var calls int64
	fetch := func(_ context.Context) (string, error) {
		atomic.AddInt64(&calls, 1)
		return "https://cluster.example.com/.default", nil
	}

	first, err := c.resolve(context.Background(), "cluster", fetch)
	require.NoError(t, err)
	second, err := c.resolve(context.Background(), "cluster", fetch)
	require.NoError(t, err)

	assert.Equal(t, first, second)
	assert.Equal(t, int64(1), atomic.LoadInt64(&calls), "fetch should only run once for a cached key")

	cached, ok := c.get("cluster")
	require.True(t, ok)
	assert.Equal(t, "https://cluster.example.com/.default", cached.scope)
}

func TestScopeCache_ResolveCollapsesConcurrentMisses(t *testing.T) {
	c := newScopeCache(time.Hour, negativeCacheTTL)
	var calls int64
	fetch := func(_ context.Context) (string, error) {
		atomic.AddInt64(&calls, 1)
		time.Sleep(100 * time.Millisecond) // hold the flight open so callers pile up
		return "scope", nil
	}

	const workers = 50
	start := make(chan struct{})
	var wg sync.WaitGroup
	errs := make(chan error, workers)
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			scope, err := c.resolve(context.Background(), "cluster", fetch)
			if err != nil {
				errs <- err
				return
			}
			if scope != "scope" {
				errs <- fmt.Errorf("unexpected scope %q", scope)
			}
		}()
	}
	close(start)
	wg.Wait()
	close(errs)
	for err := range errs {
		require.NoError(t, err)
	}

	assert.Equal(t, int64(1), atomic.LoadInt64(&calls), "concurrent misses should collapse into a single fetch")
}

func TestScopeCache_ResolveNegativeCachesFailure(t *testing.T) {
	// Short negative TTL so we can observe expiry without a long sleep.
	c := newScopeCache(time.Hour, 50*time.Millisecond)
	var calls int64
	fetch := func(_ context.Context) (string, error) {
		atomic.AddInt64(&calls, 1)
		return "", errors.New("metadata unavailable")
	}

	_, err := c.resolve(context.Background(), "cluster", fetch)
	require.Error(t, err)
	// Within the negative TTL the failure is served from cache without a new fetch.
	_, err = c.resolve(context.Background(), "cluster", fetch)
	require.Error(t, err)
	assert.Equal(t, int64(1), atomic.LoadInt64(&calls), "failures should be negatively cached within the TTL")

	// Once the negative entry expires, the next resolve re-attempts the fetch.
	time.Sleep(60 * time.Millisecond)
	_, err = c.resolve(context.Background(), "cluster", fetch)
	require.Error(t, err)
	assert.Equal(t, int64(2), atomic.LoadInt64(&calls), "expired negative entries should trigger a re-fetch")
}

func TestScopeCache_ResolveHonorsCallerCancellation(t *testing.T) {
	c := newScopeCache(time.Hour, negativeCacheTTL)
	release := make(chan struct{})
	fetchStarted := make(chan struct{})
	var once sync.Once
	fetch := func(_ context.Context) (string, error) {
		once.Do(func() { close(fetchStarted) })
		<-release // block until the test lets the shared fetch finish
		return "scope", nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() {
		_, err := c.resolve(ctx, "cluster", fetch)
		result <- err
	}()

	<-fetchStarted
	cancel()

	select {
	case err := <-result:
		require.ErrorIs(t, err, context.Canceled)
	case <-time.After(2 * time.Second):
		t.Fatal("resolve did not return after caller cancellation")
	}

	// The detached fetch is unaffected by the caller's cancellation; let it
	// finish so it can populate the cache.
	close(release)
	require.Eventually(t, func() bool {
		_, ok := c.get("cluster")
		return ok
	}, 2*time.Second, 10*time.Millisecond, "shared fetch should complete and cache despite caller cancellation")
}

func countingMetadataServer(t *testing.T, kustoServiceResourceID string) (*httptest.Server, *int64) {
	t.Helper()
	var count int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&count, 1)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintf(w, `{"AzureAD":{"KustoServiceResourceId":"%s"}}`, kustoServiceResourceID)
	}))
	return server, &count
}

func TestScopeResolver_CachesMetadata(t *testing.T) {
	server, count := countingMetadataServer(t, "https://cluster.example.com")
	defer server.Close()

	resolver := newScopeResolver(azsettings.AzurePublic, server.Client(), parseTrustedHosts([]string{server.URL}))
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, server.URL, nil)
	require.NoError(t, err)

	for i := 0; i < 3; i++ {
		scopes, err := resolver(context.Background(), req)
		require.NoError(t, err)
		assert.Equal(t, []string{"https://cluster.example.com/.default"}, scopes)
	}

	assert.Equal(t, int64(1), atomic.LoadInt64(count), "metadata should be fetched once and then served from cache")
}

func TestScopeResolver_FailureNegativeCached(t *testing.T) {
	var count int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&count, 1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	resolver := newScopeResolver(azsettings.AzurePublic, server.Client(), parseTrustedHosts([]string{server.URL}))
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, server.URL, nil)
	require.NoError(t, err)

	// Both calls fall back to the default scopes, but the failed metadata lookup
	// is negatively cached so the endpoint is only hit once within the TTL.
	for i := 0; i < 2; i++ {
		scopes, err := resolver(context.Background(), req)
		require.NoError(t, err)
		assert.Equal(t, []string{"https://kusto.kusto.windows.net/.default"}, scopes)
	}

	assert.Equal(t, int64(1), atomic.LoadInt64(&count), "failed metadata lookups should be negatively cached within the TTL")
}

func TestScopeResolver_DeniesUntrustedHost(t *testing.T) {
	// The server pretends to be a cluster and returns a crafted audience, but
	// its host is not in the trusted set.
	server, count := countingMetadataServer(t, "https://management.azure.com")
	defer server.Close()

	resolver := newScopeResolver(azsettings.AzurePublic, server.Client(), parseTrustedHosts([]string{"https://*.kusto.windows.net"}))
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, server.URL, nil)
	require.NoError(t, err)

	scopes, err := resolver(context.Background(), req)
	require.NoError(t, err)
	// Falls back to default scopes without ever contacting the untrusted host.
	assert.Equal(t, []string{"https://kusto.kusto.windows.net/.default"}, scopes)
	assert.Equal(t, int64(0), atomic.LoadInt64(count), "metadata must not be fetched from an untrusted host")
}
