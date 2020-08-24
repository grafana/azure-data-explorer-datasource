import interpolateKustoQuery from './query_builder';

describe('QueryBuilder', () => {
  describe('when $__contains and multi template variable has custom All value', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery('query=Tablename | where $__contains(col, all)');

      expect(query).toContain(`where 1 == 1`);
    });
  });

  describe('when $__contains and multi template variable has one selected value without quotes', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, val1)`);

      expect(query).toContain(`where col in ('val1')`);
    });
  });

  describe('when $__contains and multi template variable has multiple selected values without quotes', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, val1,val2)`);

      expect(query).toContain(`where col in ('val1','val2')`);
    });
  });

  describe('when $__contains and multi template variable has one selected value', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, 'val1')`);

      expect(query).toContain(`where col in ('val1')`);
    });
  });

  describe('when $__contains and multi template variable has multiple selected values', () => {
    it('should generate a where..in clause', () => {
      const query = interpolateKustoQuery(`query=Tablename | where $__contains(col, 'val1','val2')`);

      expect(query).toContain(`where col in ('val1','val2')`);
    });
  });

  describe('when using $__escape and multi template variable has one selected value', () => {
    it('should replace $__escape(val) with KQL style escaped string', () => {
      const query = interpolateKustoQuery(`$__escapeMulti('\\grafana-vm\Network(eth0)\Total Bytes Received')`);
      expect(query).toContain(`@'\\grafana-vmNetwork(eth0)Total Bytes Received'`);
    });
  });
  describe('when using $__escape and multi template variable has multiple selected values', () => {
    it('should replace $__escape(val) with multiple KQL style escaped string', () => {
      const query = interpolateKustoQuery(
        `CounterPath in ($__escapeMulti('\\grafana-vm\Network(eth0)\Total','\\grafana-vm\Network(eth0)\Total'))`
      );
      expect(query).toContain(`CounterPath in (@'\\grafana-vmNetwork(eth0)Total', @'\\grafana-vmNetwork(eth0)Total')`);
    });
  });
  describe('when using $__escape and multi template variable has one selected value that contains comma', () => {
    it('should replace $__escape(val) with KQL style escaped string', () => {
      const query = interpolateKustoQuery(`$__escapeMulti('\\grafana-vm,\Network(eth0)\Total Bytes Received')`);
      expect(query).toContain(`@'\\grafana-vm,Network(eth0)Total Bytes Received'`);
    });
  });
  describe(`when using $__escape and multi template variable value is not wrapped in single '`, () => {
    it('should not replace macro', () => {
      const query = interpolateKustoQuery(`$__escapeMulti(\\grafana-vm,\Network(eth0)\Total Bytes Received)`);
      expect(query).toContain(`$__escapeMulti(\\grafana-vm,Network(eth0)Total Bytes Received)`);
    });
  });
});
