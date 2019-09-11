import QueryBuilder from './query_builder';
import moment from 'moment';

describe('QueryBuilder', () => {
  let builder: QueryBuilder;

  beforeEach(function() {
    builder = new QueryBuilder('query=Tablename | where $__timeFilter(Timestamp)', {
      interval: '5m',
      range: {
        from: moment().subtract(24, 'hours'),
        to: moment(),
      },
      rangeRaw: {
        from: 'now-24h',
        to: 'now',
      },
    });
  });

  describe('when $__contains and multi template variable has custom All value', () => {
    beforeEach(() => {
      builder.rawQuery = 'query=Tablename | where $__contains(col, all)';
    });

    it('should generate a where..in clause', () => {
      const query = builder.interpolate().query;

      expect(query).toContain(`where 1 == 1`);
    });
  });

  describe('when $__contains and multi template variable has one selected value', () => {
    beforeEach(() => {
      builder.rawQuery = `query=Tablename | where $__contains(col, 'val1')`;
    });

    it('should generate a where..in clause', () => {
      const query = builder.interpolate().query;

      expect(query).toContain(`where col in ('val1')`);
    });
  });

  describe('when $__contains and multi template variable has multiple selected values', () => {
    beforeEach(() => {
      builder.rawQuery = `query=Tablename | where $__contains(col, 'val1','val2')`;
    });

    it('should generate a where..in clause', () => {
      const query = builder.interpolate().query;

      expect(query).toContain(`where col in ('val1','val2')`);
    });
  });

  describe('when using $__escape and multi template variable has one selected value', () => {
    beforeEach(() => {
      builder.rawQuery = `$__escapeMulti('\\grafana-vm\Network(eth0)\Total Bytes Received')`;
    });
    it('should replace $__escape(val) with KQL style escaped string', () => {
      const query = builder.interpolate().query;
      expect(query).toContain(`@'\\grafana-vmNetwork(eth0)Total Bytes Received'`);
    });
  });
  describe('when using $__escape and multi template variable has multiple selected values', () => {
    beforeEach(() => {
      builder.rawQuery = `CounterPath in ($__escapeMulti('\\grafana-vm\Network(eth0)\Total','\\grafana-vm\Network(eth0)\Total'))`;
    });
    it('should replace $__escape(val) with multiple KQL style escaped string', () => {
      const query = builder.interpolate().query;
      expect(query).toContain(`CounterPath in (@'\\grafana-vmNetwork(eth0)Total', @'\\grafana-vmNetwork(eth0)Total')`);
    });
  });
  describe('when using $__escape and multi template variable has one selected value that contains comma', () => {
    beforeEach(() => {
      builder.rawQuery = `$__escapeMulti('\\grafana-vm,\Network(eth0)\Total Bytes Received')`;
    });
    it('should replace $__escape(val) with KQL style escaped string', () => {
      const query = builder.interpolate().query;
      expect(query).toContain(`@'\\grafana-vm,Network(eth0)Total Bytes Received'`);
    });
  });
  describe(`when using $__escape and multi template variable value is not wrapped in single '`, () => {
    beforeEach(() => {
      builder.rawQuery = `$__escapeMulti(\\grafana-vm,\Network(eth0)\Total Bytes Received)`;
    });
    it('should not replace macro', () => {
      const query = builder.interpolate().query;
      expect(query).toContain(`$__escapeMulti(\\grafana-vm,Network(eth0)Total Bytes Received)`);
    });
  });
});
