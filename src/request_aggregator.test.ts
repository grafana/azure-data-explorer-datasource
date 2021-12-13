import RequestAggregator from './request_aggregator';

describe('RequestAggregator', () => {
  let requestAggregator: RequestAggregator;
  const requestData = [
    { key: 'key1', url: 'url1', payload: {} },
    { key: 'key2', url: 'url2', payload: {} },
    { key: 'key1', url: 'url1', payload: {} },
    { key: 'key3', url: 'url3', payload: {} },
    { key: 'key4', url: 'url4', payload: {} },
    { key: 'key2', url: 'url2', payload: {} },
  ];

  describe('when ds request is successful', () => {
    beforeEach(() => {
      requestAggregator = new RequestAggregator({
        datasourceRequest: async () => new Promise((resolve) => setTimeout(() => resolve(), 100)),
      });
    });

    describe('and many requests are made', () => {
      let res;
      beforeEach(() => {
        res = requestData.map((r) => requestAggregator.dsPost(r.key, r.url, r.payload));
      });

      it('should aggregate requests where the keys are equal', () => {
        expect(Object.keys(requestAggregator.ongoingRequests).length).toBe(4);
      });

      it('should remove requests from ongoing requests when they are resolved', async () => {
        await Promise.all(res);
        expect(Object.keys(requestAggregator.ongoingRequests).length).toBe(0);
      });
    });
  });

  describe('when ds request is rejected', () => {
    const error = 'there was an error';
    beforeEach(() => {
      requestAggregator = new RequestAggregator({
        datasourceRequest: async () => new Promise((resolve, reject) => setTimeout(() => reject(error), 100)),
      });
    });

    describe('and many requests are made', () => {
      let res;
      beforeEach(() => {
        res = requestData.map((r) => requestAggregator.dsPost(r.key, r.url, r.payload));
      });

      it('should aggregate requests where the keys are equal', () => {
        expect(Object.keys(requestAggregator.ongoingRequests).length).toBe(4);
      });

      it('should throw an error when backend request was rejected', async () => {
        (await expect(Promise.all(res))).rejects.toThrow(error);
      });

      it('should remove the ongoing requests when backend request was rejected', async () => {
        Promise.all(res).then(() => expect(Object.keys(requestAggregator.ongoingRequests).length).toBe(0));
      });
    });
  });
});
