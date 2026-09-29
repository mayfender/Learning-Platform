import { useRef } from 'react';

export interface UseLongPressOptions {
  ms: number;
  moveTolerancePx?: number;
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function useLongPress(
  onLongPress: () => void,
  options: UseLongPressOptions,
): LongPressHandlers {
  const { ms, moveTolerancePx = 10 } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startRef = useRef<{ x: number; y: number } | undefined>(undefined);

  function clear(): void {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    startRef.current = undefined;
  }

  function onPointerDown(e: React.PointerEvent): void {
    startRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      onLongPress();
      clear();
    }, ms);
  }

  function onPointerMove(e: React.PointerEvent): void {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > moveTolerancePx) {
      clear();
    }
  }

  function onPointerUp(): void {
    clear();
  }

  function onPointerCancel(): void {
    clear();
  }

  function onPointerLeave(): void {
    clear();
  }

  function onContextMenu(e: React.MouseEvent): void {
    e.preventDefault();
  }

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onPointerMove,
    onContextMenu,
  };
}
