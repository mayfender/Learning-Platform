import { useEffect, useRef } from 'react';
import { createSilentTimer } from '@/engine/timing';

export type PhaseStep = 'ready' | 'show' | 'answering';

export interface SilentTimerHandle {
  submit(): { latencyMs: number; latencyValid: boolean; flashInterrupted: boolean };
  invalidate(): void;
}

// จับเวลาเงียบของข้อปัจจุบัน (Tech Spec §5.5) — เรียกใหม่ทุกครั้งที่ item เปลี่ยน (component ถูก
// remount ด้วย key={item.id} จาก DiagnosticPlayer) จึงไม่ต้องรีเซตด้วยตัวเอง
export function useSilentTimer(itemKey: string, step: PhaseStep): SilentTimerHandle {
  const timerRef = useRef(createSilentTimer());
  const flashInterruptedRef = useRef(false);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    flashInterruptedRef.current = false;
  }, [itemKey]);

  useEffect(() => {
    if (step === 'answering') {
      timerRef.current.start();
      if (document.visibilityState === 'hidden') {
        timerRef.current.invalidate();
      }
    }
  }, [itemKey, step]);

  useEffect(() => {
    function onVisibility(): void {
      if (document.visibilityState !== 'hidden') return;
      if (stepRef.current === 'answering') {
        timerRef.current.invalidate();
      } else {
        flashInterruptedRef.current = true;
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [itemKey]);

  return {
    submit() {
      const { latencyMs, latencyValid } = timerRef.current.stop();
      return { latencyMs, latencyValid, flashInterrupted: flashInterruptedRef.current };
    },
    invalidate() {
      timerRef.current.invalidate();
    },
  };
}
