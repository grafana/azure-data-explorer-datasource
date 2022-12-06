package models

import (
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

func TestNewCacheSettings(t *testing.T) {
	now := time.Date(2020, 9, 22, 18, 57, 22, 0, time.UTC)
	timeSince := func(t time.Time) time.Duration {
		return now.Sub(t)
	}

	tests := []struct {
		name          string
		configuration DatasourceSettings
		query         string
		interval      time.Duration
		timeRange     backend.TimeRange
		returnIs      assert.ComparisonAssertionFunc
		returnVal     CacheSettings
	}{
		{
			name: "should adjust settings based on query bin size 1m",
			configuration: DatasourceSettings{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData
					 | where state == "Texas"
					 | summarize avg(Column) by bin(TimeColumn, 1m)`,
			interval: time.Second * 10,
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "419.21:49:20",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query bin size 10m",
			configuration: DatasourceSettings{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData
				     | where state == "Texas"
					 | summarize avg(Column) by bin(TimeColumn, 10m)`,
			interval: time.Second * 10,
			timeRange: backend.TimeRange{
				From: time.Date(2020, 9, 1, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2020, 9, 22, 18, 57, 00, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "00:05:00",
				TimeRange: &backend.TimeRange{
					From: time.Date(2020, 9, 1, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2020, 9, 22, 19, 0, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query bin size 1h",
			configuration: DatasourceSettings{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData
			         | where state == "Texas"
					 | summarize avg(Column) by bin(TimeColumn, 1h)`,
			interval: time.Second * 10,
			timeRange: backend.TimeRange{
				From: time.Date(2020, 9, 1, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2020, 9, 22, 18, 57, 00, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "00:30:00",
				TimeRange: &backend.TimeRange{
					From: time.Date(2020, 9, 1, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2020, 9, 22, 19, 0, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on interval 1m",
			configuration: DatasourceSettings{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData
			         | where state == "Texas"`,
			interval: time.Minute,
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "419.21:49:20",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on interval 1h",
			configuration: DatasourceSettings{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData
					 | where state == "Texas"`,
			interval: time.Hour,
			timeRange: backend.TimeRange{
				From: time.Date(2020, 9, 1, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2020, 9, 22, 18, 57, 00, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "00:30:00",
				TimeRange: &backend.TimeRange{
					From: time.Date(2020, 9, 1, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2020, 9, 22, 19, 0, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on interval 1h when macro is present",
			configuration: DatasourceSettings{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData
			         | where state == "Texas"
			         | summarize avg(Column) by bin(TimeColumn, $__timeInterval)`,
			interval: time.Hour,
			timeRange: backend.TimeRange{
				From: time.Date(2020, 9, 1, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2020, 9, 22, 18, 57, 00, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "00:30:00",
				TimeRange: &backend.TimeRange{
					From: time.Date(2020, 9, 1, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2020, 9, 22, 19, 0, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should only use cache max age when dynamic is disabled",
			configuration: DatasourceSettings{
				CacheMaxAge:    "10s",
				DynamicCaching: false,
			},
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "10s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
				},
			},
		},
		{
			name: "should not use caching when all are disabled",
			configuration: DatasourceSettings{
				CacheMaxAge:    "",
				DynamicCaching: false,
			},
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := &backend.DataQuery{Interval: tt.interval, TimeRange: tt.timeRange}
			queryModel := &QueryModel{Query: tt.query}

			cs := newCacheSettings(&tt.configuration, query, queryModel, timeSince)

			tt.returnIs(t, tt.returnVal.CacheMaxAge, cs.CacheMaxAge)
			tt.returnIs(t, tt.returnVal.TimeRange.From, cs.TimeRange.From)
			tt.returnIs(t, tt.returnVal.TimeRange.To, cs.TimeRange.To)
		})
	}
}
