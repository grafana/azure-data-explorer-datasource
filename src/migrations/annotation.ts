import { KustoQuery, defaultQuery } from 'types';

type inputAnnotation = {
  database?: string;
  query?: string;
  target?: KustoQuery;
  resultFormat?: string;
};

export const migrateAnnotation = (annotation: inputAnnotation) => {
  if (annotation.target && annotation.target.database) {
    return annotation;
  }

  const newQuery: KustoQuery = {
    ...defaultQuery,
    ...(annotation.target ?? {}),
    database: annotation.database ?? '',
    query: annotation.query ?? '',
    rawMode: true,
    refId: annotation.target?.refId ?? 'Anno',
    resultFormat: annotation.resultFormat ?? 'table',
    pluginVersion: defaultQuery.pluginVersion,
  };

  return {
    ...annotation,
    target: newQuery,
  };
};
