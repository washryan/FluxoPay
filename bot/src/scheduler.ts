export async function runSequentialCycles(
  run: () => Promise<void>,
  wait: (signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
) {
  while (!signal.aborted) {
    await run();
    if (!signal.aborted) await wait(signal);
  }
}
