import { RefObject, useEffect } from 'react';

type EventType = MouseEvent | TouchEvent;

type UseClickOutsideOptions = {
  enabled?: boolean;
  ignoreRefs?: Array<RefObject<HTMLElement>>;
};

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: EventType) => void,
  options?: UseClickOutsideOptions
): void {
  const enabled = options?.enabled ?? true;
  const ignoreRefs = options?.ignoreRefs ?? [];

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: EventType) => {
      const el = ref.current;
      const target = event.target as Node;
      if (!el || el.contains(target)) return;
      const isIgnored = ignoreRefs.some((ignoreRef) => ignoreRef.current?.contains(target));
      if (isIgnored) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    const touchOptions: AddEventListenerOptions = { passive: false };
    document.addEventListener('touchstart', listener, touchOptions);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener, touchOptions);
    };
  }, [enabled, handler, ignoreRefs, ref]);
}
