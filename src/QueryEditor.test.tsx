import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryEditor } from './QueryEditor';
import { KustoQuery, AdxSchema, QueryEditorExpressionType } from './types';
import { QueryEditorFieldType } from './editor/types';
import { QueryEditorFieldExpression } from './editor/components/field/QueryEditorField';
import { QueryEditorRepeaterExpression } from './editor/components/QueryEditorRepeater';
import { QueryEditorReduceExpression } from './editor/components/reduce/QueryEditorReduce';
import { QueryEditorFieldAndOperatorExpression } from './editor/components/filter/QueryEditorFieldAndOperator';
import { QueryEditorMultiOperatorExpression } from './editor/components/operators/QueryEditorMultiOperator';

const defaultProps = {
  onChange: () => {},
  datasource: {
    getSchema: getSchema,
  } as any,
  onRunQuery: undefined as any,
};

function renderWithQuery(query: KustoQuery) {
  render(
    <QueryEditor
      {...{
        ...defaultProps,
        query: {
          ...query,
        },
      }}
    />
  );
}

describe('QueryEditor', () => {
  it('should load saved query fields', async () => {
    const fromFieldExpression: QueryEditorFieldExpression = {
      type: QueryEditorExpressionType.Field,
      fieldType: QueryEditorFieldType.String,
      value: 'StormEvents',
    };

    const whereFieldExpression: QueryEditorRepeaterExpression = {
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
    };

    const reduceFieldExpression: QueryEditorReduceExpression = {
      type: QueryEditorExpressionType.Reduce,
      field: {
        type: QueryEditorExpressionType.Field,
        fieldType: QueryEditorFieldType.Number,
        value: 'Deaths',
      },
      reduce: {
        type: QueryEditorExpressionType.Field,
        fieldType: QueryEditorFieldType.Function,
        value: 'sum',
      },
    };

    const query: KustoQuery = {
      refId: 'A',
      database: 'Samples',
      resultFormat: '',
      query: '',
      expression: {
        from: {
          id: 'from',
          expression: fromFieldExpression,
        },
        where: {
          id: 'where',
          expression: whereFieldExpression,
        },
        reduce: {
          id: 'reduce',
          expression: reduceFieldExpression,
        },
      },
    };
    renderWithQuery(query);
    await waitFor(() => {
      expect(screen.getByText('Samples / StormEvents')).not.toBeNull();
      expect(screen.getByText('Deaths')).not.toBeNull();
      expect(screen.getByText('Sum')).not.toBeNull();
      expect(screen.getByText('StateCode')).not.toBeNull();
    });
  });
});

function getSchema(): AdxSchema {
  return {
    Databases: {
      Samples: {
        Name: 'Samples',
        ExternalTables: {},
        Tables: {
          StormEvents: {
            Name: 'StormEvents',
            OrderedColumns: [
              {
                Name: 'StartTime',
                Type: 'System.Datetime',
              },
              {
                Name: 'Deaths',
                Type: 'System.Int32',
              },
              {
                Name: 'StateCode',
                Type: 'System.String',
              },
            ],
          },
        },
      },
    },
  };
}
