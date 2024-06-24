import { describe, expect, it } from "vitest";
import { throwError } from "../../src/util/errorHelpers.js";

describe("throwError", () => {
  it("should throw an Error with the provided message", () => {
    const errorMessage = "This is a test error";

    // Assert that calling the function throws the correct error.
    expect(() => throwError(errorMessage)).toThrowError(errorMessage);
  });
});
