package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

const cacheMinAge = time.Duration(10 * time.Second)
const day = time.Hour * 24

// CacheSettings is use to enable caching on a per query basis
type CacheSettings struct {
	CacheMaxAge string
	TimeRange   *backend.TimeRange
}

// NewCacheSettings is used to detect what cache settings is applicable for the current query.
func NewCacheSettings(s *DatasourceSettings, q *backend.DataQuery, qm *QueryModel) *CacheSettings {
	return newCacheSettings(s, q, qm, time.Since)
}

type timeSince = func(t time.Time) time.Duration

func newCacheSettings(s *DatasourceSettings, q *backend.DataQuery, qm *QueryModel, ts timeSince) *CacheSettings {
	if !s.DynamicCaching {
		return &CacheSettings{
			CacheMaxAge: s.CacheMaxAge,
			TimeRange:   &q.TimeRange,
		}
	}

	resolution := detectResolution(qm.Query, q.Interval)
	expandedTR := expandTimeRange(&q.TimeRange, resolution)
	maxAge := calculateCacheMaxAge(resolution, expandedTR, ts)

	return &CacheSettings{
		CacheMaxAge: formatDuration(maxAge),
		TimeRange:   expandedTR,
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

func calculateCacheMaxAge(resolution time.Duration, tr *backend.TimeRange, since timeSince) time.Duration {
	adjustedResolution := resolution / 2
	fromOffset := since(tr.To).Round(cacheMinAge)

	if adjustedResolution > cacheMinAge {
		if adjustedResolution >= fromOffset {
			return adjustedResolution
		}
		return fromOffset
	}

	if fromOffset > cacheMinAge {
		if fromOffset >= adjustedResolution {
			return fromOffset
		}
		return adjustedResolution
	}

	return cacheMinAge
}

// binSizeRE finds the bin size of a query by looking at the summarize statement
// e.g. summarize avg(Column), count(Column) by bin(TimeColumn, 1d)
var binSizeRE = regexp.MustCompile(`by bin\([\w\$\(\)\.]+, ` +
	`((?:\$__\w+)|(?:\d{1,10}(?:h|m|ms)?))\)`) // in format e.g. $__timeInterval, 1d, 1h, 1s, 1m or 1ms

func detectResolution(query string, interval time.Duration) time.Duration {
	match := binSizeRE.FindStringSubmatch(query)
	if len(match) != 2 {
		return intervalOrDefault(interval)
	}

	if macroRE.MatchString(match[1]) {
		return intervalOrDefault(interval)
	}

	d, err := time.ParseDuration(match[1])
	if err != nil {
		return intervalOrDefault(interval)
	}

	if d <= interval {
		return intervalOrDefault(interval)
	}
	return d
}

func intervalOrDefault(interval time.Duration) time.Duration {
	if interval.Milliseconds() == 0 {
		return time.Millisecond * 1000 // default to 1000ms
	}
	return interval
}

func formatDuration(d time.Duration) string {
	var b strings.Builder

	days := d / day
	d -= days * day

	hours := d / time.Hour
	d -= hours * time.Hour

	minutes := d / time.Minute
	d -= minutes * time.Minute

	seconds := d / time.Second

	if days <= 0 {
		fmt.Fprintf(&b, "%02d:%02d:%02d", hours, minutes, seconds)
	} else {
		fmt.Fprintf(&b, "%d.%02d:%02d:%02d", days, hours, minutes, seconds)
	}

	return b.String()
}
