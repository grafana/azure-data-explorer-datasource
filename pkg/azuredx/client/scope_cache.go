package client

import (
	"context"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

// scopeCacheTTL is how long a successfully resolved set of scopes is cached for
// a given cluster. The cluster's Kusto audience is effectively immutable, so a
// long TTL is safe.
// scopeCacheTTL is how long a successfully resolved scope is cached for a given
// cluster. The cluster's Kusto audience is effectively immutable, so a long TTL
// is safe.
const scopeCacheTTL = 1 * time.Hour

type scopeCacheEntry struct {
	scope  string
	expiry time.Time
}

// scopeCache caches resolved scopes per cluster. Reads are lock-free via
// sync.Map, and concurrent misses for the same key are collapsed into a single
// fetch via singleflight so that no mutex is held for the duration of a network
// call. Only successful resolutions are cached; failures are never stored.
type scopeCache struct {
	ttl     time.Duration
	entries sync.Map // map[string]scopeCacheEntry
	group   singleflight.Group
}

func newScopeCache(ttl time.Duration) *scopeCache {
	return &scopeCache{ttl: ttl}
}

func (c *scopeCache) get(key string) ([]string, bool) {
	v, ok := c.entries.Load(key)
	if !ok {
		return nil, false
	}
	entry := v.(scopeCacheEntry)
	if time.Now().After(entry.expiry) {
		return nil, false
	}
	return entry.scopes, true
}

// resolve returns cached scopes for key, or invokes fetch to populate the cache
// on a miss. Concurrent callers for the same key share a single fetch. The
// fetch runs on a context detached from any individual caller so that one
// caller's cancellation cannot abort the shared work for the others; each
// caller still observes its own context cancellation.
func (c *scopeCache) resolve(ctx context.Context, key string, fetch func(ctx context.Context) ([]string, error)) ([]string, error) {
	if scopes, ok := c.get(key); ok {
		return scopes, nil
	}

	ch := c.group.DoChan(key, func() (interface{}, error) {
		// Another caller may have populated the cache between our miss above and
		// acquiring this flight.
		if scopes, ok := c.get(key); ok {
			return scopes, nil
		}

		fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), metadataTimeout)
		defer cancel()

		scopes, err := fetch(fetchCtx)
		if err != nil {
			return nil, err
		}

		c.entries.Store(key, scopeCacheEntry{scopes: scopes, expiry: time.Now().Add(c.ttl)})
		return scopes, nil
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
