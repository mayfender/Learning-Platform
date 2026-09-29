import type { SkillId } from '@/engine/types';

export interface Skill {
  id: SkillId;
  ladderStep: number;
  title: string;
}

// เกณฑ์ Leitner ยังรอ ADR-0006 — M1 มีแค่ทะเบียนทักษะ (Tech Spec §4.2)
export const skills: Skill[] = [
  { id: 'add.subitize-10', ladderStep: 1, title: 'เห็นภาพ 10 ช่องทันที' },
  { id: 'add.bonds-10', ladderStep: 2, title: 'คู่รวม 10' },
  { id: 'add.doubles', ladderStep: 3, title: 'เลขคู่' },
  { id: 'add.make-10', ladderStep: 4, title: 'ทำให้ครบ 10' },
  { id: 'add.tens', ladderStep: 5, title: 'บวกจำนวนเต็มสิบ' },
  { id: 'add.2digit', ladderStep: 6, title: 'บวกเลขสองหลัก' },
];
