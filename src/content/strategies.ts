import type { StrategySet } from '@/engine/types';

// LS §5 — 2 ชุดตัวเลือก "หนูคิดยังไง" (Tech Spec §4.2)
export const addStrategySets: StrategySet[] = [
  {
    id: 'add.single-digit',
    options: [
      { id: 'count-fingers', label: 'นับนิ้ว', counting: 'yes' },
      {
        id: 'count-on',
        label: 'นับต่อในใจทีละ 1',
        counting: 'yes',
        example: { text: '9… 10, 11, 12', check: { kind: 'count-on', start: 9, count: 3 } },
      },
      {
        id: 'make-ten',
        label: 'แยกให้ครบ 10',
        counting: 'no',
        example: {
          text: '9+3 = 9+1+2',
          check: {
            kind: 'sums-equal',
            groups: [
              [9, 3],
              [9, 1, 2],
            ],
          },
        },
      },
      {
        id: 'doubles',
        label: 'ใช้เลขคู่',
        counting: 'no',
        example: {
          text: '5+6 = 5+5+1',
          check: {
            kind: 'sums-equal',
            groups: [
              [5, 6],
              [5, 5, 1],
            ],
          },
        },
      },
      { id: 'known', label: 'จำได้เลย', counting: 'no' },
      { id: 'unsure', label: 'บอกไม่ถูก', counting: 'ignore' },
    ],
  },
  {
    id: 'add.two-digit',
    options: [
      { id: 'count-by-one', label: 'นับทีละ 1', counting: 'yes' },
      {
        id: 'column',
        label: 'ตั้งบวกในใจ',
        counting: 'no',
        example: { text: 'หน่วยบวกหน่วย แล้วทด' },
      },
      {
        id: 'split-place',
        label: 'แยกสิบกับหน่วย',
        counting: 'no',
        example: {
          text: '23+14 = 30+7',
          check: {
            kind: 'sums-equal',
            groups: [
              [23, 14],
              [30, 7],
            ],
          },
        },
      },
      {
        id: 'jump-tens',
        label: 'กระโดดทีละสิบ',
        counting: 'no',
        example: {
          text: '23 → 33 → 37',
          check: { kind: 'jumps', start: 23, steps: [10, 4] },
        },
      },
      {
        id: 'round',
        label: 'ปัดเลขให้กลม',
        counting: 'no',
        example: {
          text: '29+5 = 30+4',
          check: {
            kind: 'sums-equal',
            groups: [
              [29, 5],
              [30, 4],
            ],
          },
        },
      },
      { id: 'unsure', label: 'บอกไม่ถูก', counting: 'ignore' },
    ],
  },
];

// LS ADD-04 §4 A3 — "ในหัวเห็นอะไร" (ตัวเลือกและลำดับตามตัวอักษร) บันทึกอย่างเดียว ไม่ตัดสิน
export const addMindView: StrategySet = {
  id: 'add.mind-view',
  options: [
    { id: 'see-box', label: 'เห็นกล่อง 10 ช่อง', counting: 'no' },
    { id: 'see-number', label: 'นึกเป็นตัวเลข', counting: 'no' },
    { id: 'count-fingers', label: 'นับนิ้ว', counting: 'yes' },
    { id: 'count-in-head', label: 'นับในใจ', counting: 'yes' },
    { id: 'unsure', label: 'บอกไม่ถูก', counting: 'ignore' },
  ],
};
