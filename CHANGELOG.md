# Change Log

## [4.1.0]

- New Feature: The visual query editor now supports `dynamic` columns. This includes columns with one or more arrays of `dynamic` values.

## [4.0.2]

- Breaking Change on Beta feature: On-Behalf-Of flow is now disabled by default

## [4.0.1]

- Bugfix: Remove custom token cache used for On-Behalf-Of flow (Beta) and rely on Microsoft Authentication Library to keep a local cache.

## [4.0.0]

- Breaking Change: Azure Data Explorer plugin now requires Grafana 8.0+ to run.
- Breaking Change: obo_latency_seconds metric was removed.
- Bugfix: Included new Kusto query editor. **NOTE**: This new editor will be only available if used with Grafana 8.5 or later. Fixes #325.
- Bugfix: Filter dynamic columns from Where/Aggregate/Group by clauses to prevent syntax errors.
- Bugfix: Add logical operators for timespan types in the query builder.
- Internal: Client secret authentication via Grafana Azure SDK.
- Internal: OBO authentication via MSAL for Go.

## [3.7.1]

- Bugfix: Fix scope for national clouds

## [3.7.0]

- Chore: Added test coverage script

## [3.7.0-beta1]

- Feature: Add On-Behalf-Of Token Authorization
- Bugfix: Eliminate Client ID Panic
- Bugfix: Append azure error to query unsuccessful message
- Bugfix: Fix macro regex on columns with hyphens
- Internal: Update plugin dependencies

## [3.6.1]

- Reverted change made in 3.6.0 and reuse the previous code editor until we fix the related issues.

## [3.6.0]

- Replaced custom query editor with @grafana/ui common editor, with support for Kusto.

## [3.5.1]

- Bugfix: Fixed issue where HTTP timeout setting was not being applied
- Bugfix: Fixed issue when typing vs copy/pasting client secret in configuration
- Bugfix: Fixed issue where annotation queries were not being displayed

## [3.5.0]

- Add support for national clouds
- Replace plugin proxy routes with call resource handler
- Add instance manager, shared http client and use new token provider

## [3.4.1]

- Bugfix: Fix an error loading schemas on the configuration page.

## [3.4.0]

Note: The minimum required version of Grafana is now 7.4

- Bugfix: Fixed issue where query builder did not handle table names that contained special characters
- Bugfix: Fixed empty WHERE lines staying in the query builder when cleared
- Template variables can now be used in the queries of other template variables.

## [3.3.2]

- Bugfix: Fixed an issue where the KQL Monaco editor wouldn't load when Grafana is served from a sub path
- Bugfix: Fixed template query variables not working

## [3.3.1]

- Bugfix: nil check plugincontext user before setting tracking header

## [3.3.0]

- Add tracking capabilities by making it possible to pass the logged in Grafana user's username as a header to ADX
- Use jsoniter instead of encoding/json in order to improve performance
- Bugfix: Expand query template variables before building query
- Bugfix: Fix minor typo in confirmation dialog

All notable changes to this project will be documented in this file.

## [3.2.1]

- Locked grafana-packages version and upgrade toolkit.

## [3.2.0]

- Added support for decimal data type.
- Removed global query limit to prevent data being truncated.
- Improved the visual query builder to make it easier to add aggregations to a query.
- Added support for handling schema mappings to filter out parts of the database schema being available in the visual query builder.
- Bugfix: prevent empty queries from triggering when creating dashboard.
- Bugfix: fixing so we properly select ADX time series option when editor is in raw mode.
- Bugfix: added a timeout setting and will make sure the plugin is handling timeout of long running queries properly.

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
