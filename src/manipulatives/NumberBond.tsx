import { useEffect, useState } from 'react';
import type { ManipulativeBaseProps } from '@/manipulatives/types';
import { useReducedMotion } from '@/ui/useReducedMotion';
import styles from '@/manipulatives/NumberBond.module.css';

/** null = ยังไม่ปรากฏ (เว้นที่ไว้ ไม่วาดวงกลม), '?' = วงประ */
export type BondSlot = number | '?' | null;

export interface NumberBondProps extends Omit<ManipulativeBaseProps, 'mode'> {
  mode: 'show' | 'hidden';
  whole: BondSlot;
  parts: readonly [BondSlot, BondSlot];
  highlight?: 'whole' | 'part-a' | 'part-b' | null;
}

const SIZE_WIDTH: Record<NonNullable<NumberBondProps['size']>, string> = {
  sm: '120px',
  md: 'min(100%, 180px)',
  lg: 'min(100%, 260px)',
};

const VB_W = 160;
const VB_H = 130;
const R = 24;
const POS = {
  whole: { x: 80, y: 30 },
  'part-a': { x: 36, y: 98 },
  'part-b': { x: 124, y: 98 },
} as const;

type SlotId = keyof typeof POS;

function speak(slot: BondSlot): string | null {
  if (slot === null) return null;
  return slot === '?' ? 'ยังไม่รู้' : String(slot);
}

interface SlotProps {
  id: SlotId;
  value: Exclude<BondSlot, null>;
  animate: boolean;
  ring: boolean;
  pulse: boolean;
}

function Slot({ id, value, animate, ring, pulse }: SlotProps) {
  const { x, y } = POS[id];
  return (
    <g data-slot={id} className={animate ? styles.fadeIn : undefined}>
      <circle
        cx={x}
        cy={y}
        r={R}
        fill="var(--color-surface)"
        stroke="var(--color-text-muted)"
        strokeWidth={2}
        strokeDasharray={value === '?' ? '5 4' : undefined}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={value === '?' ? 22 : 26}
        fontFamily="var(--font-heading)"
        fill={value === '?' ? 'var(--color-text-muted)' : 'var(--color-text)'}
      >
        {value}
      </text>
      {ring && (
        <rect
          data-highlight={id}
          className={pulse ? styles.pulse : undefined}
          x={x - R - 5}
          y={y - R - 5}
          width={(R + 5) * 2}
          height={(R + 5) * 2}
          rx={R + 5}
          fill="none"
          stroke="var(--color-text)"
          strokeWidth={3}
        />
      )}
    </g>
  );
}

/** "แยกเลข": วงกลมทั้งหมดอยู่บน สองส่วนอยู่ล่างซ้าย/ขวา (ADR-0005, Tech Spec ADD-04 §3.2) */
export function NumberBond({
  mode,
  whole,
  parts,
  highlight = null,
  size = 'md',
  label,
}: NumberBondProps) {
  if (import.meta.env.DEV && (mode as string) === 'flash') {
    throw new Error('NumberBond: ไม่รองรับ mode="flash"');
  }
  const reducedMotion = useReducedMotion();
  // ช่องที่ปรากฏหลัง mount แรกเท่านั้นจึง fade (ตอนแรกแสดงทันที)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  const animate = ready && !reducedMotion;

  const width = SIZE_WIDTH[size];
  const style = { width, minWidth: 96, maxWidth: '100%', height: 'auto' };

  if (mode === 'hidden') {
    return (
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={style}
        role="img"
        aria-label={label ?? 'แยกเลข'}
        data-testid="number-bond"
        data-visible="false"
      >
        <rect x={0} y={0} width={VB_W} height={VB_H} rx={8} fill="var(--color-surface)" />
      </svg>
    );
  }

  const spoken = [
    speak(whole) !== null ? `ทั้งหมด ${speak(whole)}` : null,
    speak(parts[0]) !== null ? `ส่วนที่หนึ่ง ${speak(parts[0])}` : null,
    speak(parts[1]) !== null ? `ส่วนที่สอง ${speak(parts[1])}` : null,
  ].filter((s): s is string => s !== null);
  const ariaLabel = label ?? ['แยกเลข', ...spoken].join(' ');
  const pulse = !reducedMotion;
  const slots: { id: SlotId; value: BondSlot }[] = [
    { id: 'whole', value: whole },
    { id: 'part-a', value: parts[0] },
    { id: 'part-b', value: parts[1] },
  ];

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={style}
      role="img"
      aria-label={ariaLabel}
      data-testid="number-bond"
      data-visible="true"
    >
      {(['part-a', 'part-b'] as const).map((id) => {
        const slot = id === 'part-a' ? parts[0] : parts[1];
        if (slot === null || whole === null) return null;
        return (
          <line
            key={id}
            x1={POS.whole.x}
            y1={POS.whole.y + R}
            x2={POS[id].x}
            y2={POS[id].y - R}
            stroke="var(--color-text-muted)"
            strokeWidth={2}
          />
        );
      })}
      {slots.map(({ id, value }) =>
        value === null ? null : (
          <Slot
            key={id}
            id={id}
            value={value}
            animate={animate}
            ring={highlight === id}
            pulse={pulse}
          />
        ),
      )}
    </svg>
  );
}
