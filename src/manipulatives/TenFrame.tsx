import type { ManipulativeBaseProps } from '@/manipulatives/types';
import { useFlash } from '@/manipulatives/useFlash';
import { TenFrameGrid } from '@/manipulatives/parts/TenFrameGrid';
import { VB_HEIGHT, VB_WIDTH, type CellState } from '@/manipulatives/parts/gridGeometry';

export type { CellState };

export interface TenFrameProps extends ManipulativeBaseProps {
  /** จุดตั้งต้น เติมตาม index 0..filled-1 (แถวบนซ้าย→ขวา แล้วแถวล่าง) */
  filled: number;
  /** สีของจุดตั้งต้น */
  colorMode?: 'single' | 'split-5';
  /** index ช่องที่ "เติมเพิ่ม" (สีใหม่) ต้องอยู่ในช่วง filled..9 และไม่ซ้ำ */
  added?: readonly number[];
  /** วงแหวนรอบช่อง (feedback); pulse = กะพริบ */
  highlight?: { indices: readonly number[]; pulse?: boolean };
  /** เรียกเมื่อ interactive และแตะช่องใดก็ได้ (component ไม่เปลี่ยนค่าเอง ผู้เรียกตัดสิน) */
  onCellTap?: (index: number, state: CellState) => void;
  /** แฟลช fade-in ด้วย CSS animation แทน timer (ใช้ใน ADD-04 ให้ภาพเห็นชัดตามเวลาจริงแม้นาฬิกาทดสอบหยุด) */
  cssFadeIn?: boolean;
}

const SIZE_WIDTH: Record<NonNullable<TenFrameProps['size']>, string> = {
  sm: '200px',
  md: 'min(100%, 320px)',
  lg: 'min(100%, 440px)',
};

function validate(props: TenFrameProps): void {
  const { filled, added = [], interactive, size = 'md', highlight } = props;
  if (!Number.isInteger(filled) || filled < 0 || filled > 10) {
    throw new Error(`TenFrame: filled ต้องเป็นจำนวนเต็ม 0-10, ได้รับ ${String(filled)}`);
  }
  const seen = new Set<number>();
  for (const i of added) {
    if (!Number.isInteger(i) || i < filled || i > 9) {
      throw new Error(`TenFrame: added ต้องอยู่ในช่วง filled..9, ได้รับ ${String(i)}`);
    }
    if (seen.has(i)) throw new Error(`TenFrame: added ซ้ำที่ index ${String(i)}`);
    seen.add(i);
  }
  for (const i of highlight?.indices ?? []) {
    if (!Number.isInteger(i) || i < 0 || i > 9) {
      throw new Error(`TenFrame: highlight ต้องอยู่ในช่วง 0..9, ได้รับ ${String(i)}`);
    }
  }
  if (interactive && size === 'sm') {
    // ช่อง 40 หน่วยใน viewBox 220 ต้องเรนเดอร์ ≥ 264px จึงแตะได้ ≥ 48px
    throw new Error('TenFrame: interactive ใช้ size="sm" ไม่ได้ (พื้นที่แตะเล็กกว่า 48px)');
  }
}

export function TenFrame(props: TenFrameProps) {
  const {
    mode,
    flashMs,
    onFlashEnd,
    interactive = false,
    size = 'md',
    label,
    filled,
    colorMode = 'split-5',
    added,
    highlight,
    onCellTap,
    cssFadeIn = false,
  } = props;
  if (import.meta.env.DEV) validate(props);

  const { ended, fadeClass, reducedMotion } = useFlash(mode, flashMs, onFlashEnd, cssFadeIn);

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
    : {
        ...baseStyle,
        opacity,
        transition: 'opacity 150ms ease',
        ...(cssFadeIn && mode === 'flash' && fadeClass === 'idle'
          ? { animation: 'ten-frame-flash-in 150ms ease' }
          : {}),
      };
  // interactive: ลูกของ role="img" ถูกอ่านเป็นภาพเดียว ปุ่มช่องจึงต้องอยู่ใต้ role="group"
  const isInteractive = interactive && mode === 'show';

  return (
    <svg
      viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
      role={isInteractive ? 'group' : 'img'}
      aria-label={ariaLabel}
      data-testid="ten-frame"
      data-visible="true"
      style={style}
    >
      <TenFrameGrid
        filled={filled}
        colorMode={colorMode}
        added={added}
        highlight={highlight}
        interactive={isInteractive}
        onCellTap={onCellTap}
        reducedMotion={reducedMotion}
      />
    </svg>
  );
}
