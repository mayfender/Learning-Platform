import type { FieldDef, FieldId } from '@/ui/FieldGroup';

/** ทุกช่องมีค่าแล้วหรือยัง (ใช้เปิดปุ่ม "ตอบ" ของ Keypad) */
export function allFieldsFilled(
  fields: readonly FieldDef[],
  values: Readonly<Partial<Record<FieldId, string>>>,
): boolean {
  return fields.every((f) => (values[f.id] ?? '').length > 0);
}
