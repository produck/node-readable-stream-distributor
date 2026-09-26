// Guarantee: answers with a verdict and never throws. The judgement is
//   realm-local; a Proxy whose `getPrototypeOf` trap throws is `false`.
export function isReadableStream(value) {
  try {
    return value instanceof ReadableStream;
  } catch {
    return false;
  }
}
