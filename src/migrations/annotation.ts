import { KustoQuery, defaultQuery } from 'types';

export const migrateAnnotation = (annotation: any) => {
  if (annotation.target && annotation.target.database) {
    return annotation;
  }

  const newQuery: KustoQuery = {
    ...defaultQuery,
    ...(annotation.target ?? {}),
    database: annotation.database,
    query: annotation.query,
    rawMode: true,
    refId: annotation.target?.refId ?? 'Anno',
    resultFormat: annotation.resultFormat,
    pluginVersion: defaultQuery.pluginVersion,
  };

  return {
    ...annotation,
    target: newQuery,
  };
};
