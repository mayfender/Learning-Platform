import type { Misconception } from '@/engine/types';

// LS §3 ตามตัวอักษร (M1–M12, MX)
export const addMisconceptions: Misconception[] = [
  {
    id: 'M1',
    description: 'ไม่เห็นโครงสร้าง 5 ต้องนับทีละจุดแต่ไม่ทัน',
    observedBy: 'แฟลชแล้วตอบคลาด ±1',
  },
  {
    id: 'M2',
    description: 'เห็นแค่แถวบนที่เต็ม 5',
    observedBy: 'แฟลชจุดเกิน 5 แล้วตอบ 5',
  },
  {
    id: 'M3',
    description: 'นับช่องว่างแทนจุด',
    observedBy: 'แฟลชแล้วตอบ 10 − จำนวนจุด',
  },
  {
    id: 'M4',
    description: 'โจทย์หาตัวที่หายไป เอาตัวเลขที่เห็นมาบวกกัน',
    observedBy: '7 + ? = 10 ตอบ 17',
  },
  {
    id: 'M5',
    description: 'นับพลาด 1 (นับตัวตั้งซ้ำหรือนับขาด)',
    observedBy: 'ตอบคลาด ±1 และไม่ได้ใช้วิธีที่ระบุใน M8/M7/M12',
  },
  {
    id: 'M6',
    description: 'ตอบแค่หลักหน่วย ลืมสิบที่ได้',
    observedBy: 'ตอบ = คำตอบ − 10 (เช่น 8+5 ตอบ 3)',
  },
  {
    id: 'M7',
    description: 'แยกให้ครบ 10 แล้วไม่หักส่วนที่ใช้เติมออก',
    observedBy: '8+5 → 8+2=10 แล้ว +5 ได้ 15',
  },
  {
    id: 'M8',
    description: 'ใช้เลขคู่แต่ชดเชยผิด',
    observedBy: '7+8 ตอบ 14 หรือ 16 และบอกว่าใช้เลขคู่',
  },
  {
    id: 'M9',
    description: 'มองหลักสิบเป็นหน่วย (ค่าประจำหลัก)',
    observedBy: '47+10 ตอบ 48, 30+40 ตอบ 7',
  },
  {
    id: 'M10',
    description: 'ลืมทด',
    observedBy: '38+25 ตอบ 53',
  },
  {
    id: 'M11',
    description: 'เอาผลแต่ละหลักมาต่อกันตรงๆ',
    observedBy: '38+25 ตอบ 513',
  },
  {
    id: 'M12',
    description: 'ปัดให้กลมแล้วชดเชยผิด',
    observedBy: '49+26 ตอบ 74 หรือ 76 และบอกว่าปัดเลข',
  },
  {
    id: 'MX',
    description: 'ผิดแบบอื่น',
    observedBy: 'ไม่ตรงกับรูปแบบข้างบน',
  },
];
