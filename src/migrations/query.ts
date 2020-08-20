import { KustoQuery, defaultQuery } from 'types';
import { looksLikeV2, migrateExpression } from './expression';

export const migrateQuery = (query: KustoQuery): KustoQuery => {
  return {
    ...defaultQuery,
    ...query,
    pluginVersion: defaultQuery.pluginVersion,
    expression: migrateExpression(defaultQuery.pluginVersion, query.expression),
  };
};

export const needsToBeMigrated = (query: KustoQuery): boolean => {
  if (!query) {
    return false;
  }

  if (!query.pluginVersion) {
    return true;
  }

  if (!query.querySource) {
    return true;
  }

  if (looksLikeV2(query.expression)) {
    return true;
  }

  return false;
};
