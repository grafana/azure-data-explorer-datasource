package azuredx

import (
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

func TestNewCacheSettings(t *testing.T) {
	timeRangeMin := backend.TimeRange{
		From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
		To:   time.Date(2019, 7, 30, 20, 7, 33, 0, time.UTC),
	}

	timeRangeHour := backend.TimeRange{
		From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
		To:   time.Date(2019, 7, 30, 21, 7, 33, 0, time.UTC),
	}

	timeRangeDays := backend.TimeRange{
		From: time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC),
		To:   time.Date(2019, 8, 02, 21, 7, 33, 0, time.UTC),
	}

	tests := []struct {
		name       string
		client     *Client
		query      *backend.DataQuery
		queryModel *QueryModel
		returnIs   assert.ComparisonAssertionFunc
		returnVal  CacheSettings
	}{
		{
			name: "should adjust settings based on time range resolution (1m)",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "10s",
					DynamicCaching: true,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeDays,
			},
			queryModel: &QueryModel{
				Query: `SampleData\n | where state == "Texas"`,
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "3600s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 8, 02, 21, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on time range resolution (1m)",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "10s",
					DynamicCaching: true,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeHour,
			},
			queryModel: &QueryModel{
				Query: `SampleData\n | where state == "Texas"`,
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
			name: "should adjust settings based on time range resolution (1m)",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "10s",
					DynamicCaching: true,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeMin,
			},
			queryModel: &QueryModel{
				Query: `SampleData\n | where state == "Texas"`,
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "60s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 20, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query to bin size 1h",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "10s",
					DynamicCaching: true,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeMin,
			},
			queryModel: &QueryModel{
				Query: `SampleData\n` +
					`| where state == "Texas"\n` +
					`summarize avg(Coulumn) by bin(TimeColumn, 1h)`,
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "3600s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 21, 0, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query bin size 10m",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "10s",
					DynamicCaching: true,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeMin,
			},
			queryModel: &QueryModel{
				Query: `SampleData\n` +
					`| where state == "Texas"\n` +
					`summarize avg(Coulumn) by bin(TimeColumn, 10m)`,
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "600s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 0, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 20, 10, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should adjust settings based on query bin size 1m",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "10s",
					DynamicCaching: true,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeMin,
			},
			queryModel: &QueryModel{
				Query: `SampleData\n` +
					`| where state == "Texas"\n` +
					`summarize avg(Coulumn) by bin(TimeColumn, 1m)`,
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "60s",
				TimeRange: &backend.TimeRange{
					From: time.Date(2019, 7, 30, 20, 2, 0, 0, time.UTC),
					To:   time.Date(2019, 7, 30, 20, 8, 0, 0, time.UTC),
				},
			},
		},
		{
			name: "should only use cache max age when dynamic is disabled",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "10s",
					DynamicCaching: false,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeMin,
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "10s",
				TimeRange:   &timeRangeMin,
			},
		},
		{
			name: "should not use caching when all are disabled",
			client: &Client{
				dataSourceData: &dataSourceData{
					CacheMaxAge:    "",
					DynamicCaching: false,
				},
			},
			query: &backend.DataQuery{
				TimeRange: timeRangeMin,
			},
			returnIs: assert.Equal,
			returnVal: CacheSettings{
				CacheMaxAge: "",
				TimeRange:   &timeRangeMin,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cs := NewCacheSettings(tt.client, tt.query, tt.queryModel)

			tt.returnIs(t, tt.returnVal.CacheMaxAge, cs.CacheMaxAge)
			tt.returnIs(t, tt.returnVal.TimeRange.From, cs.TimeRange.From)
			tt.returnIs(t, tt.returnVal.TimeRange.To, cs.TimeRange.To)
		})
	}
}
