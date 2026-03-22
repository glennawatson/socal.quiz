/**
 * Throws an Error with the given message. Used as an expression in nullish coalescing chains.
 *
 * @param message - The error message to throw.
 */
export function throwError(message: string): never {
  throw new Error(message);
}
