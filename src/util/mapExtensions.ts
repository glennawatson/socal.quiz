declare global {
  interface Map<K, V> {
    getOrAdd(key: K, defaultValue: () => V): V | undefined;
  }
}

Map.prototype.getOrAdd = function <K, V>(
  this: Map<K, V>,
  key: K,
  defaultValue: () => V,
): V | undefined {
  if (this.has(key)) {
    return this.get(key); // Safe non-null assertion, since we checked with 'has'
  } else {
    const value = defaultValue();
    this.set(key, value);
    return value;
  }
};
