export function chunks<T>(inputArray: T[], perChunk: number) {
  const bulks: T[][] = [];
  for (let i = 0; i < Math.ceil(inputArray.length / perChunk); i++) {
    bulks.push(inputArray.slice(i * perChunk, (i + 1) * perChunk));
  }
  return bulks;
}
