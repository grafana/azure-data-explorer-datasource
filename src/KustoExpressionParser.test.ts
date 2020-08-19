import { KustoExpressionParser } from './KustoExpressionParser';
import { QueryEditorPropertyType, QueryEditorOperator } from './editor/types';
import { TemplateSrv } from './test/template_srv';
import { setTemplateSrv } from '@grafana/runtime';
import {
  QueryEditorPropertyExpression,
  QueryEditorOperatorExpression,
  QueryEditorReduceExpression,
  QueryEditorGroupByExpression,
  QueryEditorExpressionType,
  QueryEditorExpression,
  QueryEditorArrayExpression,
} from './editor/expressions';
import { AdxColumnSchema } from 'types';

describe('KustoExpressionParser', () => {
  let kustoExpressionParser: KustoExpressionParser;
  let from: QueryEditorExpression;
  let where: QueryEditorArrayExpression;
  let reduce: QueryEditorArrayExpression;
  let groupBy: QueryEditorArrayExpression;

  beforeEach(() => {
    setupTemplateSrv();
    kustoExpressionParser = new KustoExpressionParser();

    from = {
      type: QueryEditorExpressionType.Property,
      property: {
        type: QueryEditorPropertyType.String,
        name: 'StormEvents',
      },
    } as QueryEditorPropertyExpression;
  });

  describe('simple query with group by', () => {
    beforeEach(() => {
      where = buildWhereWithMultiOperator(['NY', 'TX']);

      reduce = buildReduce(['DamageProperty'], ['sum']);

      groupBy = buildGroupBy();
    });

    it('should generate a valid query', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, [], 'db');
      expect(query).toBe(
        'StormEvents' +
          "\n| where $__timeFilter(StartTime)\n| where StateCode !in ('NY', 'TX')" +
          '\n| summarize sum(DamageProperty) by bin(StartTime, 1h)' +
          '\n| order by StartTime asc'
      );
    });
  });

  describe('simple query with no group by', () => {
    beforeEach(() => {
      where = buildWhereWithMultiOperator(['NY']);
      reduce = buildReduce(['State', 'DamageProperty'], ['none', 'none']);
      groupBy = { type: QueryEditorExpressionType.And, expressions: [] };
    });

    it('should generate a valid query', () => {
      const columns: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, columns, 'db');
      expect(query).toBe(
        'StormEvents' +
          "\n| where $__timeFilter(StartTime)\n| where StateCode !in ('NY')" +
          '\n| project StartTime, State, DamageProperty' +
          '\n| order by StartTime asc'
      );
    });
  });

  describe('query with filter with single value operator', () => {
    beforeEach(() => {
      where = buildWhereWithSingleOperator();

      reduce = buildReduce(['DamageProperty'], ['sum']);

      groupBy = buildGroupBy();
    });

    it('should generate a valid query', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, [], 'db');
      expect(query).toBe(
        'StormEvents' +
          "\n| where $__timeFilter(StartTime)\n| where StateCode == 'NY'" +
          '\n| summarize sum(DamageProperty) by bin(StartTime, 1h)' +
          '\n| order by StartTime asc'
      );
    });
  });

  describe('query with filter with multi value operator and template variable', () => {
    beforeEach(() => {
      where = buildWhereWithMultiOperator(['$state']);

      reduce = buildReduce(['DamageProperty'], ['sum']);

      groupBy = buildGroupBy();
    });

    it('should not put quotes around a variable', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, [], 'db');
      expect(query).toBe(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)\n| where StateCode !in ($state)' +
          '\n| summarize sum(DamageProperty) by bin(StartTime, 1h)' +
          '\n| order by StartTime asc'
      );
    });
  });

  describe('table query with no time column', () => {
    let columns: AdxColumnSchema[];
    beforeEach(() => {
      columns = [
        {
          CslType: 'datetime',
          Name: 'StartTime',
        },
      ];
      where = buildWhereWithMultiOperator(['$state']);

      reduce = buildReduce(['DamageProperty'], ['sum']);

      groupBy = buildGroupByWithNoTimeColumn();
    });

    it('should build a valid summarize and exclude the order by', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, columns, 'db');
      expect(query).toBe(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)\n| where StateCode !in ($state)' +
          '\n| summarize sum(DamageProperty) by State'
      );
    });
  });

  describe('query with reduce function and a parameter', () => {
    beforeEach(() => {
      where = buildWhereWithSingleOperator();

      reduce = buildReduce(['DamageProperty'], ['percentile'], '95');

      groupBy = buildGroupBy();
    });

    it('should generate a valid query', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, [], 'db');
      expect(query).toBe(
        'StormEvents' +
          "\n| where $__timeFilter(StartTime)\n| where StateCode == 'NY'" +
          '\n| summarize percentile(DamageProperty, 95) by bin(StartTime, 1h)' +
          '\n| order by StartTime asc'
      );
    });
  });

  describe('query with reduce on dynamic field value', () => {
    beforeEach(() => {
      where = buildWhereWithSingleOperator();
      reduce = buildReduce(['Customers.Value'], ['sum']);
      groupBy = buildGroupBy();
    });

    it('should generate a valid query', () => {
      const columns: AdxColumnSchema[] = [
        {
          Name: 'Customers.Value',
          CslType: 'long',
        },
      ];
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, columns, 'db');

      expect(query).toBe(
        'StormEvents' +
          "\n| where $__timeFilter(StartTime)\n| where StateCode == 'NY'" +
          '\n| summarize sum(tolong(todynamic(Customers).Value)) by bin(StartTime, 1h)' +
          '\n| order by StartTime asc'
      );
    });
  });
});

function setupTemplateSrv() {
  const variable: any = {
    id: 'state',
    index: 0,
    name: 'state',
    options: [
      { selected: true, value: 'NY', text: 'NY' },
      { selected: false, value: 'CA', text: 'CA' },
      { selected: true, value: 'TX', text: 'TX' },
    ],
    current: { selected: true, value: ['NY', 'TX'], text: 'NY + TX' },
    multi: true,
    includeAll: false,
    query: '',
    // hide: VariableHide.dontHide,
    type: 'custom',
    label: null,
    skipUrlSync: false,
    global: false,
  };
  const templateSrv = new TemplateSrv();
  templateSrv.init([variable]);
  setTemplateSrv(templateSrv);
}

// Setup functions
function buildWhereWithMultiOperator(values: string[]): QueryEditorArrayExpression {
  return {
    type: QueryEditorExpressionType.And,
    expressions: [
      {
        type: QueryEditorExpressionType.Or,
        expressions: [
          {
            type: QueryEditorExpressionType.Operator,
            property: {
              type: QueryEditorPropertyType.String,
              name: 'StateCode',
            },
            operator: {
              name: '!in',
              value: values,
            } as QueryEditorOperator<string[]>,
          } as QueryEditorOperatorExpression,
        ],
      } as QueryEditorArrayExpression,
    ],
  };
}

function buildWhereWithSingleOperator(): QueryEditorArrayExpression {
  return {
    type: QueryEditorExpressionType.And,
    expressions: [
      {
        type: QueryEditorExpressionType.Or,
        expressions: [
          {
            type: QueryEditorExpressionType.Operator,
            property: {
              type: QueryEditorPropertyType.String,
              name: 'StateCode',
            },
            operator: {
              name: '==',
              value: 'NY',
            } as QueryEditorOperator<string>,
          } as QueryEditorOperatorExpression,
        ],
      } as QueryEditorArrayExpression,
    ],
  };
}

function buildReduce(fields: string[], functions: string[], parameter = ''): QueryEditorArrayExpression {
  let expressions: QueryEditorReduceExpression[] = [];

  fields.forEach((field, i) => {
    const expr = {
      type: QueryEditorExpressionType.Reduce,
      property: {
        type: QueryEditorPropertyType.Number,
        name: field,
      },
      reduce: {
        type: QueryEditorPropertyType.Function,
        name: functions[i],
      },
    } as QueryEditorReduceExpression;
    if (parameter) {
      expr.parameters = [
        {
          name: 'aParam',
          fieldType: QueryEditorPropertyType.Number,
          value: parameter,
          type: QueryEditorExpressionType.FunctionParameter,
        },
      ];
    }

    expressions.push(expr);
  });

  return {
    type: QueryEditorExpressionType.And,
    expressions: expressions,
  };
}

function buildGroupBy(): QueryEditorArrayExpression {
  return {
    type: QueryEditorExpressionType.And,
    expressions: [
      {
        type: QueryEditorExpressionType.GroupBy,
        property: {
          type: QueryEditorPropertyType.DateTime,
          name: 'StartTime',
        },
        interval: {
          type: QueryEditorPropertyType.Interval,
          name: '1h',
        },
      } as QueryEditorGroupByExpression,
    ],
  };
}

function buildGroupByWithNoTimeColumn(): QueryEditorArrayExpression {
  return {
    type: QueryEditorExpressionType.And,
    expressions: [
      {
        type: QueryEditorExpressionType.GroupBy,
        property: {
          type: QueryEditorPropertyType.String,
          name: 'State',
        },
      } as QueryEditorGroupByExpression,
    ],
  };
}
