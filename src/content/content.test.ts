import { describe, expect, it } from 'vitest';
import { diagnostics, lessons } from '@/content/registry';

// วนตรวจทุกอย่างใน registry (ADR-0007) — M0 ยังว่างแต่ต้องมีโครงให้ M1+ ต่อได้
describe('content registry', () => {
  it('diagnostics และ lessons ทุกรายการมี id ตรงกับ key และเฉลยถูกต้อง', () => {
    for (const [key, diagnostic] of Object.entries(diagnostics)) {
      expect((diagnostic as { id: string }).id).toBe(key);
    }
    for (const [key, lesson] of Object.entries(lessons)) {
      expect((lesson as { id: string }).id).toBe(key);
    }
  });

  it('ยังไม่มีเนื้อหาใน M0', () => {
    expect(Object.keys(diagnostics)).toHaveLength(0);
    expect(Object.keys(lessons)).toHaveLength(0);
  });
});
