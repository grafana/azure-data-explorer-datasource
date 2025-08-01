import React, { PureComponent } from 'react';

import { QueryEditorHelpProps } from '@grafana/data';
import { KustoQuery } from 'types';

export default class EditorHelp extends PureComponent<QueryEditorHelpProps<KustoQuery>, { userExamples: string[] }> {
  render() {
    return (
      <div>
        <h3>ADX query editor help</h3>
        <h5>Format</h5>
        <p>
          It&apos;s possible to modify the format of the data returned by ADX with the &quot;Format as&quot; selector.
          Here are more details of each option:
        </p>
        <p>
          <span>Format as Table:</span>
          <li>Can return any set of columns.</li>
        </p>

        <p>
          <span>Format as Time series:</span>
          <li>
            Requires exactly one column of Kusto type datetime. (tip: can use Kusto&apos;s project-away operator to
            remove columns).
          </li>
          <li>Requires at least one value column of a number type. Each value column is considered a metric.</li>
          <li>
            May optionally have one or more string columns. Each string column is considered as a key=value tag pair
            (where the key is the column name, and the value is the value of the column for each row).
          </li>
          <li>
            A time series is returned for each value column + unique set of string column values. Each series has name
            of valueColumnName stringColumnName=columnValue, ... If there are no string columns in the request, the name
            will just be valueColumnName.
          </li>
          <li>Example Time Series Query:</li>
          <pre>
            {`AzureActivity
| where $__timeFilter()
| summarize count() by Category, bin(TimeGenerated, 60min)
| order by TimeGenerated asc
`}
          </pre>
        </p>

        <p>
          <span>Format as ADX Time series:</span>
          <li>
            Used for queries that return Kusto&apos;s &quot;time series&quot; type, such as the make-series operator
          </li>
          <li>Must have a datetime column named &quot;Timestamp&quot;</li>
          <li>Example ADX Time series query:</li>
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

        <h5>Macros</h5>
        <p>Macros can be used to automatically substitute certain values based on parameters set in Grafana:</p>
        <p>
          <span>Time Macros:</span>
          <li>
            $__timeFilter: TimeGenerated &ge; datetime(2018-06-05T18:09:58.907Z) and TimeGenerated &le;
            datetime(2018-06-05T20:09:58.907Z)
          </li>
          <li>
            $__timeFilter(datetimeColumn): datetimeColumn &ge; datetime(2018-06-05T18:09:58.907Z) and datetimeColumn
            &le; datetime(2018-06-05T20:09:58.907Z)
          </li>
          <li>$__timeFrom: datetime(2018-06-05T18:09:58.907Z). The start time of the query</li>
          <li>$__timeTo: datetime(2018-06-05T20:09:58.907Z). The end time of the query</li>
          <li>
            $__timeInterval: 5000ms. Grafana&apos;s recommended bin size based on the timespan of the query, in ms
          </li>
        </p>

        <p>
          <span>Templating Macros:</span>
          <li>
            $__escapeMulti($myTemplateVar): $myTemplateVar should be a multi-value template variables that contains
            illegal characters
          </li>
          <li>$__contains(aColumn, $myTemplateVar): aColumn in ($myTemplateVar)</li>
          <span>
            If using the All option, then check the Include All Option checkbox and in the Custom all value field type
            in: all. If All is chosen -&gt; 1 == 1
          </span>
        </p>

        <p>
          <span>Macro Examples:</span>
          <pre>| where $__timeFilter()</pre>
          <pre>| where TimeGenerated &ge; $__timeFrom() and TimeGenerated &le; $__timeTo()</pre>
          <pre>| summarize count() by Category, bin(TimeGenerated, $__timeInterval)</pre>
        </p>
      </div>
    );
  }
}
