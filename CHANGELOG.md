# Change Log

## [2.0.0]

- Time series queries now support alerting.
- Time series queries now support multiple value and multiple string columns.
- The Kusto "time series" type created with the Kusto `make-series` operator is now supported.
- Macros have been added so as not to conflict with Grafana's built-in query Macros: `$__timeFrom`, `$__timeTo`, and `$__timeInterval`.
- Caching of Table and Time Series queries has been removed until backend plugins support caching.
- Queries no longer have an ORDER by clause appended when there is not one, however if time series is unsorted there will be a warning in the query editor.

## [1.3.2] - 2019-06-19

- Bugfix for issue #8
- Updated packages
- Added circleci

## v1.3.0

- Adds an order by clause to the query if there is none specified. It uses the datetime field from the where clause or summarize...bin().
- Removes the Subscription Id field from the config page as is no longer needed.

## v1.2.0

- Adds a config option for caching. The default in-memory cache period is 30 seconds, the new `Minimal Cache Period` option allows you to change that.

## v1.1.0

- Adds $__escapeMulti macro

## v1.0.0

- First version of the Azure Data Explorer Datasource.
