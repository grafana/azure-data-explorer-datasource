import { CustomVariableSupport, DataQueryRequest, DataQueryResponse, toDataFrame } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { firstStringFieldToMetricFindValue } from 'common/responseHelpers';
import VariableEditor from 'components/VariableEditor/VariableEditor';
import { AdxDataSource, includeTimeRange } from 'datasource';
import { Observable, from, lastValueFrom } from 'rxjs';
import { AdxQueryType, KustoQuery } from 'types';

export class VariableSupport extends CustomVariableSupport<AdxDataSource, KustoQuery> {
  templateSrv = getTemplateSrv();

  constructor(private readonly datasource: AdxDataSource) {
    super();
    this.datasource = datasource;
    this.query = this.query.bind(this);
    this.templateSrv = getTemplateSrv();
  }

  editor = VariableEditor;

  query(request: DataQueryRequest<KustoQuery>): Observable<DataQueryResponse> {
    const promisedResults = async () => {
      let queryObj = request.targets[0];

      if (typeof queryObj === 'string') {
        const databasesQuery = (queryObj as string).match(/^databases\(\)/i);
        const defaultDatabase = await this.datasource.getDefaultOrFirstDatabase();
        const baseQuery = this.datasource.buildQuery(queryObj, {}, defaultDatabase);
        if (databasesQuery) {
          queryObj = { ...baseQuery, queryType: AdxQueryType.Databases };
        } else {
          queryObj = baseQuery;
        }
      }

      try {
        switch (queryObj.queryType) {
          case AdxQueryType.Databases:
            const databases = await this.datasource.getDatabases();
            return {
              data: databases.length ? [toDataFrame(databases)] : [],
            };
          default:
            const query = this.datasource.buildQuery(queryObj.query, {}, queryObj.database);
            const queryRes = await lastValueFrom(
              this.datasource.query(includeTimeRange({ targets: [query] } as DataQueryRequest<KustoQuery>))
            );
            if (queryRes?.data && queryRes.data.length) {
              return {
                data: firstStringFieldToMetricFindValue(queryRes.data[0]),
                error: queryRes.error ? new Error(queryRes.error.message) : undefined,
              };
            }

            return {
              data: [],
              error: queryRes?.error ? new Error(queryRes.error.message) : undefined,
            };
        }
      } catch (err) {
        return { data: [], error: new Error(err as string) };
      }
    };

    return from(promisedResults());
  }
}
