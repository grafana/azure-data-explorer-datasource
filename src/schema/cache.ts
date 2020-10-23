const store: Record<string, any> = {};

export const cache = async <T>(key: string, resolver: () => Promise<T>, refresh = false): Promise<T> => {
  if (!store[key] || refresh) {
    const value = await resolver();
    store[key] = value;
  }
  return store[key];
};
