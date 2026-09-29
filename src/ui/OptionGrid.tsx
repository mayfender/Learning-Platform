import { useState } from 'react';
import styles from '@/ui/OptionGrid.module.css';

export interface OptionGridProps {
  options: readonly { id: string; label: string; example?: string }[];
  onPick: (id: string) => void;
  columns?: 2;
}

export function OptionGrid({ options, onPick }: OptionGridProps) {
  const [picked, setPicked] = useState(false);

  function pick(id: string): void {
    if (picked) return;
    setPicked(true);
    onPick(id);
  }

  return (
    <div className={styles.grid}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={styles.option}
          disabled={picked}
          onClick={() => pick(option.id)}
        >
          <span>{option.label}</span>
          {option.example && <span className={styles.example}>{option.example}</span>}
        </button>
      ))}
    </div>
  );
}
