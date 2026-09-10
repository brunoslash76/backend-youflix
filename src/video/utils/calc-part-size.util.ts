const MIN_PART = 5 * 1024 * 1024; // 5MB
const TARGET_PART = 16 * 1024 * 1024; // 16MB

function calcPartSize(totalBytes: number): number {
  const minimumViable = Math.ceil(totalBytes / 10_000);
  return Math.max(TARGET_PART, minimumViable, MIN_PART);
}
