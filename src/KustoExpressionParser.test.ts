import { KustoExpressionParser } from './KustoExpressionParser';
import { QueryEditorSectionExpression, QueryEditorExpressionType } from './types';
import { QueryEditorFieldExpression } from './editor/components/field/QueryEditorField';
import { QueryEditorFieldType, QueryEditorFieldDefinition } from './editor/types';
import { QueryEditorRepeaterExpression } from './editor/components/QueryEditorRepeater';
import { QueryEditorMultiOperatorExpression } from './editor/components/operators/QueryEditorMultiOperator';
import { QueryEditorFieldAndOperatorExpression } from './editor/components/filter/QueryEditorFieldAndOperator';
import { QueryEditorReduceExpression } from './editor/components/reduce/QueryEditorReduce';
import { QueryEditorGroupByExpression } from './editor/components/groupBy/QueryEditorGroupBy';

describe('KustoExpressionParser', () => {
  let kustoExpressionParser: KustoExpressionParser;
  beforeEach(() => {
    kustoExpressionParser = new KustoExpressionParser();
  });

  describe('simple query with group by', () => {
    let from: QueryEditorSectionExpression;
    let where: QueryEditorSectionExpression;
    let reduce: QueryEditorSectionExpression;
    let groupBy: QueryEditorSectionExpression;

    beforeEach(() => {
      from = {
        id: 'from',
        expression: {
          type: QueryEditorExpressionType.Field,
          fieldType: QueryEditorFieldType.String,
          value: 'StormEvents',
        } as QueryEditorFieldExpression,
      };

      where = {
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
                values: ['NY'],
              } as QueryEditorMultiOperatorExpression,
            } as QueryEditorFieldAndOperatorExpression,
          ],
        } as QueryEditorRepeaterExpression,
      };

      reduce = {
        id: 'reduce',
        expression: {
          type: QueryEditorExpressionType.OperatorRepeater,
          typeToRepeat: QueryEditorExpressionType.FieldAndOperator,
          expressions: [
            {
              type: QueryEditorExpressionType.Reduce,
              field: {
                type: QueryEditorExpressionType.Field,
                fieldType: QueryEditorFieldType.Number,
                value: 'DamageProperty',
              },
              reduce: {
                type: QueryEditorExpressionType.Field,
                fieldType: QueryEditorFieldType.Function,
                value: 'sum',
              },
            } as QueryEditorReduceExpression,
          ],
        } as QueryEditorRepeaterExpression,
      };

      groupBy = {
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
    });

    it('should generate a valid query', () => {
      const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, []);
      expect(query).toBe(
        'StormEvents' +
          "\n| where $__timeFilter(StartTime)\n| where StateCode !in ('NY')" +
          '\n| summarize sum(DamageProperty) by bin(StartTime, 1h)' +
          '\n| order by StartTime asc'
      );
    });
  });

  describe('simple query with no group by', () => {
    let from: QueryEditorSectionExpression;
    let where: QueryEditorSectionExpression;
    let reduce: QueryEditorSectionExpression;

    beforeEach(() => {
      from = {
        id: 'from',
        expression: {
          type: QueryEditorExpressionType.Field,
          fieldType: QueryEditorFieldType.String,
          value: 'StormEvents',
        } as QueryEditorFieldExpression,
      };

      where = {
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
                values: ['NY'],
              } as QueryEditorMultiOperatorExpression,
            } as QueryEditorFieldAndOperatorExpression,
          ],
        } as QueryEditorRepeaterExpression,
      };

      reduce = {
        id: 'reduce',
        expression: {
          type: QueryEditorExpressionType.OperatorRepeater,
          typeToRepeat: QueryEditorExpressionType.FieldAndOperator,
          expressions: [
            {
              type: QueryEditorExpressionType.Reduce,
              field: {
                type: QueryEditorExpressionType.Field,
                fieldType: QueryEditorFieldType.Number,
                value: 'State',
              },
              reduce: {
                type: QueryEditorExpressionType.Field,
                fieldType: QueryEditorFieldType.Function,
                value: 'none',
              },
            } as QueryEditorReduceExpression,
            {
              type: QueryEditorExpressionType.Reduce,
              field: {
                type: QueryEditorExpressionType.Field,
                fieldType: QueryEditorFieldType.Number,
                value: 'DamageProperty',
              },
              reduce: {
                type: QueryEditorExpressionType.Field,
                fieldType: QueryEditorFieldType.Function,
                value: 'none',
              },
            } as QueryEditorReduceExpression,
          ],
        } as QueryEditorRepeaterExpression,
      };
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
});
