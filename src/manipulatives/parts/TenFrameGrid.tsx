import type { CSSProperties, KeyboardEvent } from 'react';
import { CELL, COLS, DOT_R, PAD, ROWS, type CellState } from '@/manipulatives/parts/gridGeometry';
import styles from '@/manipulatives/parts/TenFrameGrid.module.css';

export interface TenFrameGridProps {
  filled: number;
  colorMode: 'single' | 'split-5';
  added?: readonly number[];
  highlight?: { indices: readonly number[]; pulse?: boolean };
  interactive?: boolean;
  onCellTap?: (index: number, state: CellState) => void;
  reducedMotion?: boolean;
}

function cellState(i: number, filled: number, added: readonly number[]): CellState {
  if (i < filled) return 'dot';
  if (added.includes(i)) return 'added';
  return 'empty';
}

const STATE_LABEL: Record<CellState, string> = {
  empty: 'ว่าง',
  dot: 'มีจุด',
  added: 'เติมแล้ว',
};

/** ส่วนวาดกล่อง 10 ช่อง (เส้น จุด วงแหวนไฮไลต์ พื้นที่แตะ) ภายใน <svg> ของผู้เรียก */
export function TenFrameGrid({
  filled,
  colorMode,
  added = [],
  highlight,
  interactive = false,
  onCellTap,
  reducedMotion = false,
}: TenFrameGridProps) {
  const cells = Array.from({ length: ROWS * COLS }, (_, i) => i);
  const pulse = highlight?.pulse === true && !reducedMotion;

  return (
    <g data-testid="ten-frame-grid">
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
        const state = cellState(i, filled, added);
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const x = PAD + col * CELL;
        const y = PAD + row * CELL;
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;
        const tap = (): void => onCellTap?.(i, state);
        const onKeyDown = (e: KeyboardEvent<SVGGElement>): void => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            tap();
          }
        };
        const interactiveProps = interactive
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-label': `ช่องที่ ${i + 1} ${STATE_LABEL[state]}`,
              onClick: tap,
              onKeyDown,
              className: styles.cell,
              style: { cursor: 'pointer' } as CSSProperties,
            }
          : {};
        return (
          <g key={i} data-cell-index={i} data-cell-state={state} {...interactiveProps}>
            {/* พื้นที่แตะเต็มช่อง (rect ไม่ใช่ circle เพื่อไม่ปนกับการนับจุด) */}
            {interactive && <rect x={x} y={y} width={CELL} height={CELL} fill="transparent" />}
            {state === 'dot' && (
              <circle
                data-dot
                cx={cx}
                cy={cy}
                r={DOT_R}
                fill={
                  colorMode === 'single'
                    ? 'var(--color-dot-single)'
                    : i < 5
                      ? 'var(--color-group-a)'
                      : 'var(--color-group-b)'
                }
              />
            )}
            {state === 'added' && (
              <circle
                data-dot
                data-added
                cx={cx}
                cy={cy}
                r={DOT_R}
                fill="var(--color-dot-added)"
                stroke="var(--color-on-highlight)"
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}
      {highlight?.indices.map((i) => {
        const x = PAD + (i % COLS) * CELL;
        const y = PAD + Math.floor(i / COLS) * CELL;
        return (
          <rect
            key={`h${i}`}
            data-highlight={i}
            className={pulse ? styles.pulse : undefined}
            x={x + 2}
            y={y + 2}
            width={CELL - 4}
            height={CELL - 4}
            rx={6}
            fill="none"
            stroke="var(--color-text)"
            strokeWidth={3}
            pointerEvents="none"
          />
        );
      })}
    </g>
  );
}
