# Change Log

## [1.3.2] - 2019-06-19

- Bugfix for issue #8
- Updated packages
- Added circleci

## v1.3.0

- Adds an order by clause to the query if there is none specified. It uses the datetime field from the where clause or summarize...bin().
- Removes the Subscription Id field from the config page as is no longer needed.

## v1.2.0

Adds a config option for caching. The default in-memory cache period is 30 seconds, the new `Minimal Cache Period` option allows you to change that.

## v1.1.0

Adds $__escapeMulti macro

## v1.0.0

First version of the Azure Data Explorer Datasource.
