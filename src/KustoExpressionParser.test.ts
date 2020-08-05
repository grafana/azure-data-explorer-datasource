import { KustoExpressionParser } from './KustoExpressionParser';
import { QueryEditorFieldType, QueryEditorFieldDefinition } from './editor/types';
import { TemplateSrv } from './test/template_srv';
import { setTemplateSrv } from '@grafana/runtime';
import {
  QueryEditorFieldExpression,
  QueryEditorMultiOperatorExpression,
  QueryEditorFieldAndOperatorExpression,
  QueryEditorRepeaterExpression,
  QueryEditorSingleOperatorExpression,
  QueryEditorReduceExpression,
  QueryEditorGroupByExpression,
  QueryEditorSectionExpression,
  QueryEditorExpressionType,
} from './editor/expressions';

describe('KustoExpressionParser', () => {
  let kustoExpressionParser: KustoExpressionParser;
  let from: QueryEditorSectionExpression;
  let where: QueryEditorSectionExpression;
  let reduce: QueryEditorSectionExpression;
  let groupBy: QueryEditorSectionExpression;

  beforeEach(() => {
    setupTemplateSrv();
    kustoExpressionParser = new KustoExpressionParser();

    from = {
      id: 'from',
      expression: {
        type: QueryEditorExpressionType.Field,
        fieldType: QueryEditorFieldType.String,
        value: 'StormEvents',
      } as QueryEditorFieldExpression,
    };
  });

  describe('simple query with group by', () => {
    beforeEach(() => {
      where = buildWhereWithMultiOperator(['NY', 'TX']);

      reduce = buildReduce(['DamageProperty'], ['sum']);

      groupBy = buildGroupBy();
    });

    it('should generate a valid query', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, []);
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
    });

    it('should generate a valid query', () => {
      const columns: QueryEditorFieldDefinition[] = [
        {
          type: QueryEditorFieldType.DateTime,
          value: 'StartTime',
        },
      ];
      const query = kustoExpressionParser.query({ from, where, reduce }, columns);
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
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, []);
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
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, []);
      expect(query).toBe(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)\n| where StateCode !in ($state)' +
          '\n| summarize sum(DamageProperty) by bin(StartTime, 1h)' +
          '\n| order by StartTime asc'
      );
    });
  });

  describe('table query with no time column', () => {
    let columns: QueryEditorFieldDefinition[];
    beforeEach(() => {
      columns = [
        {
          type: QueryEditorFieldType.DateTime,
          value: 'StartTime',
        },
      ];
      where = buildWhereWithMultiOperator(['$state']);

      reduce = buildReduce(['DamageProperty'], ['sum']);

      groupBy = buildGroupByWithNoTimeColumn();
    });

    it('should build a valid summarize and exclude the order by', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, columns);
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
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, []);
      expect(query).toBe(
        'StormEvents' +
          "\n| where $__timeFilter(StartTime)\n| where StateCode == 'NY'" +
          '\n| summarize percentile(DamageProperty, 95) by bin(StartTime, 1h)' +
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
function buildWhereWithMultiOperator(values: string[]): QueryEditorSectionExpression {
  return {
    id: 'where',
    expression: {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeat: QueryEditorExpressionType.FieldAndOperator,
      expressions: [
        {
          type: QueryEditorExpressionType.FieldAndOperator,
          field: {
            type: QueryEditorExpressionType.Field,
            fieldType: QueryEditorFieldType.String,
            value: 'StateCode',
          },
          operator: {
            type: QueryEditorExpressionType.Operator,
            operator: {
              value: '!in',
              multipleValues: true,
              booleanValues: false,
              description: 'not in (case-sensitive)',
              label: '!in',
            },
            values: values,
          } as QueryEditorMultiOperatorExpression,
        } as QueryEditorFieldAndOperatorExpression,
      ],
    } as QueryEditorRepeaterExpression,
  };
}

function buildWhereWithSingleOperator(): QueryEditorSectionExpression {
  return {
    id: 'where',
    expression: {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeat: QueryEditorExpressionType.FieldAndOperator,
      expressions: [
        {
          type: QueryEditorExpressionType.FieldAndOperator,
          field: {
            type: QueryEditorExpressionType.Field,
            fieldType: QueryEditorFieldType.String,
            value: 'StateCode',
          },
          operator: {
            type: QueryEditorExpressionType.Operator,
            operator: {
              value: '==',
              multipleValues: true,
              booleanValues: false,
              description: 'not in (case-sensitive)',
              label: '==',
            },
            value: 'NY',
          } as QueryEditorSingleOperatorExpression,
        } as QueryEditorFieldAndOperatorExpression,
      ],
    } as QueryEditorRepeaterExpression,
  };
}

function buildReduce(fields: string[], functions: string[], parameter = ''): QueryEditorSectionExpression {
  let expressions: QueryEditorReduceExpression[] = [];

  fields.forEach((field, i) => {
    const expr = {
      type: QueryEditorExpressionType.Reduce,
      field: {
        type: QueryEditorExpressionType.Field,
        fieldType: QueryEditorFieldType.Number,
        value: field,
      },
      reduce: {
        type: QueryEditorExpressionType.Field,
        fieldType: QueryEditorFieldType.Function,
        value: functions[i],
      },
    } as QueryEditorReduceExpression;
    if (parameter) {
      expr.parameters = [
        {
          name: 'aParam',
          fieldType: QueryEditorFieldType.Number,
          value: parameter,
          type: QueryEditorExpressionType.FunctionParameter,
        },
      ];
    }

    expressions.push(expr);
  });

  return {
    id: 'reduce',
    expression: {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeat: QueryEditorExpressionType.FieldAndOperator,
      expressions: expressions,
    } as QueryEditorRepeaterExpression,
  };
}

function buildGroupBy() {
  return {
    id: 'groupBy',
    expression: {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeat: QueryEditorExpressionType.GroupBy,
      expressions: [
        {
          type: QueryEditorExpressionType.GroupBy,
          field: {
            type: QueryEditorExpressionType.Field,
            fieldType: QueryEditorFieldType.DateTime,
            value: 'StartTime',
          },
          interval: {
            type: QueryEditorExpressionType.Field,
            fieldType: QueryEditorFieldType.Interval,
            value: '1h',
          },
        } as QueryEditorGroupByExpression,
      ],
    } as QueryEditorRepeaterExpression,
  };
}

function buildGroupByWithNoTimeColumn() {
  return {
    id: 'groupBy',
    expression: {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeat: QueryEditorExpressionType.GroupBy,
      expressions: [
        {
          type: QueryEditorExpressionType.GroupBy,
          field: {
            type: QueryEditorExpressionType.Field,
            fieldType: QueryEditorFieldType.String,
            value: 'State',
          },
        } as QueryEditorGroupByExpression,
      ],
    } as QueryEditorRepeaterExpression,
  };
}
