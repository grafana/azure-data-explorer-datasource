package azuredx

import (
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

func TestNewCacheSettings(t *testing.T) {
	tests := []struct {
		name          string
		configuration dataSourceData
		query         string
		timeRange     backend.TimeRange
		returnIs      assert.ComparisonAssertionFunc
		returnVal     CacheSettings
	}{
		{
			name: "should adjust settings based on time range difference 3d",
			configuration: dataSourceData{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData\n | where state == "Texas"`,
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 8, 02, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "60s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 8, 02, 21, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on time range difference 1h",
			configuration: dataSourceData{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData\n | where state == "Texas"`,
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "60s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on time range difference 1m",
			configuration: dataSourceData{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData\n | where state == "Texas"`,
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "60s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query to bin size 1h",
			configuration: dataSourceData{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData\n` +
				`| where state == "Texas"\n` +
				`summarize avg(Coulumn) by bin(TimeColumn, 1h)`,
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "3600s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 22, 0, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query bin size 10m",
			configuration: dataSourceData{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData\n` +
				`| where state == "Texas"\n` +
				`summarize avg(Coulumn) by bin(TimeColumn, 10m)`,
			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "600s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 10, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query bin size 1m",
			configuration: dataSourceData{
				CacheMaxAge:    "10s",
				DynamicCaching: true,
			},
			query: `SampleData\n` +
				`| where state == "Texas"\n` +
				`summarize avg(Coulumn) by bin(TimeColumn, 1m)`,

			timeRange: backend.TimeRange{
				From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
				To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "60s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should only use cache max age when dynamic is disabled",
			configuration: dataSourceData{
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
			configuration: dataSourceData{
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
			client := &Client{dataSourceData: &tt.configuration}
			query := &backend.DataQuery{Interval: 10000, TimeRange: tt.timeRange}
			queryModel := &QueryModel{Query: tt.query}

			cs := NewCacheSettings(client, query, queryModel)

			tt.returnIs(t, tt.returnVal.CacheMaxAge, cs.CacheMaxAge)
			tt.returnIs(t, tt.returnVal.TimeRange.From, cs.TimeRange.From)
			tt.returnIs(t, tt.returnVal.TimeRange.To, cs.TimeRange.To)
		})
	}
}
