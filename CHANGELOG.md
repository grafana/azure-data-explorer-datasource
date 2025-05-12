# CHANGELOG

## [6.0.1]

- Update import from Grafana llm library [#1267](https://github.com/grafana/azure-data-explorer-datasource/pull/1267)
- Fix: Remove us of http.DefaultClient

## [6.0.0]

- Add loading indicator [#1210](https://github.com/grafana/azure-data-explorer-datasource/pull/1210)
- Bump minimum Grafana version to 10.4.0
- Dependency updates

## [5.1.1]

- Fix query timeout formatting for timeouts > `1m` [#1196](https://github.com/grafana/azure-data-explorer-datasource/pull/1196)
- Correctly set KQL in KQL editor [#1202](https://github.com/grafana/azure-data-explorer-datasource/pull/1202)
- Dependency updates

## [5.1.0]

- Support running queries using Shift+Enter [#971](https://github.com/grafana/azure-data-explorer-datasource/pull/971)
- Unify credentials using `grafana-azure-sdk-react` [#1075](https://github.com/grafana/azure-data-explorer-datasource/pull/1075)
- Support setting an `application` value in data source configuration [#1107](https://github.com/grafana/azure-data-explorer-datasource/pull/1107)
- Migrate from `@grafana/experimental` to `@grafana/plugin-ui` [#1168](https://github.com/grafana/azure-data-explorer-datasource/pull/1168)
- Dependency updates

## [5.0.7]

- `errorsource` improvements [#1030](https://github.com/grafana/azure-data-explorer-datasource/pull/1030)
- Fix: Query row not displaying [#1001](https://github.com/grafana/azure-data-explorer-datasource/pull/1001)
- Dependency updates

## [5.0.6]

- Add `errorsource` [#996](https://github.com/grafana/azure-data-explorer-datasource/pull/996)
- Dependency updates

## [5.0.5]

- Fix: Respect default editor mode [#972](https://github.com/grafana/azure-data-explorer-datasource/pull/972)
- Fix: Improve Kusto error responses [#954](https://github.com/grafana/azure-data-explorer-datasource/pull/954)
- Dependency upgrades

## [5.0.4]

- Fix: Custom clouds are now loaded from context [#921](https://github.com/grafana/azure-data-explorer-datasource/pull/921)

## [5.0.3]

- Upgrade dependencies

## [5.0.2]

- Upgrade dependencies
- Fix: Re-add some legacy endpoints for older Grafana version compatibility.
- Fix: Ensure multi-select template variables work correctly with the query builder.

## [5.0.1]

- Upgrade dependencies
- Fix: Set query database to default if unspecified [#863](https://github.com/grafana/azure-data-explorer-datasource/pull/863)

## [5.0.0]

- Breaking change: The legacy query editor has been removed. The `adxLegacyEditor` feature toggle will no longer work.
- Remove references to deprecated Grafana APIs.
- Dependency updates.
- Improve error messages.
- Fix: Bypass trusted endpoint enforcement for cluster request.

## [4.10.0]

- Feature: Support Private Datasource Connect ([secure socks proxy](https://grafana.com/docs/grafana/next/setup-grafana/configure-grafana/proxy/)).
- Feature: Add explain functionality for KQL queries.
- Feature: Add support for logs visualization.

## [4.9.0]

- New feature: Add support for query cluster selection.
- Feature: Add compatibility for loading Monaco Editor via ESM.

## [4.8.0]

- New feature: OpenAI: incorporate the LLM plugin
- Bump github.com/grafana/grafana-plugin-sdk-go from 0.180.0 to 0.195.0

## [4.7.1]

- Upgrade dependencies
- Update variable editor

## [4.7.0]

- New feature: Add support for [Workload Identity authentication](https://azure.github.io/azure-workload-identity/docs/).

## [4.6.3]

- New feature: Add support for enforcing only known Azure Data Explorer endpoints in cluster URL.

## [4.6.2]

- Fix: Infinite re-render in QueryEditor component.

## [4.6.1]

- Fix: Allow dynamic values to be empty for traces.

## [4.6.0]

- New feature: Add support for trace data and the Trace visualization.
- Dependency updates.
- Fix: Fixed a bug that prevented switching back to the ADX datasource.
- Fix: When using the generate query feature the token is now validated before attempting to query.
- Fix: Booleans can be represented as numbers or bool as ADX allows.

## [4.5.0]

- Add OpenAI integration which allows users to generate KQL queries via natural language.
- Experimental - Add support for [current user authorization](https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/current-user-auth.md).

## [4.4.1]

Build with latest Go version 1.20.4

## [4.4.0]

Update backend dependencies

## [4.3.0]

This release revamps the editor for Azure Data Explorer template variables:

- New feature: Predefined queries have been added for databases, tables, and columns to simplify template variable usage.
- New feature: Both the query builder and KQL editor can be used to query for template variables.
- New feature: Macros and template variables are now supported within Azure Data Explorer template variable queries.

This release also includes:

- Fix: The ADX time series format is now preserved when using the KQL editor.
- Fix: Config editor label widths are now consistent.
- Fix: Field focussing now behaves as expected.
- Refactor: OBO token provider makes use of configurable middleware.
- Refactor: Deprecated `metricFindQuery` function from Grafana and other `rxjs` functions have been removed.

## [4.2.0]

This release revamps the plugin query builder:

- New feature: It's now possible to filter columns within a query, improving the performance of queries.
- The query preview includes syntax highlighting for Kusto.
- All other components have been refactored to match the latest Grafana UI.

Apart from that, this release also includes:

- Refactor: Authentication and configuration has been refactored to match other Azure plugins.
- Fix: Health check for data sources configured with On-Behalf-Of authentication.
- Fix: Alert queries that returns no data.

## [4.1.10]

- Fix: Invalid code editor loaded for Grafana versions that don't follow semantic versioning by @aangelisc in <https://github.com/grafana/azure-data-explorer-datasource/pull/506>
- Fix error unmounting ADX query editor by @aangelisc in <https://github.com/grafana/azure-data-explorer-datasource/pull/519>
- Security: Upgrade Go in build process to 1.19.3

## [4.1.9]

- Security: Upgrade Go in build process to 1.19.2
- Fix: Schema mapping displaying macro functions

## [4.1.8]

- Report interaction on dashboard load for feature tracking

## [4.1.7]

- Fix crash when creating Alerts
- Autocomplete now works with dynamic values
- Fix template variables for values containing parentheses

## [4.1.6]

- Change default logic for dynamic columns: Cast to double if type exists in schema

## [4.1.5]

- Fix: Update table in the KQL expression when changing the database.

## [4.1.4]

- Change the default format to table data to avoid accidental high consumption of memory.
- Fix: Quote columns with spaces in the query builder.

## [4.1.3]

- Fix: Correctly cast dynamically typed columns in the query builder.

## [4.1.2]

This release include several bug fixes:

- Fix reload schema button in configuration.
- Fix dynamic resolution for simple types in the query builder.
- Fix "Aggregate" and "Group by" removal logic also for the builder.
- Return configured default database instead of the first one.

## [4.1.1]

Several bug fixes for the visual query builder:

- Add materialized views as tables.
- Fix template variable quoting.
- Fix syntax dynamic fields with multiple types.

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
