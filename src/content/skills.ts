import type { ReviewConfig, Skill } from '@/engine/types';

export type { ReviewConfig, Skill };

// ADR-0006 / LS ADD-04 §6.2: ช่วงทบทวนและกลุ่มความเข้าใจผิดที่รีเซ็ตกล่อง (Designer แก้ที่นี่ที่เดียว)
const LEITNER_REVIEW: ReviewConfig = {
  intervalsDays: [1, 2, 4, 7, 14],
  boxLevels: ['noCount', 'noCount', 'automatic', 'automatic', 'automatic'],
  round: { count: 4, minFluent: 3 },
  resetOn: ['L1', 'M4', 'M6', 'M7'],
};

// ทักษะที่ไม่มี `review` ไม่เข้าระบบ Leitner (DX-ADD ไม่ใช้ fluency ของทักษะ ใช้ `fluentMs` ต่อข้อเดิม)
export const skills: Skill[] = [
  { id: 'add.subitize-10', ladderStep: 1, title: 'เห็นภาพ 10 ช่องทันที' },
  {
    id: 'add.bonds-10',
    ladderStep: 2,
    title: 'คู่รวม 10',
    fluency: { noCountMs: 5000, automaticMs: 3000 }, // LS ADD-04 §6.1
    review: LEITNER_REVIEW,
  },
  { id: 'add.doubles', ladderStep: 3, title: 'เลขคู่' },
  {
    id: 'add.make-10',
    ladderStep: 4,
    title: 'ทำให้ครบ 10',
    fluency: { noCountMs: 8000, automaticMs: 5000 },
    review: LEITNER_REVIEW,
  },
  { id: 'add.tens', ladderStep: 5, title: 'บวกจำนวนเต็มสิบ' },
  { id: 'add.2digit', ladderStep: 6, title: 'บวกเลขสองหลัก' },
];
