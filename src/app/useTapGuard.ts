import { useEffect, useRef } from 'react';

// กันแตะทะลุหลังเปลี่ยนหน้า (Tech Spec DX-ADD §3.3.1 และ ADD-04 §3.4): input ทั้ง pointer และคีย์บอร์ดที่เข้ามา
// ภายใน 400 ms หลังการแตะที่เปลี่ยนหน้า ถูกทิ้งไม่ว่าตำแหน่งใด ไม่ disable ปุ่ม ไม่ใช้ setTimeout
// (เทียบเวลาตอน input เข้ามา) — ใช้ร่วมกันระหว่าง DiagnosticPlayer และ LessonPlayer
export const TAP_GUARD_MS = 400;

export interface TapGuard {
  // ทุก action ที่เกิดจากการแตะและเปลี่ยนหน้าของลูก ต้องผ่านฟังก์ชันนี้
  tapDispatch: <A>(dispatch: (action: A) => void, action: A) => void;
  // ใส่ที่ onClickCapture ของ wrapper ทั้งหน้า
  guardPointer: (e: React.MouseEvent) => void;
}

export function useTapGuard(): TapGuard {
  // เวลา (performance.now) ของการแตะล่าสุดที่ทำให้เปลี่ยนหน้าจอของลูก
  const lastTransitionAt = useRef(-Infinity);

  function withinTapGuard(): boolean {
    const elapsed = performance.now() - lastTransitionAt.current;
    return elapsed >= 0 && elapsed < TAP_GUARD_MS;
  }

  function tapDispatch<A>(dispatch: (action: A) => void, action: A): void {
    lastTransitionAt.current = performance.now();
    dispatch(action);
  }

  function guardPointer(e: React.MouseEvent): void {
    // ปุ่มของพ่อ (กล่องยืนยันหยุดกลางทาง) ไม่อยู่ใต้กฎนี้
    if ((e.target as HTMLElement).closest('dialog')) return;
    if (withinTapGuard()) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  const withinTapGuardRef = useRef(withinTapGuard);
  useEffect(() => {
    withinTapGuardRef.current = withinTapGuard;
  });
  useEffect(() => {
    // capture บน window ทำงานก่อนตัวฟังของแป้น (bubble) จึงตัดได้ก่อน
    const listener = (e: KeyboardEvent): void => {
      if (!withinTapGuardRef.current()) return;
      if (
        e.key === 'Backspace' ||
        e.key === 'Enter' ||
        (e.key.length === 1 && e.key >= '0' && e.key <= '9')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', listener, true);
    return () => window.removeEventListener('keydown', listener, true);
  }, []);

  return { tapDispatch, guardPointer };
}
