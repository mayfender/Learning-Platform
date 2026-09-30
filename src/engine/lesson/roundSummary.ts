import { firstAttempts, type AnsweredPayload } from '@/engine/lesson/evaluate';

export interface RoundSummaryTexts {
  faster: string; // มี {k}
  done: string; // มี {n}
}

// ข้อความหลังจบรอบฝึก/ทบทวน (LS §6.3, Tech Spec §5.6.1): ไม่แสดงเวลา คะแนนดิบ หรือคำว่าช้า
// k = จำนวนข้อของรอบนี้ที่ถูกและ latencyMs น้อยกว่าค่าเฉลี่ย latencyMs ของข้อถูกในรอบก่อน (เฉพาะ latencyValid)
// ถ้า k ≥ 1 → "เร็วกว่าครั้งก่อน {k} ข้อ" มิฉะนั้น → "ทำครบ {n} ข้อ"
export function roundSummary(
  current: readonly AnsweredPayload[],
  previous: readonly AnsweredPayload[] | undefined,
  texts: RoundSummaryTexts,
): string {
  const now = firstAttempts(current);
  const n = now.length;
  if (previous) {
    const prevTimes = firstAttempts(previous)
      .filter((a) => a.correct && a.latencyValid)
      .map((a) => a.latencyMs);
    if (prevTimes.length > 0) {
      const mean = prevTimes.reduce((s, x) => s + x, 0) / prevTimes.length;
      const k = now.filter((a) => a.correct && a.latencyValid && a.latencyMs < mean).length;
      if (k >= 1) return texts.faster.replace('{k}', String(k));
    }
  }
  return texts.done.replace('{n}', String(n));
}
