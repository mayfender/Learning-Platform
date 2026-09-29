import { useEffect, useRef } from 'react';
import styles from '@/ui/Keypad.module.css';

export interface KeypadProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  maxDigits?: number;
  disabled?: boolean;
}

const ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['back', '0', 'submit'],
];

export function Keypad({
  value,
  onChange,
  onSubmit,
  submitLabel,
  maxDigits = 3,
  disabled = false,
}: KeypadProps) {
  function pressDigit(digit: string): void {
    if (disabled) return;
    if (value === '0') {
      onChange(digit);
      return;
    }
    if (value.length >= maxDigits) return;
    onChange(value + digit);
  }

  function pressBackspace(): void {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }

  function trySubmit(): void {
    if (disabled || value.length === 0) return;
    onSubmit();
  }

  // ตัวฟังคีย์ลงทะเบียนครั้งเดียวตอน mount (ไม่ลงทะเบียนใหม่ทุกครั้งที่ค่าเปลี่ยน เพื่อไม่ให้ลำดับ
  // ตัวฟังบน window เปลี่ยน) และอ่านค่าล่าสุดผ่าน ref
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent): void => {
      if (disabled || e.ctrlKey || e.metaKey || e.altKey) return;
      // preventDefault ทุกคีย์ที่แป้นจัดการ (เช่น Backspace ทำให้ WebKit ย้อนหน้า)
      if (e.key.length === 1 && e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pressDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        trySubmit();
      }
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => keyHandlerRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return (
    <div className={styles.grid} data-keypad>
      {ROWS.flat().map((key) => {
        if (key === 'back') {
          return (
            <button
              key="back"
              type="button"
              className={styles.key}
              aria-label="ลบตัวเลข"
              disabled={disabled}
              onClick={pressBackspace}
            >
              ⌫
            </button>
          );
        }
        if (key === 'submit') {
          return (
            <button
              key="submit"
              type="button"
              className={`${styles.key} ${styles.submit}`}
              disabled={disabled || value.length === 0}
              onClick={trySubmit}
            >
              {submitLabel}
            </button>
          );
        }
        return (
          <button
            key={key}
            type="button"
            className={styles.key}
            disabled={disabled}
            onClick={() => pressDigit(key)}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
