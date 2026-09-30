import { useEffect, useRef } from 'react';
import { Button } from '@/ui/Button';
import styles from '@/ui/ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** ปุ่มเพิ่มเติม (เช่น "ข้ามส่วนนี้" ของบทเรียน) แสดงเมื่อส่งทั้ง label และ onClick */
  extraAction?: { label: string; onClick: () => void };
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  extraAction,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} onCancel={onCancel}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel}>
          {cancelLabel}
        </Button>
        {extraAction && (
          <Button variant="secondary" type="button" onClick={extraAction.onClick}>
            {extraAction.label}
          </Button>
        )}
        <Button type="button" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
