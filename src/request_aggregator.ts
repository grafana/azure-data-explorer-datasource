export default class RequestAggregator {
  ongoingRequests: any;
  constructor(private backendSrv) {
    this.ongoingRequests = {};
  }

  async doRequest(url, data, maxRetries = 1): Promise<any> {
    return this.backendSrv
      .datasourceRequest({
        url,
        method: 'POST',
        data,
      })
      .catch((error) => {
        if (maxRetries > 0) {
          return this.doRequest(url, data, maxRetries - 1);
        }

        throw error;
      });
  }

  async dsPost(key, url, payload): Promise<any> {
    if (this.ongoingRequests.hasOwnProperty(key)) {
      return this.ongoingRequests[key];
    } else {
      this.ongoingRequests[key] = new Promise(async (resolve, reject) => {
        try {
          const response = await this.doRequest(url, payload);
          resolve(response);
        } catch (error) {
          reject(error);
        } finally {
          delete this.ongoingRequests[key];
        }
      });
      return this.ongoingRequests[key];
    }
  }
}
