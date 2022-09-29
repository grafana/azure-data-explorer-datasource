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
    ['$test7', { ...variableProps('test7', { text: ['\\grafana-vmNetwork(eth0)Total Bytes Received'] }) }],
    [
      '$test8',
      { ...variableProps('test8', { text: ['\\grafana-vmNetwork(eth0)Total', '\\grafana-vmNetwork(eth0)Total'] }) },
    ],
    ['$test9', { ...variableProps('test9', { text: ['\\grafana-vm,Network(eth0)Total Bytes Received'] }) }],
    ['$test10', { ...variableProps('test10', { text: ['\\grafana-vm,Network(eth0)Total Bytes Received'] }) }],
    ['$test11', { ...variableProps('test11', { text: ['\\grafana-vmNetwork(eth0)Total'] }) }],
  ]);
  const interpolateVariable = jest.fn().mockImplementation((value: any) => {
    if (value.length === 1 && value[0] === 'All') {
      return value;
    } else {
      return value.map((val) => "'" + escapeSpecial(val) + "'").join(',');
    }
  });
  const containsReplace = jest.fn().mockImplementation((target: string, _scopedVars = undefined, format) => {
    const split = target.split(',');
    const variable = split[1].trim();
    return `${split[0]}, ${format(variables.get(variable).text)}`;
  });
  const escapeReplace = jest
    .fn()
    .mockImplementation((target: string, _scopedVars = undefined, format) => format(variables.get(target).text));
  const templateSrv: TemplateSrv = {
    replace: containsReplace,
    getVariables: jest.fn(),
    containsTemplate: jest.fn(),
    updateTimeRange: jest.fn(),
  };

  describe('$__contains tests', () => {
    describe('when $__contains and multi template variable has custom All value', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, $__all)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain(`where 1 == 1`);
      });
    });

    describe('when $__contains and multi template variable has one selected value without quotes', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, $test1)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('val1')");
      });
    });

    describe('when $__contains and multi template variable has multiple selected values without quotes', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, $test2)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('val1','val2')");
      });
    });

    describe('when $__contains and multi template variable has one selected value', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, $test3)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('\\'val1\\'')");
      });
    });

    describe('when $__contains and multi template variable has multiple selected values', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, $test4)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('\\'val1\\'','\\'val2\\'')");
      });
    });

    describe('when $__contains and multi template variable contains parentheses', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, $test5)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('test (with parentheses)','test without parentheses')");
      });
    });

    describe('when $__contains and multiple multi template variable with parentheses', () => {
      it('should generate multiple where..in clauses', () => {
        const query = interpolateKustoQuery(
          `query=Tablename | where $__contains(col, $test6_a) | where $__contains(col2, $test6_b)`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain(
          "where col in ('test (with parentheses)','test without parentheses') | where col2 in ('test 2 (with parentheses)')"
        );
      });
    });
  });

  describe('$__escape tests', () => {
    beforeAll(() => {
      templateSrv.replace = escapeReplace;
    });
    describe('when using $__escape and multi template variable has one selected value', () => {
      it('should replace $__escape(val) with KQL style escaped string', () => {
        templateSrv.replace = escapeReplace;
        const query = interpolateKustoQuery(`$__escapeMulti($test7)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(`@'\\grafana-vmNetwork(eth0)Total Bytes Received'`);
      });
    });
    describe('when using $__escape and multi template variable has multiple selected values', () => {
      it('should replace $__escape(val) with multiple KQL style escaped string', () => {
        const query = interpolateKustoQuery(`CounterPath in ($__escapeMulti($test8))`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(
          `CounterPath in (@'\\grafana-vmNetwork(eth0)Total', @'\\grafana-vmNetwork(eth0)Total')`
        );
      });
    });
    describe('when using $__escape and multi template variable has one selected value that contains comma', () => {
      it('should replace $__escape(val) with KQL style escaped string', () => {
        const query = interpolateKustoQuery(`$__escapeMulti($test9)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(`@'\\grafana-vm,Network(eth0)Total Bytes Received'`);
      });
    });
    describe(`when using $__escape and multiple multi template variable`, () => {
      it('should correctly replace both macros', () => {
        const query = interpolateKustoQuery(
          `CounterPath in ($__escapeMulti($test11)) | CounterPath2 in ($__escapeMulti($test11))`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(
          `CounterPath in (@'\\grafana-vmNetwork(eth0)Total') | CounterPath2 in (@'\\grafana-vmNetwork(eth0)Total')`
        );
      });
    });
  });
});
