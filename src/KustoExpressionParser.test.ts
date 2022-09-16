import { DYNAMIC_TYPE_ARRAY_DELIMITER, KustoExpressionParser } from './KustoExpressionParser';
import { QueryEditorPropertyType } from './schema/types';
import { TemplateSrv } from '@grafana/runtime';
import {
  QueryEditorPropertyExpression,
  QueryEditorOperatorExpression,
  QueryEditorExpressionType,
  QueryEditorArrayExpression,
  QueryEditorExpression,
  QueryEditorReduceExpression,
  QueryEditorGroupByExpression,
  QueryEditorFunctionParameterExpression,
} from './components/LegacyQueryEditor/editor/expressions';
import { AdxColumnSchema, AutoCompleteQuery, defaultQuery, QueryExpression } from 'types';

describe('KustoExpressionParser', () => {
  const templateSrv: TemplateSrv = {
    getVariables: jest.fn(),
    replace: jest.fn(),
    containsTemplate: jest.fn(),
    updateTimeRange: jest.fn(),
  };
  const parser = new KustoExpressionParser(templateSrv);

  describe('toAutoCompleteQuery', () => {
    it('should parse expression with isnotempty function', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('eventType', '==', '')]),
      });

      const acQuery: AutoCompleteQuery = {
        expression,
        search: createOperator('eventType', 'isnotempty', ''),
        index: '0',
        database: 'Samples',
      };

      expect(parser.toAutoCompleteQuery(acQuery)).toEqual(
        'StormEvents' + '\n| where isnotempty(eventType)' + '\n| take 50000' + '\n| distinct eventType' + '\n| take 251'
      );
    });

    it('should parse expression and exclude current filter index', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('eventType', '==', 'ThunderStorm'), createOperator('state', '==', '')]),
      });

      const acQuery: AutoCompleteQuery = {
        expression,
        search: createOperator('state', 'contains', 'TEXAS'),
        index: '1',
        database: 'Samples',
      };

      expect(parser.toAutoCompleteQuery(acQuery)).toEqual(
        'StormEvents' +
          "\n| where eventType == 'ThunderStorm'" +
          "\n| where state contains 'TEXAS'" +
          '\n| take 50000' +
          '\n| distinct state' +
          '\n| take 251'
      );
    });

    it('should parse expression and exclude current filter index when nested', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([
          createOperator('eventType', '==', 'ThunderStorm'),
          createArray(
            [createOperator('state', '==', ''), createOperator('eventType', '==', 'Ligthning')],
            QueryEditorExpressionType.Or
          ),
        ]),
      });

      const acQuery: AutoCompleteQuery = {
        expression,
        search: createOperator('state', 'contains', 'TEXAS'),
        index: '1-0',
        database: 'Samples',
      };

      expect(parser.toAutoCompleteQuery(acQuery)).toEqual(
        'StormEvents' +
          "\n| where eventType == 'ThunderStorm'" +
          "\n| where state contains 'TEXAS' or eventType == 'Ligthning'" +
          '\n| take 50000' +
          '\n| distinct state' +
          '\n| take 251'
      );
    });

    it('should parse expression and with search column being dynamic', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([
          createOperator('eventType', '==', 'ThunderStorm'),
          createArray(
            [createOperator('column["type"]', '==', ''), createOperator('eventType', '==', 'Ligthning')],
            QueryEditorExpressionType.Or
          ),
        ]),
      });

      const acQuery: AutoCompleteQuery = {
        expression,
        search: createOperator('column["type"]', 'contains', 'TEXAS'),
        index: '1-0',
        database: 'Samples',
      };

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
      ];

      expect(parser.toAutoCompleteQuery(acQuery, tableSchema)).toEqual(
        'StormEvents' +
          "\n| where eventType == 'ThunderStorm'" +
          "\n| where column[\"type\"] contains 'TEXAS' or eventType == 'Ligthning'" +
          '\n| take 50000' +
          '\n| distinct tostring(column["type"])' +
          '\n| take 251'
      );
    });

    it('should parse expression and use default time value as time filter', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([
          createOperator('eventType', '==', 'ThunderStorm'),
          createArray(
            [createOperator('column["type"]', '==', ''), createOperator('eventType', '==', 'Ligthning')],
            QueryEditorExpressionType.Or
          ),
        ]),
      });

      const acQuery: AutoCompleteQuery = {
        expression,
        search: createOperator('column["type"]', 'contains', 'TEXAS'),
        index: '1-0',
        database: 'Samples',
      };

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toAutoCompleteQuery(acQuery, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          "\n| where eventType == 'ThunderStorm'" +
          "\n| where column[\"type\"] contains 'TEXAS' or eventType == 'Ligthning'" +
          '\n| take 50000' +
          '\n| distinct tostring(column["type"])' +
          '\n| take 251'
      );
    });

    it('should parse expression and exclude current filter with spaces', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([
          createOperator('event type', '==', 'ThunderStorm'),
          createOperator('state name', '==', ''),
        ]),
      });

      const acQuery: AutoCompleteQuery = {
        expression,
        search: createOperator('state name', 'contains', 'TEXAS'),
        index: '1',
        database: 'Samples',
      };

      expect(parser.toAutoCompleteQuery(acQuery)).toEqual(
        'StormEvents' +
          '\n| where ["event type"] == \'ThunderStorm\'' +
          '\n| where ["state name"] contains \'TEXAS\'' +
          '\n| take 50000' +
          '\n| distinct ["state name"]' +
          '\n| take 251'
      );
    });
  });

  describe('toQuery', () => {
    it('should parse expression with where equal to string value', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('eventType', '==', 'ThunderStorm')]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + "\n| where eventType == 'ThunderStorm'");
    });

    it('should parse where operator with a space', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('event type', '==', 'ThunderStorm')]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where ["event type"] == \'ThunderStorm\'');
    });

    it('should parse reduce expression with a space', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        reduce: createArray([createReduce('reduce thing', 'none')]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| project ["reduce thing"]');
    });

    it('should parse reduce with a function expression with a space', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        reduce: createArray([createReduce('reduce thing 2', 'sum')]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| summarize sum(["reduce thing 2"])');
    });

    it('should parse reduce with a function expression with a space and a dynamic column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        reduce: createArray([createReduce('reduce thing', 'sum')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'reduce thing',
          CslType: 'long',
          isDynamic: true,
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' + '\n| summarize sum(tolong(["reduce thing"]))'
      );
    });

    it('should parse a expression with spaces in multiple places', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('event type', '==', 'ThunderStorm')]),
        reduce: createArray([createReduce('reduce thing', 'sum')]),
        groupBy: createArray([createGroupBy('Start Time', '1h')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(["Start Time"])' +
          '\n| where ["event type"] == \'ThunderStorm\'' +
          '\n| summarize sum(["reduce thing"]) by bin(["Start Time"], 1h)' +
          '\n| order by ["Start Time"] asc'
      );
    });

    it('should parse an expression with a table name that contains special characters', () => {
      const expression = createQueryExpression({
        from: createProperty('events.all'),
      });

      expect(parser.toQuery(expression)).toEqual("['events.all']");
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

      expect(parser.toQuery(expression)).toEqual('StormEvents' + "\n| where events in ('triggered', 'closed')");
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
        'StormEvents' + '\n| where isActive == true' + "\n| where events in ('triggered', 'closed')"
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
          "\n| where events in ('triggered', 'closed')" +
          "\n| where state == 'TEXAS' or state == 'FLORIDA'"
      );
    });

    it('should parse expression with empty where filter', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', '')]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + "\n| where isActive == ''");
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
          `\n| order by StartTime asc`
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
          `\n| order by StartTime asc`
      );
    });

    it('should parse expression with time filter when schema contains dynamic time columns', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'Column["StartTime"]',
          CslType: 'datetime',
          isDynamic: true,
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where todatetime(Column["StartTime"]) between ($__timeFrom .. $__timeTo)' +
          '\n| where isActive == true' +
          `\n| order by todatetime(Column["StartTime"]) asc`
      );
    });

    it('should parse expression with time filter when schema contains combination of dynamic time columns and regular', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('isActive', '==', true)]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'Column["StartTime"]',
          CslType: 'datetime',
          isDynamic: true,
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
          `\n| order by SavedTime asc`
      );
    });

    it('should parse expression with when filter on dynamic column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + '\n| where column["isActive"] == true');
    });

    it('should parse expression with summarize of sum(active)', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('active', 'sum')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where column["isActive"] == true' + `\n| summarize sum(active)`
      );
    });

    it('should parse expression with summarize of count', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('active', 'count')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where column["isActive"] == true' + `\n| summarize count()`
      );
    });

    it('should parse expression with summarize of count', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('', 'count')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where column["isActive"] == true' + `\n| summarize count()`
      );
    });

    it('should parse expression with summarize of multiple count', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('active', 'count'), createReduce('total', 'count')]),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' + '\n| where column["isActive"] == true' + `\n| summarize count()`
      );
    });

    it('should parse expression with summarize of sum with cast to double on dynamic column with integer and double types', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('column["level"]["active"]', 'sum')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
        },
        {
          Name: 'column["level"]["active"]',
          CslType: 'double',
          isDynamic: true,
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where column["isActive"] == true' +
          `\n| summarize sum(todouble(column["level"]["active"]))`
      );
    });

    it('should parse expression with project when no group by and no reduce functions', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('column["level"]["active"]', 'none'), createReduce('active', 'none')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["isActive"] == true' +
          `\n| project toint(column["level"]["active"]), active`
      );
    });

    it('should parse expression with summarize when no group by and mixed none and reduce functions', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('column["level"]["active"]', 'sum'), createReduce('active', 'none')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["isActive"] == true' +
          `\n| summarize sum(toint(column["level"]["active"]))`
      );
    });

    it('should parse expression to summarize and bin size when it has group by and reduce functions', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        reduce: createArray([createReduce('column["level"]["active"]', 'sum')]),
        groupBy: createArray([createGroupBy('StartTime', '1h')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["isActive"] == true' +
          `\n| summarize sum(toint(column["level"]["active"])) by bin(StartTime, 1h)` +
          `\n| order by StartTime asc`
      );
    });

    it('should parse expression to summarize and bin size when it has group by', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        groupBy: createArray([createGroupBy('StartTime', '1h')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["isActive"] == true' +
          `\n| summarize by bin(StartTime, 1h)` +
          `\n| order by StartTime asc`
      );
    });

    it('should parse expression to summarize and bin size when it has group by multiple fields', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        groupBy: createArray([createGroupBy('StartTime', '1h'), createGroupBy('type')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["isActive"] == true' +
          `\n| summarize by bin(StartTime, 1h), type` +
          `\n| order by StartTime asc`
      );
    });

    it('should parse expression and replace default time column with group by time if available', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        groupBy: createArray([createGroupBy('EndTime', '1h'), createGroupBy('type')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
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
          '\n| where column["isActive"] == true' +
          `\n| summarize by bin(EndTime, 1h), type` +
          `\n| order by EndTime asc`
      );
    });

    it('should parse expression and replace default time column with group by as dynamic column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        groupBy: createArray([createGroupBy('column["EndTime"]', '1h'), createGroupBy('type')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["level"]["active"]',
          CslType: 'int',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
        {
          Name: 'column["EndTime"]',
          CslType: 'datetime',
          isDynamic: true,
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where todatetime(column["EndTime"]) between ($__timeFrom .. $__timeTo)' +
          '\n| where column["isActive"] == true' +
          `\n| summarize by bin(todatetime(column["EndTime"]), 1h), type` +
          `\n| order by todatetime(column["EndTime"]) asc`
      );
    });

    it('should parse expression and summarize by dynamic column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["isActive"]', '==', true)]),
        groupBy: createArray([createGroupBy('column["type"]')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["isActive"] == true' +
          `\n| summarize by tostring(column["type"])`
      );
    });

    it('should parse expression with template variable', () => {
      const templateSrv: TemplateSrv = {
        getVariables: jest.fn().mockReturnValue([
          {
            id: 'country',
            current: {
              text: 'usa',
              value: 'USA',
            },
            multi: false,
          },
        ]),
        replace: jest.fn(),
        containsTemplate: jest.fn(),
        updateTimeRange: jest.fn(),
      };

      const parser = new KustoExpressionParser(templateSrv);

      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["country"]', '==', '$country')]),
        groupBy: createArray([createGroupBy('column["type"]')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["country"] == $country' +
          `\n| summarize by tostring(column["type"])`
      );
    });

    it('should parse expression with template variable as an object', () => {
      const templateSrv: TemplateSrv = {
        getVariables: jest.fn().mockReturnValue([
          {
            id: 'country',
            current: {
              text: 'usa',
              value: 'USA',
            },
            multi: false,
          },
        ]),
        replace: jest.fn(),
        containsTemplate: jest.fn(),
        updateTimeRange: jest.fn(),
      };

      const parser = new KustoExpressionParser(templateSrv);

      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["country"]', '==', { label: '$country', value: `'$country'` })]),
        groupBy: createArray([createGroupBy('column["type"]')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["country"] == \'$country\'' +
          `\n| summarize by tostring(column["type"])`
      );
    });

    it('should parse expression with summarize function that takes a parameter', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["country"]', '==', 'sweden')]),
        reduce: createArray([createReduceWithParameter('amount', 'percentile', [1])]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["country"] == \'sweden\'' +
          `\n| summarize percentile(amount, 1)`
      );
    });

    it('should parse expression with summarize function that takes multiple parameter', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["country"]', '==', 'sweden')]),
        reduce: createArray([createReduceWithParameter('amount', 'percentile', [1, 2])]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["country"] == \'sweden\'' +
          `\n| summarize percentile(amount, 1, 2)`
      );
    });

    it('should parse expression with summarize function that takes a parameter', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["country"]', '==', 'sweden')]),
        reduce: createArray([createReduceWithParameter('amount', 'percentile', [1])]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["country"] == \'sweden\'' +
          `\n| summarize percentile(amount, 1)`
      );
    });

    it('should parse expression with summarize function that takes multiple parameter of different types', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('column["country"]', '==', 'sweden')]),
        reduce: createArray([createReduceWithParameter('amount', 'percentile', [1, '2'])]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["type"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| where column["country"] == \'sweden\'' +
          `\n| summarize percentile(amount, 1, '2')`
      );
    });

    it('should parse expression with summarize function in an array', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        reduce: createArray([createReduceWithParameter('column["`indexer`"]', 'percentile', [1, '2'])]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["`indexer`"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| mv-expand array_1 = column' +
          `\n| summarize percentile(tostring(array_1), 1, '2')`
      );
    });

    it('should parse expression with summarize function in a nested array', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        reduce: createArray([
          createReduceWithParameter('column["`indexer`"]["foo"]["`indexer`"]', 'percentile', [1, '2']),
        ]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["`indexer`"]["foo"]["`indexer`"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| mv-expand array_1 = column' +
          '\n| mv-expand array_2 = array_1["foo"]' +
          `\n| summarize percentile(tostring(array_2), 1, '2')`
      );
    });

    it('should parse expression with timeshift', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('country', '==', 'sweden')]),
        timeshift: createProperty('2d'),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where StartTime between (($__timeFrom - 2d) .. ($__timeTo - 2d))' +
          "\n| where country == 'sweden'" +
          `\n| extend StartTime = StartTime + 2d` +
          `\n| order by StartTime asc`
      );
    });

    it('should parse expression with timeshift without any time column', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('country', '==', 'sweden')]),
        timeshift: createProperty('2d'),
      });

      expect(parser.toQuery(expression)).toEqual('StormEvents' + "\n| where country == 'sweden'");
    });

    it('should parse expression with timeshift without any valid timeshift value', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('country', '==', 'sweden')]),
        timeshift: createProperty('100timmar'),
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
          "\n| where country == 'sweden'" +
          `\n| order by StartTime asc`
      );
    });

    it('should parse expression with isnotempty operator', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('country', 'isnotempty', '')]),
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
          '\n| where isnotempty(country)' +
          `\n| order by StartTime asc`
      );
    });

    it('should parse expression with empty where array', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([]),
        reduce: createArray([createReduce('country', 'dcount')]),
        groupBy: createArray([createGroupBy('continents')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' + '\n| where $__timeFilter(StartTime)' + '\n| summarize dcount(country) by continents'
      );
    });

    it('should parse expression with where array containg empty or', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createArray([], QueryEditorExpressionType.Or)]),
        reduce: createArray([createReduce('country', 'dcount')]),
        groupBy: createArray([createGroupBy('continents')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' + '\n| where $__timeFilter(StartTime)' + '\n| summarize dcount(country) by continents'
      );
    });

    it('should parse expression with where array containg empty operators', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray([createOperator('', '', '')]),
        reduce: createArray([createReduce('country', 'dcount')]),
        groupBy: createArray([createGroupBy('continents')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' + '\n| where $__timeFilter(StartTime)' + '\n| summarize dcount(country) by continents'
      );
    });

    it('should parse expression with schema mappings for function', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents($__from, $__to)'),
        where: createArray([createOperator('', '', '')]),
        reduce: createArray([createReduce('country', 'dcount')]),
        groupBy: createArray([createGroupBy('continents')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents($__from, $__to)' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| summarize dcount(country) by continents'
      );
    });

    it('should parse expression with a grouped array', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        groupBy: createArray([createGroupBy('column["`indexer`"]')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["`indexer`"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| mv-expand array_1 = column' +
          '\n| summarize by tostring(array_1)'
      );
    });

    it('should parse expression with a grouped nested array', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        groupBy: createArray([createGroupBy('column["`indexer`"]["foo"]["`indexer`"]')]),
      });

      const tableSchema: AdxColumnSchema[] = [
        {
          Name: 'column["`indexer`"]["foo"]["`indexer`"]',
          CslType: 'string',
          isDynamic: true,
        },
        {
          Name: 'StartTime',
          CslType: 'datetime',
        },
      ];

      expect(parser.toQuery(expression, tableSchema)).toEqual(
        'StormEvents' +
          '\n| where $__timeFilter(StartTime)' +
          '\n| mv-expand array_1 = column' +
          '\n| mv-expand array_2 = array_1["foo"]' +
          '\n| summarize by tostring(array_2)'
      );
    });

    it('should parse expression with an array', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray(
          [createOperator(`eventType${DYNAMIC_TYPE_ARRAY_DELIMITER}`, '==', 'ThunderStorm')],
          QueryEditorExpressionType.Or
        ),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' +
          '\n| mv-expand array_1 = eventType' +
          "\n| where array_1 == 'ThunderStorm'" +
          '\n| project-away array_1'
      );
    });

    it('should parse expression with an array and other "or" operators', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray(
          [
            createOperator(`eventType${DYNAMIC_TYPE_ARRAY_DELIMITER}`, '==', 'ThunderStorm'),
            createOperator(`foo`, '==', 'bar'),
          ],
          QueryEditorExpressionType.Or
        ),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' +
          '\n| mv-expand array_1 = eventType' +
          "\n| where array_1 == 'ThunderStorm' or foo == 'bar'" +
          '\n| project-away array_1'
      );
    });

    it('should parse expression with nested arrays', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray(
          [
            createOperator(
              `eventType${DYNAMIC_TYPE_ARRAY_DELIMITER}["obj"]${DYNAMIC_TYPE_ARRAY_DELIMITER}`,
              '==',
              'ThunderStorm'
            ),
          ],
          QueryEditorExpressionType.Or
        ),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' +
          '\n| mv-expand array_1 = eventType' +
          '\n| mv-expand array_2 = array_1["obj"]' +
          "\n| where array_2 == 'ThunderStorm'" +
          '\n| project-away array_1, array_2'
      );
    });

    it('should parse expression with an array and other "or" operators', () => {
      const expression = createQueryExpression({
        from: createProperty('StormEvents'),
        where: createArray(
          [
            createOperator(
              `eventType${DYNAMIC_TYPE_ARRAY_DELIMITER}["obj"]${DYNAMIC_TYPE_ARRAY_DELIMITER}`,
              '==',
              'ThunderStorm'
            ),
            createOperator(`foo`, '==', 'bar'),
          ],
          QueryEditorExpressionType.Or
        ),
      });

      expect(parser.toQuery(expression)).toEqual(
        'StormEvents' +
          '\n| mv-expand array_1 = eventType' +
          '\n| mv-expand array_2 = array_1["obj"]' +
          "\n| where array_2 == 'ThunderStorm' or foo == 'bar'" +
          '\n| project-away array_1, array_2'
      );
    });
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

const createReduceWithParameter = (column: string, func: string, params: any[]): QueryEditorReduceExpression => {
  const reduce = createReduce(column, func);
  reduce.parameters = params.map((v) => {
    const param: QueryEditorFunctionParameterExpression = {
      type: QueryEditorExpressionType.FunctionParameter,
      fieldType: valueToPropertyType(v),
      value: v,
      name: func,
    };

    return param;
  });

  return reduce;
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
  type: QueryEditorExpressionType = QueryEditorExpressionType.And
): QueryEditorArrayExpression => {
  return {
    type,
    expressions,
  };
};
