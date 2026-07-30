const $source = Symbol('.$source');
const $reader = Symbol('.$reader');
const $buffer = Symbol('.$buffer');
const $bufferSize = Symbol('.$bufferSize');
const $copies = Symbol('.$copies');
const $fileHandle = Symbol('.$fileHandle');
const $tmpfilePath = Symbol('.$tmpfilePath');
const $committedChunks = Symbol('.$committedChunks');
const $inFilePhase = Symbol('.$inFilePhase');
const $destroyed = Symbol('.$destroyed');
const $pulling = Symbol('.$pulling');
const $sourceDone = Symbol('.$sourceDone');
const $sourceError = Symbol('.$sourceError');
const $totalChunks = Symbol('.$totalChunks');

export const $ = Object.freeze({
  source: $source,
  reader: $reader,
  buffer: $buffer,
  bufferSize: $bufferSize,
  copies: $copies,
  fileHandle: $fileHandle,
  tmpfilePath: $tmpfilePath,
  committedChunks: $committedChunks,
  inFilePhase: $inFilePhase,
  destroyed: $destroyed,
  pulling: $pulling,
  sourceDone: $sourceDone,
  sourceError: $sourceError,
  totalChunks: $totalChunks,
});
