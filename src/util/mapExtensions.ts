export {};

declare global {
  interface Map<K, V> {
    /**
     * Returns the value for the key if it exists, otherwise calls defaultValue(),
     * inserts the result, and returns it.
     */
    getOrAdd(key: K, defaultValue: () => V): V | undefined;
  }
}

Map.prototype.getOrAdd = function <K, V>(
  this: Map<K, V>,
  key: K,
  defaultValue: () => V,
): V | undefined {
  if (this.has(key)) {
    return this.get(key);
  } else {
    const value: V = defaultValue();
    this.set(key, value);
    return value;
  }
};
