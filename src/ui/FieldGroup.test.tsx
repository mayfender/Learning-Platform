import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FieldGroup, type FieldDef } from '@/ui/FieldGroup';
import { allFieldsFilled, firstEmptyField } from '@/ui/fieldGroupUtils';

afterEach(cleanup);

const fields: FieldDef[] = [
  { id: 'gap', label: 'ขาด' },
  { id: 'rest', label: 'เหลือ' },
  { id: 'total', label: 'ทั้งหมด' },
];

describe('FieldGroup', () => {
  it('แสดงทุกช่องพร้อมค่า และทำเครื่องหมายช่องที่โฟกัส', () => {
    const { container } = render(
      <FieldGroup
        fields={fields}
        values={{ gap: '2', total: '14' }}
        focusId="rest"
        onFocus={() => {}}
      />,
    );
    const btn = (id: string) => container.querySelector(`[data-field="${id}"]`)!;
    expect(btn('gap').textContent).toContain('2');
    expect(btn('rest').getAttribute('data-focused')).toBe('true');
    expect(btn('gap').getAttribute('data-focused')).toBe('false');
    expect(btn('total').textContent).toContain('14');
  });

  it('แตะช่อง -> onFocus(id)', () => {
    const onFocus = vi.fn();
    render(<FieldGroup fields={fields} values={{}} focusId="gap" onFocus={onFocus} />);
    fireEvent.click(screen.getByText('เหลือ'));
    expect(onFocus).toHaveBeenCalledWith('rest');
  });

  it('ช่องเดียว (ข้อ 4-6) ใช้ได้', () => {
    const { container } = render(
      <FieldGroup fields={[fields[2]!]} values={{}} focusId="total" onFocus={() => {}} />,
    );
    expect(container.querySelectorAll('[data-field]')).toHaveLength(1);
  });

  it('allFieldsFilled: ต้องกรอกครบทุกช่อง', () => {
    expect(allFieldsFilled(fields, { gap: '2', rest: '6' })).toBe(false);
    expect(allFieldsFilled(fields, { gap: '2', rest: '6', total: '' })).toBe(false);
    expect(allFieldsFilled(fields, { gap: '2', rest: '6', total: '14' })).toBe(true);
  });

  it('firstEmptyField: ช่องแรกที่ยังว่างเป็นช่องใช้งานเมื่อเริ่มขั้น (ไม่เลื่อนโฟกัสเอง)', () => {
    expect(firstEmptyField(fields, {})).toBe('gap');
    expect(firstEmptyField(fields, { gap: '2' })).toBe('rest');
    expect(firstEmptyField(fields, { gap: '2', total: '14' })).toBe('rest');
    expect(firstEmptyField(fields, { gap: '2', rest: '6', total: '14' })).toBe('gap');
  });

  it('disabled: แตะไม่เรียก onFocus', () => {
    const onFocus = vi.fn();
    render(<FieldGroup fields={fields} values={{}} focusId="gap" onFocus={onFocus} disabled />);
    fireEvent.click(screen.getByText('เหลือ'));
    expect(onFocus).not.toHaveBeenCalled();
  });
});
