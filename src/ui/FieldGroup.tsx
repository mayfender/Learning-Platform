import styles from '@/ui/FieldGroup.module.css';

export type FieldId = 'gap' | 'rest' | 'total';

export interface FieldDef {
  id: FieldId;
  label: string;
}

export interface FieldGroupProps {
  fields: readonly FieldDef[];
  /** ค่าของแต่ละช่อง (สตริงตัวเลข ว่าง = ยังไม่กรอก) */
  values: Readonly<Partial<Record<FieldId, string>>>;
  focusId: FieldId;
  onFocus: (id: FieldId) => void;
  disabled?: boolean;
}

/**
 * ช่องตอบหลายช่อง (ข้อ B3: ขาด/เหลือ/ผลรวม) ใช้คู่กับ Keypad ตัวเดียวที่ใส่ค่าลงช่องที่โฟกัส
 * ผู้เรียกเก็บ values และ focusId เอง (controlled)
 */
export function FieldGroup({
  fields,
  values,
  focusId,
  onFocus,
  disabled = false,
}: FieldGroupProps) {
  return (
    <div className={styles.group} data-field-group>
      {fields.map((f) => {
        const value = values[f.id] ?? '';
        const focused = f.id === focusId;
        return (
          <button
            key={f.id}
            type="button"
            className={`${styles.field} ${focused ? styles.focused : ''}`}
            data-field={f.id}
            data-focused={focused ? 'true' : 'false'}
            aria-current={focused ? 'true' : undefined}
            disabled={disabled}
            onClick={() => onFocus(f.id)}
          >
            <span className={styles.label}>{f.label}</span>
            <span className={styles.value} aria-live="polite">
              {value.length > 0 ? value : ' '}
            </span>
          </button>
        );
      })}
    </div>
  );
}
