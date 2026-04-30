/**
 * Removes null/undefined values from a params object and converts all values to strings.
 * Useful for building query parameter objects for API calls.
 */
export function cleanParams(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value != null) result[key] = String(value)
  }
  return result
}
