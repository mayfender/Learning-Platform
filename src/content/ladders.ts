import type { LadderStepInfo } from '@/engine/types';

// ชื่อขั้น 1–9 ของบันไดการบวก คัดจาก docs/math-learning-plan.md §5 คอลัมน์ "เนื้อหา" ตามตัวอักษร
// (ตัดเครื่องหมาย ** ของขั้น 4 ออกตามที่ Tech Spec ระบุ — คำถามเปิด D14)
export const additionLadder: LadderStepInfo[] = [
  { step: 1, name: 'เห็น 5 และ 10 โดยไม่ต้องนับ' },
  { step: 2, name: 'คู่รวม 10 ได้ทันที' },
  { step: 3, name: 'เลขคู่และใกล้เลขคู่' },
  { step: 4, name: 'ทำให้ครบ 10' },
  { step: 5, name: 'บวกสิบและเลขลงตัวสิบ' },
  { step: 6, name: 'แยกหลักสิบกับหน่วย' },
  { step: 7, name: 'กระโดดบนเส้นจำนวน' },
  { step: 8, name: 'ปัดให้กลมแล้วชดเชย' },
  { step: 9, name: 'เลือกวิธีเอง และอธิบายได้ว่าทำไม' },
];
