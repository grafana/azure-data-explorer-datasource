import { KustoExpressionParser } from './KustoExpressionParser';
import { QueryEditorPropertyType } from './editor/types';
import { TemplateSrv } from '@grafana/runtime';
import {
  QueryEditorPropertyExpression,
  QueryEditorOperatorExpression,
  QueryEditorExpressionType,
  QueryEditorArrayExpression,
  QueryEditorExpression,
  QueryEditorReduceExpression,
  QueryEditorGroupByExpression,
} from './editor/expressions';
import { AdxColumnSchema, defaultQuery, QueryExpression } from 'types';

describe('KustoExpressionParser', () => {
  const limit = 1000;
  const templateSrv: TemplateSrv = { getVariables: jest.fn(), replace: jest.fn() };
  const parser = new KustoExpressionParser(limit, templateSrv);

  describe('toQuery', () => {
    it('should parse expression with where equal to string value', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('eventType', '==', 'ThunderStorm')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where eventType == "ThunderStorm"' + `\n| take ${limit}`
      );
    });

    it('should parse expression with where equal to boolean value', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where isActive == true' + `\n| take ${limit}`);
    });

    it('should parse expression with where equal to numeric value', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('count', '==', 10)]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where count == 10' + `\n| take ${limit}`);
    });

    it('should parse expression with where in numeric values', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('count', 'in', [10, 20])]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where count in (10, 20)' + `\n| take ${limit}`);
    });

    it('should parse expression with where in string values', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('events', 'in', ['triggered', 'closed'])]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where events in ("triggered", "closed")' + `\n| take ${limit}`
      );
    });

    it('should parse expression with multiple where filters', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([
          createOperator('isActive', '==', true),
          createOperator('events', 'in', ['triggered', 'closed']),
        ]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' +
          '\n| where isActive == true' +
          '\n| where events in ("triggered", "closed")' +
          `\n| take ${limit}`
      );
    });

    it('should parse expression with multiple where filters with nested or', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([
          createOperator('isActive', '==', true),
          createOperator('events', 'in', ['triggered', 'closed']),
          createArray(
            [createOperator('state', '==', 'TEXAS'), createOperator('state', '==', 'FLORIDA')],
            QueryEditorExpressionType.Or
          ),
        ]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' +
          '\n| where isActive == true' +
          '\n| where events in ("triggered", "closed")' +
          '\n| where state == "TEXAS" or state == "FLORIDA"' +
          `\n| take ${limit}`
      );
    });

    it('should parse expression with empty where filter', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', '')]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where isActive == ""' + `\n| take ${limit}`);
    });

    it('should parse expression with time filter when schema contains time column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where isActive == true' +
          `\n| order by StartTime asc` +
          `\n| take ${limit}`
      );
    });

    it('should parse expression with time filter when schema contains multiple time columns', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
        {
          Name: 'EndTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where isActive == true' +
          `\n| order by StartTime asc` +
          `\n| take ${limit}`
      );
    });

    it('should parse expression with time filter when schema contains dynamic time columns', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'Column.StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where todatetime(todynamic(Column).StartTime) between ($__timeFrom .. $__timeTo)' +
          '\n| where isActive == true' +
          `\n| order by todatetime(todynamic(Column).StartTime) asc` +
          `\n| take ${limit}`
      );
    });

    it('should parse expression with time filter when schema contains combination of dynamic time columns and regular', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'Column.StartTime',
          CslType: 'datetime',
        },
        {
          Name: 'SavedTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(SavedTime)' +
          '\n| where isActive == true' +
          `\n| order by SavedTime asc` +
          `\n| take ${limit}`
      );
    });

    it('should parse expression with when filter on dynamic column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column.isActive', '==', true)]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where column.isActive == true' + `\n| take ${limit}`
      );
    });

    it('should parse expression with summarize of sum(active)', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column.isActive', '==', true)]),
        reduce: createArray([createReduce('active', 'sum')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where column.isActive == true' + `\n| summarize sum(active)` + `\n| take ${limit}`
      );
    });

    it('should parse expression with summarize of count', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column.isActive', '==', true)]),
        reduce: createArray([createReduce('active', 'count')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where column.isActive == true' + `\n| summarize count()` + `\n| take ${limit}`
      );
    });

    it('should parse expression with summarize of sum on dynamic column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column.isActive', '==', true)]),
        reduce: createArray([createReduce('column.level.active', 'sum')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column.level.active',
          CslType: 'int',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where column.isActive == true' +
          `\n| summarize sum(toint(todynamic(todynamic(column).level).active))` +
          `\n| take ${limit}`
      );
    });

    it('should parse expression with project when no group by and no reduce functions', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column.isActive', '==', true)]),
        reduce: createArray([createReduce('column.level.active', 'none'), createReduce('active', 'none')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column.level.active',
          CslType: 'int',
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column.isActive == true' +
          `\n| project toint(todynamic(todynamic(column).level).active), active` +
          `\n| order by StartTime asc` +
          `\n| take ${limit}`
      );
    });
  });

  it('should parse expression with summarize when no group by and mixed none and reduce functions', () => {
    const expression = createQueryExpression({
      from: createProperty('StormEvents'),
      where: createArray([createOperator('column.isActive', '==', true)]),
      reduce: createArray([createReduce('column.level.active', 'sum'), createReduce('active', 'none')]),
    });

    const tableSchema: AdxColumnSchema[] = [
      {
        Name: 'column.level.active',
        CslType: 'int',
      },
      {
        Name: 'StartTime',
        CslType: 'datetime',
      },
    ];

    expect(parser.toQuery(expression, tableSchema)).toEqual(
      'StormEvents' +
        '\n| where $__timeFilter(StartTime)' +
        '\n| where column.isActive == true' +
        `\n| summarize sum(toint(todynamic(todynamic(column).level).active))` +
        `\n| order by StartTime asc` +
        `\n| take ${limit}`
    );
  });

  it('should parse expression to summarize and bin size when it has group by and reduce functions', () => {
    const expression = createQueryExpression({
      from: createProperty('StormEvents'),
      where: createArray([createOperator('column.isActive', '==', true)]),
      reduce: createArray([createReduce('column.level.active', 'sum')]),
      groupBy: createArray([createGroupBy('StartTime', '1h')]),
    });

    const tableSchema: AdxColumnSchema[] = [
      {
        Name: 'column.level.active',
        CslType: 'int',
      },
      {
        Name: 'StartTime',
        CslType: 'datetime',
      },
    ];

    expect(parser.toQuery(expression, tableSchema)).toEqual(
      'StormEvents' +
        '\n| where $__timeFilter(StartTime)' +
        '\n| where column.isActive == true' +
        `\n| summarize sum(toint(todynamic(todynamic(column).level).active)) by bin(StartTime, 1h)` +
        `\n| order by StartTime asc` +
        `\n| take ${limit}`
    );
  });

  it('should parse expression to summarize and bin size when it has group by', () => {
    const expression = createQueryExpression({
      from: createProperty('StormEvents'),
      where: createArray([createOperator('column.isActive', '==', true)]),
      groupBy: createArray([createGroupBy('StartTime', '1h')]),
    });

    const tableSchema: AdxColumnSchema[] = [
      {
        Name: 'column.level.active',
        CslType: 'int',
      },
      {
        Name: 'StartTime',
        CslType: 'datetime',
      },
    ];

    expect(parser.toQuery(expression, tableSchema)).toEqual(
      'StormEvents' +
        '\n| where $__timeFilter(StartTime)' +
        '\n| where column.isActive == true' +
        `\n| summarize by bin(StartTime, 1h)` +
        `\n| order by StartTime asc` +
        `\n| take ${limit}`
    );
  });

  it('should parse expression to summarize and bin size when it has group by multiple fields', () => {
    const expression = createQueryExpression({
      from: createProperty('StormEvents'),
      where: createArray([createOperator('column.isActive', '==', true)]),
      groupBy: createArray([createGroupBy('StartTime', '1h'), createGroupBy('type')]),
    });

    const tableSchema: AdxColumnSchema[] = [
      {
        Name: 'column.level.active',
        CslType: 'int',
      },
      {
        Name: 'StartTime',
        CslType: 'datetime',
      },
    ];

    expect(parser.toQuery(expression, tableSchema)).toEqual(
      'StormEvents' +
        '\n| where $__timeFilter(StartTime)' +
        '\n| where column.isActive == true' +
        `\n| summarize by bin(StartTime, 1h), type` +
        `\n| order by StartTime asc` +
        `\n| take ${limit}`
    );
  });

  it('should parse expression and replace default time column with group by time if available', () => {
    const expression = createQueryExpression({
      from: createProperty('StormEvents'),
      where: createArray([createOperator('column.isActive', '==', true)]),
      groupBy: createArray([createGroupBy('EndTime', '1h'), createGroupBy('type')]),
    });

    const tableSchema: AdxColumnSchema[] = [
      {
        Name: 'column.level.active',
        CslType: 'int',
      },
      {
        Name: 'StartTime',
        CslType: 'datetime',
      },
      {
        Name: 'EndTime',
        CslType: 'datetime',
      },
    ];

    expect(parser.toQuery(expression, tableSchema)).toEqual(
      'StormEvents' +
        '\n| where $__timeFilter(EndTime)' +
        '\n| where column.isActive == true' +
        `\n| summarize by bin(EndTime, 1h), type` +
        `\n| order by EndTime asc` +
        `\n| take ${limit}`
    );
  });

  it('should parse expression and replace default time column with group by as dynamic column', () => {
    const expression = createQueryExpression({
      from: createProperty('StormEvents'),
      where: createArray([createOperator('column.isActive', '==', true)]),
      groupBy: createArray([createGroupBy('column.EndTime', '1h'), createGroupBy('type')]),
    });

    const tableSchema: AdxColumnSchema[] = [
      {
        Name: 'column.level.active',
        CslType: 'int',
      },
      {
        Name: 'StartTime',
        CslType: 'datetime',
      },
      {
        Name: 'column.EndTime',
        CslType: 'datetime',
      },
    ];

    expect(parser.toQuery(expression, tableSchema)).toEqual(
      'StormEvents' +
        '\n| where todatetime(todynamic(column).EndTime) between ($__timeFrom .. $__timeTo)' +
        '\n| where column.isActive == true' +
        `\n| summarize by bin(todatetime(todynamic(column).EndTime), 1h), type` +
        `\n| order by todatetime(todynamic(column).EndTime) asc` +
        `\n| take ${limit}`
    );
  });

  it('should parse expression and summarize by dynamic column', () => {
    const expression = createQueryExpression({
      from: createProperty('StormEvents'),
      where: createArray([createOperator('column.isActive', '==', true)]),
      groupBy: createArray([createGroupBy('column.type')]),
    });

    const tableSchema: AdxColumnSchema[] = [
      {
        Name: 'column.type',
        CslType: 'string',
      },
      {
        Name: 'StartTime',
        CslType: 'datetime',
      },
    ];

    expect(parser.toQuery(expression, tableSchema)).toEqual(
      'StormEvents' +
        '\n| where $__timeFilter(StartTime)' +
        '\n| where column.isActive == true' +
        `\n| summarize by tostring(todynamic(column).type)` +
        `\n| order by StartTime asc` +
        `\n| take ${limit}`
    );
  });
});

const createGroupBy = (column: string, interval?: string): QueryEditorGroupByExpression => {
  if (!interval) {
    return {
      type: QueryEditorExpressionType.GroupBy,
      property: {
        type: QueryEditorPropertyType.String,
        name: column,
      },
    };
  }

  return {
    type: QueryEditorExpressionType.GroupBy,
    property: {
      type: QueryEditorPropertyType.DateTime,
      name: column,
    },
    interval: {
      type: QueryEditorPropertyType.Interval,
      name: interval,
    },
  };
};

const createReduce = (column: string, func: string): QueryEditorReduceExpression => {
  return {
    type: QueryEditorExpressionType.Reduce,
    property: {
      type: QueryEditorPropertyType.Number,
      name: column,
    },
    reduce: {
      type: QueryEditorPropertyType.Function,
      name: func,
    },
  };
};

const createProperty = (name: string): QueryEditorPropertyExpression => {
  return {
    type: QueryEditorExpressionType.Property,
    property: {
      type: QueryEditorPropertyType.String,
      name: name,
    },
  };
};

const createQueryExpression = (query: Partial<QueryExpression>): QueryExpression => {
  return {
    ...defaultQuery.expression,
    ...query,
  };
};

const createOperator = (property: string, operator: string, value: any): QueryEditorOperatorExpression => {
  return {
    type: QueryEditorExpressionType.Operator,
    property: {
      name: property,
      type: valueToPropertyType(value),
    },
    operator: {
      name: operator,
      value: value,
    },
  };
};

const valueToPropertyType = (value: any): QueryEditorPropertyType => {
  if (Array.isArray(value) && value.length > 0) {
    return valueToPropertyType(value[0]);
  }

  switch (typeof value) {
    case 'number':
      return QueryEditorPropertyType.Number;
    case 'boolean':
      return QueryEditorPropertyType.Boolean;
    default:
      return QueryEditorPropertyType.String;
  }
};

const createArray = (
  expressions: QueryEditorExpression[],
  type: QueryEditorExpressionType = QueryEditorExpressionType.Multiple
): QueryEditorArrayExpression => {
  return {
    type,
    expressions,
  };
};
