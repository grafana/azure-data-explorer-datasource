import QueryBuilder from './query_builder';
import moment from 'moment';

describe('QueryBuilder', () => {
  let builder: QueryBuilder;

  beforeEach(function() {
    builder = new QueryBuilder(
      'query=Tablename | where $__timeFilter(Timestamp)',
      {
        interval: '5m',
        range: {
          from: moment().subtract(24, 'hours'),
          to: moment()
        },
        rangeRaw: {
          from: 'now-24h',
          to: 'now'
        }
      },
    );
  });

  describe('when $__timeFilter has a column parameter', () => {
    it('should generate a time filter condition with myTime as the datetime field', () => {
      const query = builder.interpolate().query;

      expect(query).toContain('where Timestamp >= datetime(');
    });
  });

  describe('when $__interval is in the query', () => {
    beforeEach(() => {
      builder.rawQuery = 'query=Tablename | summarize count() by Category, bin(TimeGenerated, $__interval)';
    });

    it('should replace $__interval with the inbuilt interval option', () => {
      const query = builder.interpolate().query;

      expect(query).toContain('bin(TimeGenerated, 5m');
    });
  });

  describe('when using $__from and $__to is in the query and range is until now', () => {
    beforeEach(() => {
      builder.rawQuery = 'query=Tablename | where myTime >= $__from and myTime <= $__to';
    });

    it('should replace $__from and $__to with a datetime and the now() function', () => {
      const query = builder.interpolate().query;

      expect(query).toContain('where myTime >= datetime(');
      expect(query).toContain('myTime <= now()');
    });
  });

  describe('when using $__from and $__to is in the query and range is a specific interval', () => {
    beforeEach(() => {
      builder.rawQuery = 'query=Tablename | where myTime >= $__from and myTime <= $__to';
      builder.options.range.to = moment().subtract(1, 'hour');
      builder.options.rangeRaw.to = 'now-1h';
    });

    it('should replace $__from and $__to with datetimes', () => {
      const query = builder.interpolate().query;

      expect(query).toContain('where myTime >= datetime(');
      expect(query).toContain('myTime <= datetime(');
    });
  });
});
