package azureauth

import (
	"context"
	"sync"
	"time"
)

type cacheEntry struct {
	sync.Mutex
	value  string
	expire time.Time
}

func (e *cacheEntry) expired() bool {
	return !e.expire.IsZero() && time.Now().After(e.expire)
}

type cache struct {
	sync.Mutex
	perKey      map[string]*cacheEntry
	lookupCount uint
}

func newCache() *cache {
	return &cache{perKey: make(map[string]*cacheEntry)}
}

// Resolver gets the value for a key.
type resolver func(ctx context.Context, key string) (value string, expire time.Time, err error)

// GetOrSet does a lookup for key, with r only applied on absense. Resolvers do
// not race each other—only one resolver gets called for a key at a time.
func (c *cache) getOrSet(ctx context.Context, key string, r resolver) (value string, err error) {
	entry := c.lockedEntry(key)
	defer entry.Unlock()

	if entry.value == "" || entry.expired() {
		entry.value, entry.expire, err = r(ctx, key)
	}
	return entry.value, err
}

// LockedEntry either uses the cacheEntry present for key, or it installs a new
// one. The caller MUST unlock the return either way.
func (c *cache) lockedEntry(key string) *cacheEntry {
	c.Lock()
	defer c.Unlock()

	c.lookupCount++
	if c.lookupCount&1023 == 0 {
		c.purgeExpiredInLock()
	}

	entry, ok := c.perKey[key]
	if !ok {
		entry = new(cacheEntry)
		c.perKey[key] = entry
	}

	entry.Lock()
	return entry
}

func (c *cache) purgeExpiredInLock() {
	for key, entry := range c.perKey {
		entry.Lock()
		if entry.expired() {
			delete(c.perKey, key)
		}
		entry.Unlock()
	}
}
