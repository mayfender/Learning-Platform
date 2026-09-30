import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/ui/useReducedMotion';

export type FadeClass = 'idle' | 'out';

export interface FlashState {
  /** แฟลชรอบนี้จบแล้ว (ไม่ผูกกับ mode ตอน mount เพื่อให้เปลี่ยน hidden -> flash ได้) */
  ended: boolean;
  fadeClass: FadeClass;
  reducedMotion: boolean;
}

/**
 * ตัวจับเวลาแฟลชที่ใช้ร่วมกันของ TenFrame และ MakeTenBoard (ADR-0005, Tech Spec ADD-04 §3.1)
 * ปกติ: แสดง flashMs แล้ว fade 150ms จึงเรียก onFlashEnd; reduced motion: ไม่ fade ซ่อนและเรียก
 * onFlashEnd พร้อมกันที่ flashMs (เวลาแสดงเท่าเดิมทุกกรณี)
 */
export function useFlash(
  mode: 'show' | 'flash' | 'hidden',
  flashMs: number | undefined,
  onFlashEnd: (() => void) | undefined,
): FlashState {
  const reducedMotion = useReducedMotion();
  const [ended, setEnded] = useState(false);
  // fade-in ทำด้วย CSS animation ที่ผู้เรียกใส่ตอน mount (ไม่พึ่ง timer ของ JS จึงเดินตามเวลาจริงแม้นาฬิกาถูกหยุด)
  // ที่นี่จึงมีแค่ idle (แสดง) กับ out (กำลัง fade-out)
  const [fadeClass, setFadeClass] = useState<FadeClass>('idle');
  const onFlashEndRef = useRef(onFlashEnd);
  useEffect(() => {
    onFlashEndRef.current = onFlashEnd;
  }, [onFlashEnd]);

  useEffect(() => {
    if (mode !== 'flash') return;
    setEnded(false);
    setFadeClass('idle');
    const ms = flashMs ?? 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (reducedMotion) {
      setFadeClass('idle');
      timers.push(
        setTimeout(() => {
          setEnded(true);
          onFlashEndRef.current?.();
        }, ms),
      );
    } else {
      timers.push(setTimeout(() => setFadeClass('out'), ms));
      timers.push(
        setTimeout(() => {
          setEnded(true);
          onFlashEndRef.current?.();
        }, ms + 150),
      );
    }

    return () => {
      timers.forEach(clearTimeout);
    };
    // เริ่มแฟลชใหม่ด้วยการเปลี่ยน key จากผู้เรียก ไม่ใช่ effect นี้
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return { ended, fadeClass, reducedMotion };
}
