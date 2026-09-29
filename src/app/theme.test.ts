import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, readTheme, writeTheme } from '@/app/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme', () => {
  it('readTheme คืน system ถ้ายังไม่เคยตั้งค่า', () => {
    expect(readTheme()).toBe('system');
  });

  it('writeTheme แล้ว readTheme อ่านค่าที่ตั้งได้', () => {
    writeTheme('dark');
    expect(readTheme()).toBe('dark');
  });

  it('readTheme คืน system ถ้าค่าที่เก็บไม่ถูกต้อง', () => {
    localStorage.setItem('lp.theme', 'purple');
    expect(readTheme()).toBe('system');
  });

  it('applyTheme(system) ลบ data-theme ออกจาก html', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('applyTheme(light/dark) ตั้ง data-theme', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
