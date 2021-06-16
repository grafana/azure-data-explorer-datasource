/* 
  expectedData represents the data we get back from a query to a datasource that has been
  properly formatted so that a particular panel can consume it to create a visualization.
*/
export default {
  "state": "Done",
  "series": [
    {
      "refId": "A",
      "meta": {
        "custom": {
          "ColumnTypes": [
            "string",
            "string",
            "datetime",
            "string"
          ]
        },
        "executedQueryString": "['events.all']\n| where Timestamp >= datetime(2021-01-01T05:00:00Z) and Timestamp <= datetime(2021-05-05T03:59:59Z)\n| order by Timestamp asc"
      },
      "fields": [
        {
          "name": "Message",
          "type": "string",
          "typeInfo": {
            "frame": "string",
            "nullable": true
          },
          "config": {
            "custom": {
              "align": "auto",
              "displayMode": "auto"
            },
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            },
            "mappings": []
          },
          "values": [
            "Hello, world",
            "Foo",
            "Bar"
          ],
          "entities": {},
          "state": {
            "displayName": null,
            "scopedVars": {
              "__series": {
                "text": "Series",
                "value": {
                  "name": "Series (A)"
                }
              },
              "__field": {
                "text": "Field",
                "value": {}
              }
            },
            "seriesIndex": 1
          }
        },
        {
          "name": "Level",
          "type": "string",
          "typeInfo": {
            "frame": "string",
            "nullable": true
          },
          "config": {
            "custom": {
              "align": "auto",
              "displayMode": "auto"
            },
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            },
            "mappings": []
          },
          "values": [
            "Info",
            "Debug",
            "Debug"
          ],
          "entities": {},
          "state": {
            "displayName": null,
            "scopedVars": {
              "__series": {
                "text": "Series",
                "value": {
                  "name": "Series (A)"
                }
              },
              "__field": {
                "text": "Field",
                "value": {}
              }
            },
            "seriesIndex": 2
          }
        },
        {
          "name": "Timestamp",
          "type": "time",
          "typeInfo": {
            "frame": "time.Time",
            "nullable": true
          },
          "config": {
            "custom": {
              "align": "auto",
              "displayMode": "auto"
            },
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            },
            "mappings": []
          },
          "values": [
            1617896034083,
            1617896097129,
            1617896142620
          ],
          "entities": {},
          "state": {
            "displayName": null,
            "scopedVars": {
              "__series": {
                "text": "Series",
                "value": {
                  "name": "Series (A)"
                }
              },
              "__field": {
                "text": "Field",
                "value": {}
              }
            },
            "seriesIndex": 2
          }
        },
        {
          "name": "Column.Dot",
          "type": "string",
          "typeInfo": {
            "frame": "string",
            "nullable": true
          },
          "config": {
            "custom": {
              "align": "auto",
              "displayMode": "auto"
            },
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            },
            "mappings": []
          },
          "values": [
            "Hope this works",
            "Okay",
            "One more time"
          ],
          "entities": {},
          "state": {
            "displayName": null,
            "scopedVars": {
              "__series": {
                "text": "Series",
                "value": {
                  "name": "Series (A)"
                }
              },
              "__field": {
                "text": "Field",
                "value": {}
              }
            },
            "seriesIndex": 3
          }
        }
      ],
      "length": 3
    }
  ],
  "annotations": [],
  "request": {
    "app": "dashboard",
    "requestId": "Q100",
    "timezone": "browser",
    "panelId": 2,
    "dashboardId": 102,
    "range": {
      "from": "2020-12-15T20:56:50.158Z",
      "to": "2021-06-15T19:56:50.158Z",
      "raw": {
        "from": "now-6M",
        "to": "now"
      }
    },
    "timeInfo": "",
    "interval": "12h",
    "intervalMs": 43200000,
    "targets": [
      {
        "database": "PerfTest",
        "expression": {
          "from": {
            "property": {
              "name": "events.all",
              "type": "string"
            },
            "type": "property"
          },
          "groupBy": {
            "expressions": [],
            "type": "and"
          },
          "reduce": {
            "expressions": [],
            "type": "and"
          },
          "where": {
            "expressions": [],
            "type": "and"
          }
        },
        "pluginVersion": "3.5.0",
        "query": "['events.all']\n| where $__timeFilter(Timestamp)\n| order by Timestamp asc",
        "querySource": "raw",
        "queryType": "randomWalk",
        "rawMode": false,
        "refId": "A",
        "resultFormat": "table",
        "datasource": "Azure Data Explorer (GrafanaADXDev)"
      }
    ],
    "maxDataPoints": 450,
    "scopedVars": {
      "__interval": {
        "text": "12h",
        "value": "12h"
      },
      "__interval_ms": {
        "text": "43200000",
        "value": 43200000
      }
    },
    "startTime": 1623787010159,
    "rangeRaw": {
      "from": "now-6M",
      "to": "now"
    },
    "endTime": 1623787011378
  },
  "timeRange": {
    "from":"2021-01-01T05:00:00.000Z",
    "to":"2021-05-05T03:59:59.000Z",
    "raw":{
      "from":"2021-01-01T05:00:00.000Z",
      "to":"2021-05-05T03:59:59.000Z"
    }
  },
  "timings": {
    "dataProcessingTime": 0.19999998807907104
  },
  "structureRev": 2
}