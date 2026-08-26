package client

import (
	"context"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

// scopeCacheTTL is how long a successfully resolved scope is cached for a given
// cluster. The cluster's Kusto audience is effectively immutable, so a long TTL
// is safe.
const scopeCacheTTL = 1 * time.Hour

// negativeCacheTTL bounds how long a failed resolution is cached. Failures are
// cached only briefly so that a transient metadata-endpoint outage doesn't make
// every non-overlapping query re-pay the full metadataTimeout, while still
// recovering quickly once the endpoint becomes healthy again.
const negativeCacheTTL = 30 * time.Second

type scopeCacheEntry struct {
	scope  string
	err    error
	expiry time.Time
}

// scopeCache caches the resolved scope per cluster. ADX only ever has a single
// audience scope, so a plain string is stored and wrapped into a slice at the
// resolver boundary. Reads are lock-free via sync.Map, and concurrent misses
// for the same key are collapsed into a single fetch via singleflight so that no
// mutex is held for the duration of a network call. Both successful resolutions
// (for scopeCacheTTL) and failures (for negativeCacheTTL) are cached; expired
// entries are evicted on access so the map does not grow without bound as
// distinct cluster hosts are resolved.
type scopeCache struct {
	ttl         time.Duration
	negativeTTL time.Duration
	entries     sync.Map // map[string]scopeCacheEntry
	group       singleflight.Group
}

func newScopeCache(ttl, negativeTTL time.Duration) *scopeCache {
	return &scopeCache{ttl: ttl, negativeTTL: negativeTTL}
}

// get returns the cached entry for key when present and unexpired. Expired
// entries are deleted on access to keep the map bounded, since the key space is
// whatever ClusterUri queries specify.
func (c *scopeCache) get(key string) (scopeCacheEntry, bool) {
	v, ok := c.entries.Load(key)
	if !ok {
		return scopeCacheEntry{}, false
	}
	entry := v.(scopeCacheEntry)
	if time.Now().After(entry.expiry) {
		c.entries.Delete(key)
		return scopeCacheEntry{}, false
	}
	return entry, true
}

// resolve returns the cached scope for key, or invokes fetch to populate the
// cache on a miss. Concurrent callers for the same key share a single fetch. The
// fetch runs on a context detached from any individual caller (cancellation is
// dropped but values such as tracing are retained) so that one caller's
// cancellation cannot abort the shared work for the others; each caller still
// observes its own context cancellation. Successful fetches are cached for ttl
// and failures for negativeTTL.
func (c *scopeCache) resolve(ctx context.Context, key string, fetch func(ctx context.Context) (string, error)) (string, error) {
	if entry, ok := c.get(key); ok {
		return entry.scope, entry.err
	}

	ch := c.group.DoChan(key, func() (interface{}, error) {
		// Another caller may have populated the cache between our miss above and
		// acquiring this flight.
		if entry, ok := c.get(key); ok {
			return entry, nil
		}

		fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), metadataTimeout)
		defer cancel()

		scope, err := fetch(fetchCtx)
		if err != nil {
			entry := scopeCacheEntry{err: err, expiry: time.Now().Add(c.negativeTTL)}
			c.entries.Store(key, entry)
			return entry, nil
		}

		entry := scopeCacheEntry{scope: scope, expiry: time.Now().Add(c.ttl)}
		c.entries.Store(key, entry)
		return entry, nil
	})

	select {
	case <-ctx.Done():
		return "", ctx.Err()
	case res := <-ch:
		if res.Err != nil {
			return "", res.Err
		}
		entry := res.Val.(scopeCacheEntry)
		return entry.scope, entry.err
	}
}
