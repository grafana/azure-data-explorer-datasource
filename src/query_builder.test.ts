import interpolateKustoQuery from './query_builder';
import { TemplateSrv } from '@grafana/runtime';
import { escapeSpecial } from 'datasource';

describe('QueryBuilder', () => {
  const variableProps = (name: string, overrides?: any) => ({
    name,
    id: name,
    multi: true,
    includeAll: false,
    type: 'custom',
    ...overrides,
  });
  const variables = new Map<string, any>([
    ['$__all', { ...variableProps('__all', { text: ['All'] }) }],
    ['$test1', { ...variableProps('test1', { text: ['val1'] }) }],
    ['$test2', { ...variableProps('test2', { text: ['val1', 'val2'] }) }],
    ['$test3', { ...variableProps('test3', { text: ["'val1'"] }) }],
    ['$test4', { ...variableProps('test4', { text: ["'val1'", "'val2'"] }) }],
    ['$test5', { ...variableProps('test5', { text: ['test (with parentheses)', 'test without parentheses'] }) }],
    ['$test6_a', { ...variableProps('test6_a', { text: ['test (with parentheses)', 'test without parentheses'] }) }],
    ['$test6_b', { ...variableProps('test6_b', { text: ['test 2 (with parentheses)'] }) }],
  ]);
  const interpolateVariable = jest.fn().mockImplementation((value: any) => {
    if (value.length === 1 && value[0] === 'All') {
      return value;
    } else {
      return value.map((val) => "'" + escapeSpecial(val) + "'").join(',');
    }
  });
  const templateSrv: TemplateSrv = {
    replace: jest.fn().mockImplementation((target: string, _scopedVars = undefined, format) => {
      const split = target.split(',');
      const variable = split[1].trim();
      return `${split[0]}, ${format(variables.get(variable).text)}`;
    }),
    getVariables: jest.fn(),
    containsTemplate: jest.fn(),
    updateTimeRange: jest.fn(),
  };

  describe('when $__contains and multi template variable has custom All value', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(
        `query=Tablename | where $__contains(col, $__all)`,
        templateSrv,
        interpolateVariable
      );

      expect(query).toContain(`where 1 == 1`);
    });
  });

  describe('when $__contains and multi template variable has one selected value without quotes', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(
        `query=Tablename | where $__contains(col, $test1)`,
        templateSrv,
        interpolateVariable
      );

      expect(query).toContain("where col in ('val1')");
    });
  });

  describe('when $__contains and multi template variable has multiple selected values without quotes', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(
        `query=Tablename | where $__contains(col, $test2)`,
        templateSrv,
        interpolateVariable
      );

      expect(query).toContain("where col in ('val1','val2')");
    });
  });

  describe('when $__contains and multi template variable has one selected value', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(
        `query=Tablename | where $__contains(col, $test3)`,
        templateSrv,
        interpolateVariable
      );

      expect(query).toContain("where col in ('\\'val1\\'')");
    });
  });

  describe('when $__contains and multi template variable has multiple selected values', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(
        `query=Tablename | where $__contains(col, $test4)`,
        templateSrv,
        interpolateVariable
      );

      expect(query).toContain("where col in ('\\'val1\\'','\\'val2\\'')");
    });
  });

  describe('when $__contains and multi template variable contains parentheses', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(
        `query=Tablename | where $__contains(col, $test5)`,
        templateSrv,
        interpolateVariable
      );

      expect(query).toContain("where col in ('test (with parentheses)','test without parentheses')");
    });
  });

  describe('when $__contains and multiple multi template variable with parentheses', () => {
    it('should generate multiple where..in clauses', () => {
      const query = interpolateKustoQuery(
        `query=Tablename | where $__contains(col, $test6_a) | where $__contains(col2, $test6_b)`,
        templateSrv,
        interpolateVariable
      );

      expect(query).toContain(
        "where col in ('test (with parentheses)','test without parentheses') | where col2 in ('test 2 (with parentheses)')"
      );
    });
  });

  describe('when using $__escape and multi template variable has one selected value', () => {
    it('should replace $__escape(val) with KQL style escaped string', () => {
      const query = interpolateKustoQuery(
        `$__escapeMulti('\\grafana-vm\Network(eth0)\Total Bytes Received')`,
        templateSrv,
        interpolateVariable
      );
      expect(query).toContain(`@'\\grafana-vmNetwork(eth0)Total Bytes Received'`);
    });
  });
  describe('when using $__escape and multi template variable has multiple selected values', () => {
    it('should replace $__escape(val) with multiple KQL style escaped string', () => {
      const query = interpolateKustoQuery(
        `CounterPath in ($__escapeMulti('\\grafana-vm\Network(eth0)\Total','\\grafana-vm\Network(eth0)\Total'))`,
        templateSrv,
        interpolateVariable
      );
      expect(query).toContain(`CounterPath in (@'\\grafana-vmNetwork(eth0)Total', @'\\grafana-vmNetwork(eth0)Total')`);
    });
  });
  describe('when using $__escape and multi template variable has one selected value that contains comma', () => {
    it('should replace $__escape(val) with KQL style escaped string', () => {
      const query = interpolateKustoQuery(
        `$__escapeMulti('\\grafana-vm,\Network(eth0)\Total Bytes Received')`,
        templateSrv,
        interpolateVariable
      );
      expect(query).toContain(`@'\\grafana-vm,Network(eth0)Total Bytes Received'`);
    });
  });
  describe(`when using $__escape and multi template variable value is not wrapped in single '`, () => {
    it('should not replace macro', () => {
      const query = interpolateKustoQuery(
        `$__escapeMulti(\\grafana-vm,\Network(eth0)\Total Bytes Received)`,
        templateSrv,
        interpolateVariable
      );
      expect(query).toContain(`$__escapeMulti(\\grafana-vm,Network(eth0)Total Bytes Received)`);
    });
  });
});
