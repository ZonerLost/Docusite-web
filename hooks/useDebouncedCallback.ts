import { useMemo, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => any>(fn: T, delay = 500) {
  const t = useRef<number | undefined>();
  return useMemo(() => {
    return ((...args: Parameters<T>) => {
      window.clearTimeout(t.current);
      t.current = window.setTimeout(() => fn(...args), delay);
    }) as T;
  }, [fn, delay]);
}

