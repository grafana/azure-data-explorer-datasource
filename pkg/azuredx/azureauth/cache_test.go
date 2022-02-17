package azureauth

import (
	"context"
	"testing"
	"time"
)

func TestCacheHit(t *testing.T) {
	cache := newCache()
	testCtx := context.Background()
	const testKey, testValue = "test key", "test value"

	// assert resolve
	got, err := cache.getOrSet(testCtx, testKey, func(ctx context.Context, key string) (value string, expire time.Time, err error) {
		if key != testKey {
			t.Errorf("resolve with key %q, want %qt", key, testKey)
		}
		return testValue, time.Time{}, nil
	})
	if err != nil || got != testValue {
		t.Fatalf("getOrSet got (%q, %v), want (%q, <nil>)", got, err, testValue)
	}

	// assert cached
	got, err = cache.getOrSet(testCtx, testKey, func(ctx context.Context, key string) (value string, expire time.Time, err error) {
		t.Error("did another resolve, want cached")
		return "another value", time.Time{}, nil
	})
	if err != nil || got != testValue {
		t.Fatalf("second getOrSet got (%q, %v), want (%q, <nil>)", got, err, testValue)
	}
}

func TestCacheExpire(t *testing.T) {
	t.Parallel()
	testExpire := time.Now().Add(100 * time.Millisecond)

	cache := newCache()
	testCtx := context.Background()
	const testKey, testValue = "test key", "test value"

	// assert resolve
	got, err := cache.getOrSet(testCtx, testKey, func(ctx context.Context, key string) (value string, expire time.Time, err error) {
		if key != testKey {
			t.Errorf("resolve with key %q, want %qt", key, testKey)
		}
		return testValue, testExpire, nil
	})
	if err != nil || got != testValue {
		t.Fatalf("getOrSet got (%q, %v), want (%q, <nil>)", got, err, testValue)
	}

	// assert cached
	got, err = cache.getOrSet(testCtx, testKey, func(ctx context.Context, key string) (value string, expire time.Time, err error) {
		t.Error("did another resolve, want cached")
		return "another value", time.Time{}, nil
	})
	if err != nil || got != testValue {
		t.Fatalf("second getOrSet got (%q, %v), want (%q, <nil>)", got, err, testValue)
	}

	const newerValue = "newer value"

	// assert expired
	time.Sleep(time.Until(testExpire) + time.Millisecond)
	got, err = cache.getOrSet(testCtx, testKey, func(ctx context.Context, key string) (value string, expire time.Time, err error) {
		if key != testKey {
			t.Errorf("resolve after expire with key %q, want %qt", key, testKey)
		}
		return newerValue, time.Now().Add(time.Second), nil
	})
	if err != nil || got != newerValue {
		t.Fatalf("expired getOrSet got (%q, %v), want (%q, <nil>)", got, err, newerValue)
	}
}
