const store: Record<string, any> = {};

export const cache = async <T>(key: string, resolver: () => Promise<T>, refresh = false): Promise<T> => {
  if (!store[key] || refresh) {
    const value = await resolver();
    store[key] = value;
  }
  return store[key];
};

export const reset = (keysStartingWith: string): void => {
  const keys = Object.keys(store);

  for (const key of keys) {
    if (key.startsWith(keysStartingWith)) {
      delete store[key];
    }
  }
};
