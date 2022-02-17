package azureauth

import (
	"context"
	"sync"
	"time"
)

type cacheEntry struct {
	value  string
	expire time.Time
}

func (e *cacheEntry) expired() bool {
	return !e.expire.IsZero() && time.Now().After(e.expire)
}

type cache struct {
	sync.Mutex
	perKey      map[string](chan *cacheEntry)
	lookupCount uint
}

func newCache() *cache {
	return &cache{perKey: make(map[string](chan *cacheEntry))}
}

// Resolver gets the value for a key.
type resolver func(ctx context.Context, key string) (value string, expire time.Time, err error)

// GetOrSet does a lookup for key, with r only applied on absense. Resolvers do
// not race each other—only one resolver gets called for a key at a time.
func (c *cache) getOrSet(ctx context.Context, key string, r resolver) (value string, err error) {
	entry, unlock := c.lockedEntry(key)
	if entry.value == "" || entry.expired() {
		entry.value, entry.expire, err = r(ctx, key)
	}
	unlock <- entry
	return entry.value, err
}

// LockedEntry either uses the cacheEntry present for key, or it installs a new
// one. The caller MUST send entry to unlock either way.
func (c *cache) lockedEntry(key string) (entry *cacheEntry, unlock chan<- *cacheEntry) {
	c.Lock()

	c.lookupCount++
	if c.lookupCount&255 == 0 {
		c.purgeExpiredInLock()
	}

	value, ok := c.perKey[key]
	if !ok {
		value = make(chan *cacheEntry, 1)
		c.perKey[key] = value
	}

	c.Unlock()

	if !ok {
		return new(cacheEntry), value
	}
	return <-value, value
}

func (c *cache) purgeExpiredInLock() {
	for key, value := range c.perKey {
		select {
		case entry := <-value: // lock
			if entry.expired() {
				delete(c.perKey, key)
			}
			value <- entry // unlock
		default:
			break // value in use
		}
	}
}
