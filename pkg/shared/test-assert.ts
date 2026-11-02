import assert from 'node:assert/strict'
export { assert }
export function assertEquals(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  if (message === undefined) assert.deepStrictEqual(actual, expected)
  else assert.deepStrictEqual(actual, expected, message)
}
function matches(type?: new (...args: any[]) => Error, message?: string) {
  return (error: unknown): boolean => {
    assert(error instanceof (type ?? Error))
    if (message)
      assert(
        (error as Error).message.includes(message),
        (error as Error).message,
      )
    return true
  }
}
export function assertThrows(
  fn: () => unknown,
  type?: new (...args: any[]) => Error,
  message?: string,
) {
  assert.throws(fn, matches(type, message))
}
export async function assertRejects(
  fn: () => Promise<unknown>,
  type?: new (...args: any[]) => Error,
  message?: string,
) {
  await assert.rejects(fn, matches(type, message))
}
