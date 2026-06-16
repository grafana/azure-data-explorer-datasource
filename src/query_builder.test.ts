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
    ['$test_single_var', { ...variableProps('test_single_var', { text: ['val1'] }) }],
    ['$test_multi_var', { ...variableProps('test_multi_var', { text: ['val1', 'val2'] }) }],
    ['$test_quoted_var', { ...variableProps('test_quoted_var', { text: ["'val1'"] }) }],
    ['$test_multi_quoted_var', { ...variableProps('test_multi_quoted_var', { text: ["'val1'", "'val2'"] }) }],
    [
      '$test_with_parentheses',
      { ...variableProps('test_with_parentheses', { text: ['test (with parentheses)', 'test without parentheses'] }) },
    ],
    [
      '$test_multi_statement_a',
      { ...variableProps('test_multi_statement_a', { text: ['test (with parentheses)', 'test without parentheses'] }) },
    ],
    [
      '$test_multi_statement_b',
      { ...variableProps('test_multi_statement_b', { text: ['test 2 (with parentheses)'] }) },
    ],
    [
      '$test_escape_single',
      { ...variableProps('test_escape_single', { text: ['\\grafana-vmNetwork(eth0)Total Bytes Received'] }) },
    ],
    [
      '$test_escape_multi',
      {
        ...variableProps('test_escape_multi', {
          text: ['\\grafana-vmNetwork(eth0)Total', '\\grafana-vmNetwork(eth0)Total'],
        }),
      },
    ],
    [
      '$test_escape_with_comma',
      { ...variableProps('test_escape_with_comma', { text: ['\\grafana-vm,Network(eth0)Total Bytes Received'] }) },
    ],
    [
      '$test_escape_multi_statement',
      { ...variableProps('test_escape_multi_statement', { text: ['\\grafana-vmNetwork(eth0)Total'] }) },
    ],
  ]);
  const interpolateVariable = jest.fn().mockImplementation((value: any) => {
    if (value.length === 1 && value[0] === 'All') {
      return value;
    } else {
      return value.map((val) => "'" + escapeSpecial(val) + "'").join(',');
    }
  });
  const containsReplace = jest.fn().mockImplementation((target: string, _scopedVars = undefined, format) => {
    if (target.includes('$')) {
      const split = target.split(',');
      const variable = split[1].trim();
      return `${split[0]}, ${format(variables.get(variable).text)}`;
    }
    return target;
  });
  const escapeReplace = jest.fn().mockImplementation((target: string, _scopedVars = undefined, format) => {
    if (target.includes('$')) {
      return format(variables.get(target).text);
    }
    return target;
  });
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
        const query = interpolateKustoQuery(
          `query=Tablename | where $__contains(col, $test_single_var)`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('val1')");
      });
    });

    describe('when $__contains and multi template variable has multiple selected values without quotes', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(
          `query=Tablename | where $__contains(col, $test_multi_var)`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('val1','val2')");
      });
    });

    describe('when $__contains and multi template variable has one selected value', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(
          `query=Tablename | where $__contains(col, $test_quoted_var)`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('\\'val1\\'')");
      });
    });

    describe('when $__contains and multi template variable has multiple selected values', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(
          `query=Tablename | where $__contains(col, $test_multi_quoted_var)`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('\\'val1\\'','\\'val2\\'')");
      });
    });

    describe('when $__contains and multi template variable contains parentheses', () => {
      it('should generate a where..in clause', () => {
        const query = interpolateKustoQuery(
          `query=Tablename | where $__contains(col, $test_with_parentheses)`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );

        expect(query).toContain("where col in ('test (with parentheses)','test without parentheses')");
      });
    });

    describe('when $__contains and multiple multi template variable with parentheses', () => {
      it('should generate multiple where..in clauses', () => {
        const query = interpolateKustoQuery(
          `query=Tablename | where $__contains(col, $test_multi_statement_a) | where $__contains(col2, $test_multi_statement_b)`,
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
        const query = interpolateKustoQuery(`$__escapeMulti($test_escape_single)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(`@'\\grafana-vmNetwork(eth0)Total Bytes Received'`);
      });
    });

    describe('when using $__escape and multi template variable has multiple selected values', () => {
      it('should replace $__escape(val) with multiple KQL style escaped string', () => {
        const query = interpolateKustoQuery(`CounterPath in ($__escapeMulti($test_escape_multi))`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(
          `CounterPath in (@'\\grafana-vmNetwork(eth0)Total', @'\\grafana-vmNetwork(eth0)Total')`
        );
      });
    });

    describe('when using $__escape and multi template variable has one selected value that contains comma', () => {
      it('should replace $__escape(val) with KQL style escaped string', () => {
        const query = interpolateKustoQuery(`$__escapeMulti($test_escape_with_comma)`, (val: string) =>
          templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(`@'\\grafana-vm,Network(eth0)Total Bytes Received'`);
      });
    });

    describe(`when using $__escape and multiple multi template variable`, () => {
      it('should correctly replace both macros', () => {
        const query = interpolateKustoQuery(
          `CounterPath in ($__escapeMulti($test_escape_multi_statement)) | CounterPath2 in ($__escapeMulti($test_escape_multi_statement))`,
          (val: string) => templateSrv.replace(val, undefined, interpolateVariable)
        );
        expect(query).toContain(
          `CounterPath in (@'\\grafana-vmNetwork(eth0)Total') | CounterPath2 in (@'\\grafana-vmNetwork(eth0)Total')`
        );
      });
    });
  });
});
