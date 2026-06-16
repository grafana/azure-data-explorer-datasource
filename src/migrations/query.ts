import { AdxQueryType, KustoQuery, defaultQuery, EditorMode } from 'types';
import { looksLikeV2, migrateExpression } from './expression';

export const migrateQuery = (query: KustoQuery | string): KustoQuery => {
  if (typeof query === 'string') {
    const databasesQuery = query.match(/^databases\(\)/i);
    const baseQuery = {
      ...defaultQuery,
      query,
      refId: `adx-${query}`,
      querySource: EditorMode.Raw,
      database: '',
      clusterUri: '',
      resultFormat: 'table',
      rawMode: true,
      pluginVersion: defaultQuery.pluginVersion,
      expression: defaultQuery.expression,
      queryType: AdxQueryType.KustoQuery,
    };
    if (databasesQuery) {
      return { ...baseQuery, queryType: AdxQueryType.Databases };
    }
    return baseQuery;
  }
  return {
    ...defaultQuery,
    ...query,
    rawMode: isRawMode(query),
    pluginVersion: defaultQuery.pluginVersion,
    expression: migrateExpression(defaultQuery.pluginVersion, query.expression),
    queryType: AdxQueryType.KustoQuery,
  };
};

export const needsToBeMigrated = (query: KustoQuery): boolean => {
  if (!query) {
    return false;
  }

  if (query.queryType && query.queryType !== AdxQueryType.KustoQuery) {
    return false;
  }

  if (!query.queryType) {
    return true;
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

function isRawMode(query: KustoQuery): boolean {
  if (query.rawMode === undefined && query.query && !query.expression?.from) {
    return true;
  }
  return query.rawMode || false;
}
