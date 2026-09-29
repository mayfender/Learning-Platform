import { describe, expect, it } from 'vitest';
import { newId } from '@/store/ids';

describe('newId', () => {
  it('สร้าง id รูปแบบ UUID v4 ที่ไม่ซ้ำ', () => {
    const ids = Array.from({ length: 50 }, () => newId());
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const id of ids) {
      expect(id).toMatch(uuidPattern);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
