import Cache from './cache';

describe('cache', () => {
  let cache;
  beforeEach(() => {
    cache = new Cache({ ttl: 100 });
  });

  describe('testing ttl', () => {
    beforeEach(() => {
      cache.put('some-key', 'some-value');
    });

    it('should contain the value immediately after it was added', () => {
      const res = cache.get('some-key');
      expect(res).toBe('some-value');
    });

    it('should not contain the value after ttl has passed', done => {
      setTimeout(() => {
        const res = cache.get('some-key');
        expect(res).toBeUndefined();
        done();
      }, 150);
    });
  });
  describe('testing delete', () => {
    beforeEach(() => {
      cache.put('some-key', 'some-value');
    });

    it('should not contain the value after delete', done => {
      const res = cache.del('some-key');
      expect(res).toBeUndefined();
    });
  });
});
