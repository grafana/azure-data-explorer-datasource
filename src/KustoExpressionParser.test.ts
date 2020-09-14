import { KustoExpressionParser } from './KustoExpressionParser';
import { QueryEditorPropertyType } from './editor/types';
import { TemplateSrv } from '@grafana/runtime';
import {
  QueryEditorPropertyExpression,
  QueryEditorOperatorExpression,
  QueryEditorExpressionType,
  QueryEditorArrayExpression,
  QueryEditorExpression,
} from './editor/expressions';
import { defaultQuery, QueryExpression } from 'types';

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

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where eventType == "ThunderStorm"');
    });

    it('should parse expression with where equal to boolean value', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where isActive == true');
    });

    it('should parse expression with where equal to numeric value', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('count', '==', 10)]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where count == 10');
    });

    it('should parse expression with where in numeric values', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('count', 'in', [10, 20])]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where count in (10, 20)');
    });

    it('should parse expression with where in string values', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('events', 'in', ['triggered', 'closed'])]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where events in ("triggered", "closed")');
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
        'StormEvents' + '\n| where isActive == true' + '\n| where events in ("triggered", "closed")'
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
          '\n| where state == "TEXAS" or state == "FLORIDA"'
      );
    });
  });
});

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
