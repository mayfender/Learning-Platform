import styles from '@/ui/AnswerDisplay.module.css';

export interface AnswerDisplayProps {
  value: string;
  placeholder: string;
}

export function AnswerDisplay({ value, placeholder }: AnswerDisplayProps) {
  return (
    <div className={styles.display} aria-live="polite">
      {value.length > 0 ? value : <span className={styles.placeholder}>{placeholder}</span>}
    </div>
  );
}
