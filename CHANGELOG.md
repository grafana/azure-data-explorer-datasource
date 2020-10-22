# Change Log

All notable changes to this project will be documented in this file.

## [3.2.0]

- Added support for decimal data type.
- Removed global query limit to prevent data being truncated.
- Bugfix: fixing so we properly select ADX time series option when editor is in raw mode.

## [3.1.0]

- Global query limit is now configurable in datasource settings.
- Auto complete will include other filters when doing the search for possible values.
- Added !has and has_any operators.
- Adding datasource setting to set default view when creating new queries.
- Dynamic caching added to enable caching setting on a per query basis.
- Column names will not sort exact match on top.
- Columns with auto complete support will now pre-populate options prior to typing.
- Added support to perform time shift queries.
- Added dcount() operator for aggregations.
- Bugfix: operator descriptions are now wider and readable.
- Bugfix: display template variables as options.
- Bugfix: excluding empty/missing operators from query.
- Bugfix: aggregations without group-by are not working.
- Bugfix: time interval off by 1000ms.

## [3.0.5]

- Bugfix: when selecting template variables in the visual editor for table or database the values wasn't properly set. This should now be fixed.

## [3.0.4]

- Bugfix: visual editor now includes template variables in the database selector.

## [3.0.3]

- Bugfix: displays proper error message when credentials for datasource is invalid.
- Bugfix: visual editor now supports time fields in dynamic columns.

## [3.0.2]

- Bugfix: Fixed issue with schema not updating when changing datasource.
- Improved performance when loading table schema.
- Improved performance when doing auto complete searching.

## [3.0.1]

- Support for value autocomplete in the visual query editor.
- Support for dynamic columns in the visual query editor. Dynamic fields are automatically read from the table schema and are selectable when building up a query. Value autocomplete also works for dynamic columns.
- Migration script for existing dashboards.
- Performance improvements for the autocomplete and dynamic column features.
- Performance improvements when loading the table schema.

## [3.0.0]

- Adds support for a new visual query editor.
- Ports the existing query editor to React.

## [2.1.0]

- Adds support for the databases() macro for template variable queries and the database variable can then be used in the databases dropdown in the query editor. This allows the user to switch databases for a query without editing it.

## [2.0.6]

- Signed Plugin for v7

## [2.0.5]

- Bugfix for issue #61. This is a temp fix, as a proper fix requires refactoring some of the backend.

## [2.0.4]

- Bugfix for issue #73

## [2.0.3]

- Bugfix for monaco loader

## [2.0.2]

- Bugfix for issue #60
- Updated packages

## [2.0.1]

- Add key value support to plugin (based off of mysql plugin)
- New feature for metric naming and aliasing

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

- Adds \$\_\_escapeMulti macro

## v1.0.0

- First version of the Azure Data Explorer Datasource.
