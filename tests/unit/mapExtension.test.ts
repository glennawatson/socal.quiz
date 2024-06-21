import { describe, it, expect, vi } from "vitest";
import "../../src/util/mapExtensions";

describe("Map.prototype.getOrAdd", () => {
  it("should return the existing value if the key is present", () => {
    const map = new Map<string, number>();
    map.set("key1", 42);

    const result = map.getOrAdd("key1", () => 99);
    expect(result).toBe(42);
  });

  it("should add and return the default value if the key is not present", () => {
    const map = new Map<string, number>();

    const result = map.getOrAdd("key2", () => 99);
    expect(result).toBe(99);
    expect(map.get("key2")).toBe(99);
  });

  it("should call the defaultValue function only if the key is not present", () => {
    const map = new Map<string, number>();
    const defaultValue = vi.fn(() => 99);

    map.getOrAdd("key3", defaultValue);
    expect(defaultValue).toHaveBeenCalledOnce();

    map.getOrAdd("key3", defaultValue);
    expect(defaultValue).toHaveBeenCalledOnce(); // should not be called again
  });

  it("should handle undefined values correctly", () => {
    const map = new Map<string, number | undefined>();
    map.set("key4", undefined);

    const result = map.getOrAdd("key4", () => 99);
    expect(result).toBeUndefined();
  });

  it("should work with complex objects as values", () => {
    const map = new Map<string, { name: string; age: number }>();

    const defaultValue = { name: "John", age: 30 };
    const result = map.getOrAdd("key5", () => defaultValue);

    expect(result).toEqual(defaultValue);
    expect(map.get("key5")).toEqual(defaultValue);
  });
});
