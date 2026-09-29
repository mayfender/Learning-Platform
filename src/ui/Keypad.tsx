import { useEffect } from 'react';
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

  useEffect(() => {
    if (disabled) return;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key >= '0' && e.key <= '9') {
        pressDigit(e.key);
      } else if (e.key === 'Backspace') {
        pressBackspace();
      } else if (e.key === 'Enter') {
        trySubmit();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disabled, maxDigits]);

  return (
    <div className={styles.grid}>
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
