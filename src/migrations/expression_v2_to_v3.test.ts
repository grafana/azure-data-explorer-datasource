import { QueryExpression } from 'types';
import {
  QueryEditorExpressionType,
  QueryEditorReduceExpression,
  QueryEditorGroupByExpression,
  QueryEditorReduceExpressionArray,
  QueryEditorGroupByExpressionArray,
} from 'types/expressions';
import { QueryEditorPropertyType } from '../schema/types';
import { migrateExpression } from './expression';

// we started to save the version in v3.
const version = undefined;

describe('migrate expression from v2 to v3', () => {
  describe('migrate expression with multiple where statements', () => {
    it('should generate a valid v3 expression', () => {
      const expressionV2 = createWithMultipleWhere();
      const migrated = migrateExpression(version, expressionV2);

      const expected: QueryExpression = {
        from: {
          type: QueryEditorExpressionType.Property,
          property: {
            type: QueryEditorPropertyType.String,
            name: 'Covid19',
          },
        },
        where: {
          type: QueryEditorExpressionType.And,
          expressions: [
            {
              type: QueryEditorExpressionType.Or,
              expressions: [
                {
                  type: QueryEditorExpressionType.Operator,
                  property: {
                    name: 'Country',
                    type: QueryEditorPropertyType.String,
                  },
                  operator: {
                    name: '==',
                    value: 'United States',
                  },
                },
              ],
            },
          ],
        },
        reduce: emptyReduceArrayExpression(),
        groupBy: emptyGroupByExpression(),
      };

      expect(migrated).toStrictEqual(expected);
    });
  });

  describe('migrate expression with multiple where, reduce and groupBy statements', () => {
    it('should generate a valid v3 expression', () => {
      const expressionV2 = createWithReduceGroupByWhere();
      const migrated = migrateExpression(version, expressionV2);

      const expected: QueryExpression = {
        from: {
          type: QueryEditorExpressionType.Property,
          property: {
            type: QueryEditorPropertyType.String,
            name: '$table',
          },
        },
        where: {
          type: QueryEditorExpressionType.And,
          expressions: [
            {
              type: QueryEditorExpressionType.Or,
              expressions: [
                {
                  type: QueryEditorExpressionType.Operator,
                  property: {
                    name: 'State',
                    type: QueryEditorPropertyType.String,
                  },
                  operator: {
                    name: 'in',
                    value: ['Texas', '$state'],
                  },
                },
              ],
            },
          ],
        },
        reduce: {
          type: QueryEditorExpressionType.And,
          expressions: [
            {
              type: QueryEditorExpressionType.Reduce,
              property: {
                name: '$column',
                type: QueryEditorPropertyType.String,
              },
              reduce: {
                name: 'percentile',
                type: QueryEditorPropertyType.Function,
              },
              parameters: [
                {
                  type: QueryEditorExpressionType.FunctionParameter,
                  fieldType: 'number',
                  name: 'percentileParam',
                  value: '90',
                },
              ],
            } as QueryEditorReduceExpression,
            {
              type: QueryEditorExpressionType.Reduce,
              property: {
                name: 'Deaths',
                type: QueryEditorPropertyType.Number,
              },
              reduce: {
                type: QueryEditorPropertyType.Function,
                name: 'sum',
              },
            } as QueryEditorReduceExpression,
          ],
        },
        groupBy: {
          type: QueryEditorExpressionType.And,
          expressions: [
            {
              type: QueryEditorExpressionType.GroupBy,
              property: {
                name: 'Timestamp',
                type: QueryEditorPropertyType.DateTime,
              },
              interval: {
                name: '$interval',
                type: QueryEditorPropertyType.String,
              },
            } as QueryEditorGroupByExpression,
            {
              type: QueryEditorExpressionType.GroupBy,
              property: {
                name: '$groupbycol',
                type: QueryEditorPropertyType.String,
              },
            } as QueryEditorGroupByExpression,
          ],
        },
      };

      expect(migrated).toStrictEqual(expected);
    });
  });
});

const emptyReduceArrayExpression = (): QueryEditorReduceExpressionArray => {
  return {
    type: QueryEditorExpressionType.And,
    expressions: [],
  };
};

const emptyGroupByExpression = (): QueryEditorGroupByExpressionArray => {
  return {
    type: QueryEditorExpressionType.And,
    expressions: [],
  };
};

const createWithMultipleWhere = () => {
  return {
    from: {
      expression: {
        fieldType: 'string',
        type: 'field',
        value: 'Covid19',
      },
      id: 'from',
    },
    reduce: {
      expression: {
        expressions: [
          {
            type: 'reduce',
          },
        ],
        type: 'operatorRepeater',
        typeToRepeat: 'reduce',
      },
      id: 'value-column',
    },
    where: {
      expression: {
        expressions: [
          {
            field: {
              fieldType: 'string',
              type: 'field',
              value: 'Country',
            },
            operator: {
              operator: {
                booleanValues: false,
                description: 'equal to',
                label: '==',
                multipleValues: false,
                supportTypes: ['string', 'number'],
                value: '==',
              },
              type: 'operator',
              value: 'United States',
            },
            type: 'fieldAndOperator',
          },
        ],
        type: 'operatorRepeater',
        typeToRepeat: 'fieldAndOperator',
      },
      id: 'where',
    },
  };
};

const createWithReduceGroupByWhere = () => {
  return {
    from: {
      expression: {
        type: 'field',
        value: '$table',
      },
      id: 'from',
    },
    groupBy: {
      expression: {
        expressions: [
          {
            field: {
              fieldType: 'dateTime',
              type: 'field',
              value: 'Timestamp',
            },
            interval: {
              type: 'field',
              value: '$interval',
            },
            type: 'groupBy',
          },
          {
            field: {
              type: 'field',
              value: '$groupbycol',
            },
            type: 'groupBy',
          },
        ],
        type: 'operatorRepeater',
        typeToRepeat: 'groupBy',
      },
      id: 'group-by',
    },
    reduce: {
      expression: {
        expressions: [
          {
            field: {
              type: 'field',
              value: '$column',
            },
            parameters: [
              {
                fieldType: 'number',
                name: 'percentileParam',
                type: 'functionParameter',
                value: '90',
              },
            ],
            reduce: {
              fieldType: 'function',
              type: 'field',
              value: 'percentile',
            },
            type: 'reduce',
          },
          {
            field: {
              fieldType: 'number',
              type: 'field',
              value: 'Deaths',
            },
            reduce: {
              fieldType: 'function',
              type: 'field',
              value: 'sum',
            },
            type: 'reduce',
          },
        ],
        type: 'operatorRepeater',
        typeToRepeat: 'reduce',
      },
      id: 'value-column',
    },
    where: {
      expression: {
        expressions: [
          {
            field: {
              fieldType: 'string',
              type: 'field',
              value: 'State',
            },
            operator: {
              operator: {
                booleanValues: false,
                description: 'in (case-sensitive)',
                label: 'in',
                multipleValues: true,
                supportTypes: ['string', 'number'],
                value: 'in',
              },
              type: 'operator',
              values: ['Texas', '$state'],
            },
            type: 'fieldAndOperator',
          },
        ],
        type: 'operatorRepeater',
        typeToRepeat: 'fieldAndOperator',
      },
      id: 'where',
    },
  };
};
