/**
 * Narrows nullable query results after Jest expectations so callers avoid non-null assertions.
 */
export function assertFound<T>(value: T | null | undefined, label: string): T {
  expect(value).not.toBeNull();
  expect(value).not.toBeUndefined();
  if (value === null || value === undefined) {
    throw new Error(`${label}: expected a value`);
  }
  return value;
}

export function assertNonEmptySyncBatchId(
  value: string | null | undefined,
  label: string,
): string {
  expect(value).toEqual(expect.any(String));
  expect(value).not.toBe('');
  if (value === null || value === undefined || value === '') {
    throw new Error(`${label}: expected non-empty syncBatchId`);
  }
  return value;
}
