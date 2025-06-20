import { Trans } from '@grafana/i18n';
import React, { PureComponent } from 'react';

import { QueryEditorHelpProps } from '@grafana/data';
import { KustoQuery } from 'types';

export default class EditorHelp extends PureComponent<QueryEditorHelpProps<KustoQuery>, { userExamples: string[] }> {
  render() {
    return (
      <div>
        <h3>
          <Trans i18nKey="components.editor-help.adx-query-editor-help">ADX query editor help</Trans>
        </h3>
        <h5>
          <Trans i18nKey="components.editor-help.format">Format</Trans>
        </h5>
        <p>
          <Trans i18nKey="components.editor-help.format-description">
            It&apos;s possible to modify the format of the data returned by ADX with the &quot;Format as&quot; selector.
            Here are more details of each option:
          </Trans>
        </p>
        <p>
          <span>
            <Trans i18nKey="components.editor-help.format-as-table">Format as Table:</Trans>
          </span>
          <li>
            <Trans i18nKey="components.editor-help.can-return-any-set-of-columns">Can return any set of columns.</Trans>
          </li>
        </p>

        <p>
          <span>
            <Trans i18nKey="components.editor-help.format-as-time-series">Format as Time series:</Trans>
          </span>
          <li>
            <Trans
              i18nKey="components.editor-help.format-as-time-series-description"
              values={{ operatorName: 'project-away' }}
            >
              Requires exactly one column of Kusto type datetime. (tip: can use Kusto&apos;s {'{{operatorName}}'}{' '}
              operator to remove columns).
            </Trans>
          </li>
          <li>
            <Trans i18nKey="components.editor-help.requires-one-number-column">
              Requires at least one value column of a number type. Each value column is considered a metric.
            </Trans>
          </li>
          <li>
            <Trans i18nKey="components.editor-help.optional-string-columns">
              May optionally have one or more string columns. Each string column is considered as a key=value tag pair
              (where the key is the column name, and the value is the value of the column for each row).
            </Trans>
          </li>
          <li>
            <Trans i18nKey="components.editor-help.time-series-returned">
              A time series is returned for each value column and unique set of string column values. Each series has
              name of valueColumnName stringColumnName=columnValue, ... If there are no string columns in the request,
              the name will just be valueColumnName.
            </Trans>
          </li>
          <li>
            <Trans i18nKey="components.editor-help.example-time-series-query">Example Time Series Query:</Trans>
          </li>
          <pre>
            {`AzureActivity
| where $__timeFilter()
| summarize count() by Category, bin(TimeGenerated, 60min)
| order by TimeGenerated asc
`}
          </pre>
        </p>

        <p>
          <span>
            <Trans i18nKey="components.editor-help.format-as-adx-time-series">Format as ADX Time series:</Trans>
          </span>
          <li>
            <Trans i18nKey="components.editor-help.return-time-series" values={{ operatorName: 'make-series' }}>
              Used for queries that return Kusto&apos;s &quot;time series&quot; type, such as the {'{{operatorName}}'}{' '}
              operator
            </Trans>
          </li>
          <li>
            <Trans i18nKey="components.editor-help.must-have-timestamp" values={{ requiredColumn: 'Timestamp' }}>
              Must have a datetime column named &quot;{'{{requiredColumn}}'}&quot;
            </Trans>
          </li>
          <li>
            <Trans i18nKey="components.editor-help.example-adx-time-series-query">Example ADX Time series query:</Trans>
          </li>
          <pre>
            {`let T = range Timestamp from $__timeFrom to $__timeTo step $__timeInterval * 4
| extend   Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"]) 
| extend   Place  = dynamic(["EU",     "EU",     "US",   "EU"]) 
| mvexpand Person, Place
| extend   HatInventory = rand(5) 
| project  Timestamp, tostring(Person), tostring(Place), HatInventory;
T | make-series avg(HatInventory) on Timestamp from $__timeFrom to $__timeTo step $__timeInterval * 4 by Person, Place;
    `}
          </pre>
        </p>

        <h5>
          <Trans i18nKey="components.editor-help.macros">Macros</Trans>
        </h5>
        <p>
          <Trans i18nKey="components.editor-help.macros-description">
            Macros can be used to automatically substitute certain values based on parameters set in Grafana:
          </Trans>
        </p>
        <p>
          <span>
            <Trans i18nKey="components.editor-help.time-macros">Time Macros:</Trans>
          </span>
          {/* eslint-disable-next-line @grafana/i18n/no-untranslated-strings */}
          <li>
            $__timeFilter: TimeGenerated &ge; datetime(2018-06-05T18:09:58.907Z) and TimeGenerated &le;
            datetime(2018-06-05T20:09:58.907Z)
          </li>
          {/* eslint-disable-next-line @grafana/i18n/no-untranslated-strings */}
          <li>
            $__timeFilter(datetimeColumn): datetimeColumn &ge; datetime(2018-06-05T18:09:58.907Z) and datetimeColumn
            &le; datetime(2018-06-05T20:09:58.907Z)
          </li>
          <li>
            <Trans
              i18nKey="components.editor-help.time-from"
              values={{ macro: '$__timeFrom', example: 'datetime(2018-06-05T18:09:58.907Z)' }}
            >
              {'{{macro}}'}: {'{{example}}'}. The start time of the query
            </Trans>
          </li>
          <li>
            <Trans
              i18nKey="components.editor-help.time-to"
              values={{ macro: '$__timeTo', example: 'datetime(2018-06-05T20:09:58.907Z)' }}
            >
              {'{{macro}}'}: {'{{example}}'}. The end time of the query
            </Trans>
          </li>
          <li>
            <Trans
              i18nKey="components.editor-help.time-interval"
              values={{ macro: '$__timeInterval', example: '5000ms' }}
            >
              {'{{macro}}'}: {'{{example}}'}. Grafana&apos;s recommended bin size based on the timespan of the query, in
              ms
            </Trans>
          </li>
        </p>

        <p>
          <span>
            <Trans i18nKey="components.editor-help.templating-macros">Templating Macros:</Trans>
          </span>
          <li>
            <Trans i18nKey="components.editor-help.escape-multi" values={{ macro: '$__escapeMulti' }}>
              {'{{macro}}'}($myTemplateVar): $myTemplateVar should be a multi-value template variables that contains
              illegal characters
            </Trans>
          </li>
          {/* eslint-disable-next-line @grafana/i18n/no-untranslated-strings */}
          <li>$__contains(aColumn, $myTemplateVar): aColumn in ($myTemplateVar)</li>
          <span>
            <Trans i18nKey="components.editor-help.using-all" values={{ valueToType: 'all' }}>
              If using the All option, then check the Include All Option checkbox and in the Custom all value field type
              in: {'{{valueToType}}'}. If All is chosen -&gt; 1 == 1
            </Trans>
          </span>
        </p>

        <p>
          <span>
            <Trans i18nKey="components.editor-help.macro-examples">Macro Examples:</Trans>
          </span>
          {/* eslint-disable-next-line @grafana/i18n/no-untranslated-strings */}
          <pre>| where $__timeFilter()</pre>
          {/* eslint-disable-next-line @grafana/i18n/no-untranslated-strings */}
          <pre>| where TimeGenerated &ge; $__timeFrom() and TimeGenerated &le; $__timeTo()</pre>
          {/* eslint-disable-next-line @grafana/i18n/no-untranslated-strings */}
          <pre>| summarize count() by Category, bin(TimeGenerated, $__timeInterval)</pre>
        </p>
      </div>
    );
  }
}
