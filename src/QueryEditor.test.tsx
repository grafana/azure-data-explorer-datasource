import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryEditor } from './QueryEditor';
import { KustoQuery, AdxSchema, QueryEditorExpressionType, QueryEditorSectionExpression } from './types';
import { QueryEditorFieldType } from './editor/types';
import { QueryEditorFieldExpression } from './editor/components/field/QueryEditorField';
import { QueryEditorRepeaterExpression } from './editor/components/QueryEditorRepeater';
import { QueryEditorReduceExpression } from './editor/components/reduce/QueryEditorReduce';
import { QueryEditorGroupByExpression } from './editor/components/groupBy/QueryEditorGroupBy';
import { QueryEditorFieldAndOperatorExpression } from './editor/components/filter/QueryEditorFieldAndOperator';
import { QueryEditorMultiOperatorExpression } from './editor/components/operators/QueryEditorMultiOperator';
import { TemplateSrv } from './test/template_srv';
import { setTemplateSrv } from '@grafana/runtime';

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
  beforeEach(() => {
    setTemplateSrv(new TemplateSrv());
  });

  it('should load saved query fields', async () => {
    const from: QueryEditorSectionExpression = {
      id: 'from',
      expression: {
        type: QueryEditorExpressionType.Field,
        fieldType: QueryEditorFieldType.String,
        value: 'StormEvents',
      } as QueryEditorFieldExpression,
    };

    const where: QueryEditorSectionExpression = {
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

    const reduce: QueryEditorSectionExpression = {
      id: 'reduce',
      expression: {
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
      } as QueryEditorReduceExpression,
    };

    const groupBy: QueryEditorSectionExpression = {
      id: 'groupBy',
      expression: {
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
    };

    const query: KustoQuery = {
      refId: 'A',
      database: 'Samples',
      resultFormat: '',
      query: '',
      rawMode: false,
      alias: '',
      expression: {
        from,
        where,
        reduce,
        groupBy,
      },
    };
    renderWithQuery(query);
    await waitFor(() => {
      //db
      expect(screen.getByText('Samples')).not.toBeNull();

      //from
      expect(screen.getByText('StormEvents')).not.toBeNull();

      //value field
      expect(screen.getByText('Deaths')).not.toBeNull();
      expect(screen.getByText('Sum')).not.toBeNull();

      // //filter
      expect(screen.getByText('StateCode')).not.toBeNull();

      // //group by
      expect(screen.getByText('StartTime')).not.toBeNull();
      expect(screen.getByText('1 hour')).not.toBeNull();
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
