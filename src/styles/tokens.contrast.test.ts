/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string, block: string): string {
  const m = new RegExp(`--${name}: *(#[0-9a-fA-F]{6})`).exec(block);
  if (!m) throw new Error(`ไม่พบ ${name}`);
  return m[1]!;
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('จุด "เติมเพิ่ม" --color-dot-added (ADD-04 §3.4 non-text)', () => {
  const lightBlock = css.slice(0, css.indexOf('@media'));
  const darkBlock = css.slice(css.indexOf("[data-theme='dark']"));
  const declared = /--color-dot-added: *var\(--color-highlight\)/.test(lightBlock);
  const onHighlight = token('color-on-highlight', lightBlock);

  it('--color-dot-added ตามธีมผ่าน --color-highlight (dark ไม่ประกาศซ้ำจึงสืบทอดค่า dark)', () => {
    expect(declared).toBe(true);
    expect(darkBlock).not.toContain('--color-dot-added');
  });

  const themes = [
    { name: 'light', block: lightBlock, base: lightBlock },
    { name: 'dark', block: darkBlock, base: lightBlock },
  ];
  for (const { name, block, base } of themes) {
    const fill = token('color-highlight', block);
    const surface = token('color-surface', block);
    const groupA = token('color-accent', block); // --color-group-a = --color-accent
    const groupB = token('color-success', block); // --color-group-b = --color-success
    it(`${name}: เส้นขอบหรือสีเติมอย่างน้อยหนึ่งอย่างต่างจากพื้นผิว ≥ 3:1`, () => {
      const best = Math.max(contrast(fill, surface), contrast(onHighlight, surface));
      expect(best).toBeGreaterThanOrEqual(3);
    });
    it(`${name}: สีเติมต่างจาก group-a และ group-b ≥ 1.5`, () => {
      expect(contrast(fill, groupA)).toBeGreaterThanOrEqual(1.5);
      expect(contrast(fill, groupB)).toBeGreaterThanOrEqual(1.5);
    });
    it(`${name}: token group-a/group-b ยังชี้ accent/success`, () => {
      expect(base).toContain('--color-group-a: var(--color-accent)');
      expect(base).toContain('--color-group-b: var(--color-success)');
    });
  }
});

describe('ความเปรียบต่างของตัวอักษรบนพื้นไฮไลต์ (BUG-DX-ADD-02)', () => {
  const lightBlock = css.slice(0, css.indexOf('@media'));
  const darkBlock = css.slice(css.indexOf("[data-theme='dark']"));
  const onHighlight = token('color-on-highlight', lightBlock);

  it('light: ≥ 4.5', () => {
    expect(contrast(onHighlight, token('color-highlight', lightBlock))).toBeGreaterThanOrEqual(4.5);
  });
  it('dark: ≥ 4.5 (ใช้สีตัวอักษรเข้มเสมอ ไม่ตามธีม)', () => {
    expect(contrast(onHighlight, token('color-highlight', darkBlock))).toBeGreaterThanOrEqual(4.5);
    expect(darkBlock).not.toContain('--color-on-highlight');
  });
});
