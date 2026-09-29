import { useEffect, useRef, useState } from 'react';
import type { ManipulativeBaseProps } from '@/manipulatives/types';
import { useReducedMotion } from '@/ui/useReducedMotion';

export interface TenFrameProps extends ManipulativeBaseProps {
  filled: number;
  colorMode?: 'single' | 'split-5';
}

const SIZE_WIDTH: Record<NonNullable<TenFrameProps['size']>, string> = {
  sm: '200px',
  md: 'min(100%, 320px)',
  lg: 'min(100%, 440px)',
};

const COLS = 5;
const ROWS = 2;
const CELL = 40;
const PAD = 10;
const VB_WIDTH = COLS * CELL + PAD * 2;
const VB_HEIGHT = ROWS * CELL + PAD * 2;
const DOT_R = 12;

type FadeClass = 'in' | 'idle' | 'out';

export function TenFrame({
  mode,
  flashMs,
  onFlashEnd,
  interactive = false,
  size = 'md',
  label,
  filled,
  colorMode = 'split-5',
}: TenFrameProps) {
  if (import.meta.env.DEV && (!Number.isInteger(filled) || filled < 0 || filled > 10)) {
    throw new Error(`TenFrame: filled ต้องเป็นจำนวนเต็ม 0-10, ได้รับ ${String(filled)}`);
  }
  void interactive; // frames/onCellTap ยังไม่ทำใน M1 (ADR-0005) — interactive ใช้ค่า false เท่านั้น

  const reducedMotion = useReducedMotion();
  // ended = แฟลชรอบนี้จบแล้ว (ไม่ผูกกับ mode ตอน mount เพื่อให้เปลี่ยน hidden -> flash ได้)
  const [ended, setEnded] = useState(false);
  const [fadeClass, setFadeClass] = useState<FadeClass>(
    mode === 'flash' && !reducedMotion ? 'in' : 'idle',
  );
  const onFlashEndRef = useRef(onFlashEnd);
  useEffect(() => {
    onFlashEndRef.current = onFlashEnd;
  }, [onFlashEnd]);

  useEffect(() => {
    if (mode !== 'flash') return;
    setEnded(false);
    setFadeClass(reducedMotion ? 'idle' : 'in');
    const ms = flashMs ?? 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (reducedMotion) {
      setFadeClass('idle');
      timers.push(
        setTimeout(() => {
          setEnded(true);
          onFlashEndRef.current?.();
        }, ms),
      );
    } else {
      // setTimeout(0) แทน requestAnimationFrame: ให้เบราว์เซอร์ paint สถานะ opacity:0 ก่อน แล้วค่อย
      // เปลี่ยนเป็น idle เพื่อให้ transition ไล่สีเกิดขึ้นจริง (jsdom ไม่มี rAF)
      timers.push(setTimeout(() => setFadeClass('idle'), 0));
      timers.push(setTimeout(() => setFadeClass('out'), ms));
      timers.push(
        setTimeout(() => {
          setEnded(true);
          onFlashEndRef.current?.();
        }, ms + 150),
      );
    }

    return () => {
      timers.forEach(clearTimeout);
    };
    // เริ่มแฟลชใหม่ด้วยการเปลี่ยน key จากผู้เรียก ไม่ใช่ effect นี้
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const ariaLabel = label ?? 'ตาราง 10 ช่อง';
  const width = SIZE_WIDTH[size];

  if (mode === 'hidden' || (mode === 'flash' && ended)) {
    return (
      <svg
        style={{ width, maxWidth: '100%', height: 'auto' }}
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        data-testid="ten-frame"
        data-visible="false"
      >
        <rect
          x={0}
          y={0}
          width={VB_WIDTH}
          height={VB_HEIGHT}
          rx={8}
          fill="var(--color-surface)"
          stroke="none"
        />
      </svg>
    );
  }

  const opacity = fadeClass === 'idle' ? 1 : 0;
  const baseStyle: React.CSSProperties = { width, maxWidth: '100%', height: 'auto' };
  const style: React.CSSProperties = reducedMotion
    ? { ...baseStyle, opacity }
    : { ...baseStyle, opacity, transition: 'opacity 150ms ease' };

  const cells = Array.from({ length: ROWS * COLS }, (_, i) => i);

  return (
    <svg
      viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      data-testid="ten-frame"
      data-visible="true"
      style={style}
    >
      <rect
        x={PAD}
        y={PAD}
        width={COLS * CELL}
        height={ROWS * CELL}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth={2}
      />
      {Array.from({ length: COLS - 1 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={PAD + (i + 1) * CELL}
          y1={PAD}
          x2={PAD + (i + 1) * CELL}
          y2={PAD + ROWS * CELL}
          stroke="var(--color-text-muted)"
          strokeWidth={1}
        />
      ))}
      <line
        x1={PAD}
        y1={PAD + CELL}
        x2={PAD + COLS * CELL}
        y2={PAD + CELL}
        stroke="var(--color-text-muted)"
        strokeWidth={1}
      />
      {cells.map((i) => {
        if (i >= filled) return null;
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const cx = PAD + col * CELL + CELL / 2;
        const cy = PAD + row * CELL + CELL / 2;
        const fill =
          colorMode === 'single'
            ? 'var(--color-dot-single)'
            : i < 5
              ? 'var(--color-group-a)'
              : 'var(--color-group-b)';
        return <circle key={i} cx={cx} cy={cy} r={DOT_R} fill={fill} />;
      })}
    </svg>
  );
}
