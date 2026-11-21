/** Language-independent string order shared by the Feature list and the file list. */

/**
 * Compare two strings by Unicode code point, independent of the interface
 * language. This differs from `<`, which compares UTF-16 units, when an astral
 * character meets one in U+E000–U+FFFF.
 * @param a - the first string.
 * @param b - the second string.
 * @returns a negative number, zero, or a positive number, as `Array.prototype.sort` expects.
 */
export function compareCodePoints(a: string, b: string): number {
  const shorter = Math.min(a.length, b.length)
  for (let i = 0; i < shorter; i++) {
    // At the first differing code unit both strings agree on every earlier unit,
    // so `codePointAt` reads a whole character, or two low surrogates after the same high one.
    if (a.charCodeAt(i) !== b.charCodeAt(i)) return Number(a.codePointAt(i)) - Number(b.codePointAt(i))
  }
  return a.length - b.length
}
