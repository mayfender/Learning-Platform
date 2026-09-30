import type { FieldDef, FieldId } from '@/ui/FieldGroup';

/** ทุกช่องมีค่าแล้วหรือยัง (ใช้เปิดปุ่ม "ตอบ" ของ Keypad) */
export function allFieldsFilled(
  fields: readonly FieldDef[],
  values: Readonly<Partial<Record<FieldId, string>>>,
): boolean {
  return fields.every((f) => (values[f.id] ?? '').length > 0);
}

/** ช่องแรกที่ยังว่าง (ใช้ตั้งช่องใช้งานเมื่อเริ่มขั้น); ถ้ากรอกครบแล้วคืนช่องแรก */
export function firstEmptyField(
  fields: readonly FieldDef[],
  values: Readonly<Partial<Record<FieldId, string>>>,
): FieldId {
  const empty = fields.find((f) => (values[f.id] ?? '').length === 0);
  return (empty ?? fields[0]!).id;
}
