import type { Lesson } from '@/engine/lesson/types';
import type { BlockMetrics, EventPayload, LessonFlag, Skill, SkillId } from '@/engine/types';

// ข้อที่ตอบแล้ว (payload ของ item.answered ยังไม่ผ่าน envelope) — event ที่บันทึกแล้วใช้ได้เพราะเป็น superset
export type AnsweredPayload = Extract<EventPayload, { type: 'item.answered' }>;

export interface BlockEvaluation {
  outcome: 'passed' | 'passed-trend' | 'not-passed';
  metrics: BlockMetrics;
  // เฉพาะส่วน B: มีข้อ M6/M7 รวม ≥ minCount (ธง tray-B1)
  trayFlag: boolean;
}

export function thresholdOf(
  skills: readonly Skill[],
  skillId: SkillId,
  level: 'noCount' | 'automatic',
): number {
  const f = skills.find((s) => s.id === skillId)?.fluency;
  if (!f) throw new Error(`ทักษะ ${skillId} ไม่มีเกณฑ์ fluency`);
  return level === 'noCount' ? f.noCountMs : f.automaticMs;
}

// ข้อ "เร็ว" = ถูก และ (แท็บถูกซ่อน หรือ เวลา ≤ เกณฑ์) — กฎเดียวกับ DX-ADD (แท็บซ่อนและถูก = ผ่านเวลา)
export function isFastAnswer(
  a: Pick<AnsweredPayload, 'correct' | 'latencyValid' | 'latencyMs'>,
  thresholdMs: number,
): boolean {
  if (!a.correct) return false;
  if (!a.latencyValid) return true;
  return a.latencyMs <= thresholdMs;
}

// เฉพาะครั้งแรกที่ตอบ (attemptNo === 1) ของข้อหลัก: ข้ามการตอบซ้ำของขั้นย่อย (B1/B2) ที่ไม่ใช่ขั้นแรก
export function firstAttempts(answers: readonly AnsweredPayload[]): AnsweredPayload[] {
  return answers.filter((a) => a.attemptNo === 1);
}

function meanValidLatency(answers: readonly AnsweredPayload[]): number | null {
  const valid = answers.filter((a) => a.latencyValid).map((a) => a.latencyMs);
  if (valid.length === 0) return null;
  return valid.reduce((s, x) => s + x, 0) / valid.length;
}

// รหัสความเข้าใจผิดของข้อ: ระดับข้อ (ผลรวม/ช่องเดียว) และของช่องย่อย (ขาด/เหลือ ของ B3)
export function misconceptionsOf(a: AnsweredPayload): string[] {
  const ids: string[] = [];
  if (a.misconceptionId) ids.push(a.misconceptionId);
  for (const sub of a.subAnswers ?? []) {
    if (sub.misconceptionId) ids.push(sub.misconceptionId);
  }
  return ids;
}

export function summarizeAnswers(
  answers: readonly AnsweredPayload[],
  thresholdMs: number,
): BlockMetrics {
  const list = firstAttempts(answers);
  const byId = new Map<string, string[]>();
  for (const a of list) {
    for (const id of new Set(misconceptionsOf(a))) {
      byId.set(id, [...(byId.get(id) ?? []), a.itemId]);
    }
  }
  return {
    total: list.length,
    correct: list.filter((a) => a.correct).length,
    fastCount: list.filter((a) => isFastAnswer(a, thresholdMs)).length,
    meanLatencyMs: meanValidLatency(list),
    misconceptions: [...byId].map(([id, itemIds]) => ({ id, itemIds })),
  };
}

// เช็คก่อน: ข้าม A1+A2 / B1+B2 ถ้าข้อที่กำหนดถูกหมดและเร็วทุกข้อ (Tech Spec §5.3)
export function evaluateCheck(
  lesson: Lesson,
  answers: readonly AnsweredPayload[],
  skills: readonly Skill[],
): { skipA12: boolean; skipB12: boolean } {
  const list = firstAttempts(answers);
  function allFastAndCorrect(itemIds: readonly string[], skillId: SkillId): boolean {
    const threshold = thresholdOf(skills, skillId, 'noCount');
    return itemIds.every((id) => {
      const a = list.find((x) => x.itemId === id);
      return a !== undefined && isFastAnswer(a, threshold);
    });
  }
  return {
    skipA12: allFastAndCorrect(lesson.check.skip.A.itemIds, lesson.check.skip.A.skillId),
    skipB12: allFastAndCorrect(lesson.check.skip.B.itemIds, lesson.check.skip.B.skillId),
  };
}

// ส่วน A: ตัดสินจากข้อ A3 (section 'A3') ถูก ≥ minCorrect และเร็ว ≥ minFast
export function evaluateA(
  lesson: Lesson,
  answers: readonly AnsweredPayload[],
  skills: readonly Skill[],
): BlockEvaluation {
  const a3 = firstAttempts(answers.filter((a) => a.section === 'A3'));
  const threshold = thresholdOf(skills, 'add.bonds-10', 'noCount');
  const metrics = summarizeAnswers(a3, threshold);
  const { minCorrect, minFast } = lesson.blocks.A.pass;
  const passed = metrics.correct >= minCorrect && metrics.fastCount >= minFast;
  return { outcome: passed ? 'passed' : 'not-passed', metrics, trayFlag: false };
}

// ส่วน B: ตัดสินจากข้อ B4 (section 'B4'), แนวโน้มเทียบ B4 กับ B3 ข้อช่องเดียว (ข้อ 4–6), ธง tray-B1 จาก B3+B4
export function evaluateB(
  lesson: Lesson,
  answers: readonly AnsweredPayload[],
  skills: readonly Skill[],
): BlockEvaluation {
  const cfg = lesson.blocks.B;
  const b3 = firstAttempts(answers.filter((a) => a.section === 'B3'));
  const b4 = firstAttempts(answers.filter((a) => a.section === 'B4'));
  const threshold = thresholdOf(skills, 'add.make-10', 'noCount');
  const metrics = summarizeAnswers(b4, threshold);

  // ธง: จำนวนข้อ (ไม่ซ้ำ) ที่ตอบผิดเป็น M6/M7 ใน B3+B4 (รวมช่อง "เหลือ" ของ B3)
  const trayCount = [...b3, ...b4].filter((a) =>
    misconceptionsOf(a).some((id) => cfg.trayFlag.misconceptions.includes(id)),
  ).length;
  const trayFlag = trayCount >= cfg.trayFlag.minCount;

  const passedNormally =
    metrics.correct >= cfg.pass.minCorrect && metrics.fastCount >= cfg.pass.minFast;
  if (passedNormally) return { outcome: 'passed', metrics, trayFlag };

  // ผ่านแบบ "กำลังไปได้ดี": ค่าเฉลี่ยเวลา B4 ≤ maxRatio × ค่าเฉลี่ย B3 ข้อช่องเดียว และไม่มีรหัสต้องห้ามใน B3/B4
  const baseline = meanValidLatency(b3.filter((a) => a.subAnswers === undefined));
  const mean4 = meanValidLatency(b4);
  const forbidden = [...b3, ...b4].some((a) =>
    misconceptionsOf(a).some((id) => cfg.trend.forbidMisconceptions.includes(id)),
  );
  const trending =
    baseline !== null && mean4 !== null && !forbidden && mean4 <= cfg.trend.maxRatio * baseline;
  return { outcome: trending ? 'passed-trend' : 'not-passed', metrics, trayFlag };
}

// ระดับคล่องของรอบฝึก/ทบทวน: ถูกและเร็วตามระดับ ≥ minFluent → ระดับนั้น (ตรวจ "อัตโนมัติ" ก่อน)
export function roundLevel(
  answers: readonly AnsweredPayload[],
  skills: readonly Skill[],
  skillId: SkillId,
): 'noCount' | 'automatic' | 'none' {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill?.fluency || !skill.review) return 'none';
  const list = firstAttempts(answers);
  const min = skill.review.round.minFluent;
  const fastAt = (ms: number): number => list.filter((a) => isFastAnswer(a, ms)).length;
  if (fastAt(skill.fluency.automaticMs) >= min) return 'automatic';
  if (fastAt(skill.fluency.noCountMs) >= min) return 'noCount';
  return 'none';
}

export function flagsFor(flags: readonly (LessonFlag | false)[]): LessonFlag[] {
  return flags.filter((f): f is LessonFlag => f !== false);
}
