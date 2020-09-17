package azuredx

import (
	"fmt"
	"regexp"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

const cacheMinAge = time.Duration(10 * time.Second)
const cacheMaxAge = time.Hour

// CacheSettings is use to enable caching on a per query basis
type CacheSettings struct {
	CacheMaxAge string
	TimeRange   *backend.TimeRange
}

// NewCacheSettings is used to detect what cache settings is applicable for the current query.
func NewCacheSettings(c *Client, q *backend.DataQuery, qm *QueryModel) *CacheSettings {
	if !c.DynamicCaching {
		return &CacheSettings{
			CacheMaxAge: c.CacheMaxAge,
			TimeRange:   &q.TimeRange,
		}
	}

	resolution, err := detectBinSize(qm.Query, q.Interval)
	if err != nil {
		resolution = detectResolution(&q.TimeRange)
	}

	maxAge := adjustToMaxMinLimits(resolution)

	return &CacheSettings{
		CacheMaxAge: fmt.Sprintf("%vs", maxAge.Seconds()),
		TimeRange:   expandTimeRange(&q.TimeRange, maxAge),
	}
}

func expandTimeRange(tr *backend.TimeRange, d time.Duration) *backend.TimeRange {
	return &backend.TimeRange{
		From: expandFrom(tr.From, d),
		To:   expandTo(tr.To, d),
	}
}

func expandFrom(from time.Time, d time.Duration) time.Time {
	expanded := from.Round(d)

	if expanded.After(from) {
		return expanded.Add(d * -1)
	}
	return expanded
}

func expandTo(to time.Time, d time.Duration) time.Time {
	expanded := to.Round(d)

	if expanded.Before(to) {
		return expanded.Add(d)
	}
	return expanded
}

func adjustToMaxMinLimits(resolution time.Duration) time.Duration {
	if resolution > cacheMaxAge {
		return cacheMaxAge
	}
	if resolution < cacheMinAge {
		return cacheMinAge
	}
	return resolution
}

func detectResolution(tr *backend.TimeRange) time.Duration {
	diff := tr.To.Sub(tr.From)

	if diff > time.Hour*24*7*4 {
		return cacheMaxAge
	}

	if diff > time.Hour {
		return time.Minute
	}

	return cacheMinAge
}

// binSizeRE finds the bin size of a query by looking at the summarize statement
// e.g. summarize avg(Column), count(Column) by bin(TimeColumn, 1d)
var binSizeRE = regexp.MustCompile(`summarize [\w\$\(\)\.,\s]+ by bin\([\w\$\(\)\.]+, ` +
	`((?:\$__\w+)|(?:\d{1,10}(?:h|m|ms)?))\)`) // in format e.g. $__timeInterval, 1d, 1h, 1s, 1m or 1ms

func detectBinSize(query string, interval time.Duration) (time.Duration, error) {
	match := binSizeRE.FindStringSubmatch(query)
	if len(match) != 2 {
		return cacheMinAge, fmt.Errorf("failed to detect bin size, errors: missing summarize/by bin statement")
	}

	if macroRE.MatchString(match[1]) {
		return interval, nil
	}

	d, err := time.ParseDuration(match[1])
	if err != nil {
		return cacheMinAge, fmt.Errorf("failed to detect bin size, errors: '%v'", err)
	}
	return d, nil
}
