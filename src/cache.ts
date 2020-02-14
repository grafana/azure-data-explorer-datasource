interface CacheOptions {
  ttl: number;
}

export default class Cache {
  store: any;
  constructor(private opts: CacheOptions = { ttl: 10000 }) {
    this.store = {};
  }

  put(key, value, ttl = this.opts.ttl): void {
    if (key === undefined || value === undefined) {
      return;
    }

    this.del(key);
    this.store[key] = {
      value,
      expire: Date.now() + ttl,
      timeout: setTimeout(() => {
        this.del(key);
      }, ttl),
    };
  }

  get(key): any {
    let item = this.store[key];
    if (item && item.expire && item.expire <= Date.now()) {
      this.del(key);
      item = undefined;
    }

    return item && item.value;
  }

  del(key: string): void {
    if (this.store.hasOwnProperty(key)) {
      clearTimeout(this.store[key].timeout);
      delete this.store[key];
    }
  }
}
