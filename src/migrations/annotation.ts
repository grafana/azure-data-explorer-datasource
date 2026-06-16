import { DataSourceRef } from '@grafana/schema';
import { AdxQueryType, KustoQuery, defaultQuery } from 'types';

type inputAnnotation = {
  datasource: DataSourceRef | null | undefined;
  database: string;
  enable: boolean;
  name: string;
  iconColor: string;
  query?: string;
  target?: KustoQuery;
  resultFormat?: string;
};

export const migrateAnnotation = (annotation: inputAnnotation) => {
  if (annotation.target && annotation.target.database !== null) {
    return annotation;
  }

  const newQuery: KustoQuery = {
    ...defaultQuery,
    ...(annotation.target ?? {}),
    database: annotation.database,
    query: annotation.query ?? '',
    rawMode: true,
    refId: annotation.target?.refId ?? 'Anno',
    resultFormat: annotation.resultFormat ?? 'table',
    pluginVersion: defaultQuery.pluginVersion,
    queryType: AdxQueryType.KustoQuery,
    clusterUri: '',
  };

  return {
    ...annotation,
    target: newQuery,
  };
};
