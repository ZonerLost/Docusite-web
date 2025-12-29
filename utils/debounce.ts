export type DebouncedFn<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
};

export function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number): DebouncedFn<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const argsToUse = lastArgs;
      timeoutId = undefined;
      lastArgs = null;
      if (argsToUse) fn(...argsToUse);
    }, waitMs);
  }) as DebouncedFn<T>;

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = undefined;
    lastArgs = null;
  };

  debounced.flush = () => {
    if (!timeoutId || !lastArgs) return;
    const argsToUse = lastArgs;
    clearTimeout(timeoutId);
    timeoutId = undefined;
    lastArgs = null;
    fn(...argsToUse);
  };

  debounced.pending = () => typeof timeoutId !== 'undefined';

  return debounced;
}
