const store: Record<string, any> = {};

export const cache = async <T>(key: string, resolver: () => Promise<T>): Promise<T> => {
  if (!store[key]) {
    const value = await resolver();
    store[key] = value;
  }
  return store[key];
};
