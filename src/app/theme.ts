export type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'lp.theme';

export function readTheme(): ThemePref {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  } catch {
    // localStorage ใช้ไม่ได้ (เช่น private mode บางเบราว์เซอร์) — ใช้ค่าเริ่มต้น
  }
  return 'system';
}

export function writeTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // ธีมเป็นค่าของเครื่อง เขียนไม่ได้ก็ไม่ทำให้แอปพัง
  }
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', pref);
  }
}
