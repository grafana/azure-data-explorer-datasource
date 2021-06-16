export default {
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 92,
  "links": [],
  "panels": [
    {
      "datasource": "Azure Data Explorer (GrafanaADXDev)",
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "custom": {
            "align": "auto",
            "displayMode": "auto"
          },
          "mappings": [],
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
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "id": 2,
      "options": {
        "showHeader": true
      },
      "pluginVersion": "8.1.0-pre",
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
          "resultFormat": "table"
        }
      ],
      "title": "Panel Title",
      "type": "table"
    }
  ],
  "refresh": false,
  "schemaVersion": 30,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "2021-01-01T05:00:00.000Z",
    "to": "2021-05-05T03:59:59.000Z"
  },
  "timepicker": {},
  "timezone": "",
  "title": "this has some data in it",
  "uid": "7Df6DFg7k",
  "version": 2
}