# ADR-0005: อุปกรณ์จำลองเป็น React component ที่วาดด้วย SVG

- สถานะ: ยอมรับ
- วันที่: 2026-09-29

## บริบท
อุปกรณ์จำลอง (ten-frame, ลูกคิด 2 แถว, number bond, เส้นจำนวนเปล่า, ก้อนหลักสิบ-หน่วย) ต้องใช้ซ้ำได้ทุกวิชา ต้องแตะ ลาก แฟลช และซ่อนได้ (F2, F3) คมทุกขนาดจอ (N1) รองรับ dark mode (N3) และลื่นบนแท็บเล็ต (N6)

## ทางเลือก
| ทางเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **SVG** | คมทุกขนาด จัดสีด้วย CSS variable ได้ แตะแต่ละชิ้นได้ และอ่านได้ด้วย screen reader | ถ้าชิ้นส่วนเป็นพันจะช้า (แอปนี้ไม่ถึง) |
| Canvas | เร็วมากเมื่อมีวัตถุเยอะ | ต้องเขียน hit-test เอง, dark mode และ accessibility ยาก |
| DOM (div) | ง่าย | วาดเส้นโค้งหรือเส้นจำนวนยาก |

## การตัดสินใจ
เลือก **SVG ใน React component** อยู่ที่ `src/manipulatives/` ทุกชิ้นใช้ props กลาง

```ts
interface ManipulativeBaseProps {
  mode: 'show' | 'flash' | 'hidden';  // flash = แสดงตาม flashMs แล้วซ่อนเอง
  flashMs?: number;                  // ค่าจาก Lesson Spec
  onFlashEnd?: () => void;
  interactive?: boolean;             // false = ดูอย่างเดียว
  size?: 'sm' | 'md' | 'lg';
  label?: string;                    // ข้อความสำหรับ screen reader
}
```

props เฉพาะของแต่ละชิ้น (ร่าง Tech Spec จะกำหนดละเอียด)
- `TenFrame`: `filled: number` (0–10), `frames?: 1 | 2`, `onCellTap?(index)`
- `Abacus`: `rows: [number, number]` เม็ดละแถวไม่เกิน 10 แบ่งสีทีละ 5, `onBeadMove?`
- `NumberBond`: `whole`, `parts: [a, b]`, `blank?: 'whole' | 'a' | 'b'`
- `NumberLine`: `from`, `to`, `jumps: { from, to, label? }[]`
- `BaseTenBlocks`: `tens`, `ones`, `onGroup?` (รวม 10 หน่วยเป็น 1 สิบ)

กติกา
- สีใช้ design token เท่านั้น แถว 5 แรกและ 5 หลังต้องต่างสีกันชัดเจนทั้ง light และ dark
- จุดที่แตะได้ ≥ 48px (ขยาย hit area ด้วย element โปร่งใสได้)
- animation ใช้ CSS transition และปิดเมื่อ `prefers-reduced-motion`
- การจับเวลาแฟลชอยู่ใน component แต่การจับเวลาตอบเป็นงานของ engine
- ใช้ Pointer Events เพื่อให้ใช้ได้ทั้งนิ้ว เมาส์ และปากกา

## ผลที่ตามมา
- มีหน้า "ห้องเครื่องมือ" (`/#/dev/manipulatives`) สำหรับดูและทดสอบทุกชิ้นในทุกโหมด ใช้เฉพาะตอนพัฒนา

## แก้ไข 2026-09-30: ความสามารถเพิ่มสำหรับ M2 (ADD-04)
ไม่เปลี่ยนการตัดสินใจ (SVG + React + props กลาง) แค่ขยาย API ตามที่ Lesson Spec ADD-04 ต้องการ รายละเอียดและ API เต็มอยู่ที่ [Tech Spec ADD-04 §3](../specs/ADD-04-make-ten.md)
- `TenFrame`: เพิ่ม `added` (ช่องที่เติมเพิ่ม สีใหม่), `highlight` (วงแหวน/กะพริบ), `onCellTap(index, state)` เมื่อ `interactive` แต่ละช่องมีพื้นที่แตะ ≥ 48px
- `NumberBond`: ช่องตัวเลขเป็น `number | '?' | null` (`null` = ยังไม่ปรากฏ) เพื่อให้ขึ้นตามการกระทำของลูก
- ชิ้นใหม่: `DotPile` และ `MakeTenBoard` (กล่อง 10 ช่อง + กองจุด แฟลชพร้อมกันได้ ลากจุดจากกองเข้ากล่องด้วย Pointer Events และมีทางแตะช่องแทนการลาก)
- ทุกชิ้นที่ลากได้ใช้ `touch-action: none` เฉพาะตัวที่ลาก และมีทางเลือกแบบแตะเสมอ
- จุดทุกจุดเป็น `<circle data-dot>` ส่วนวงแหวนไฮไลต์และพื้นที่แตะห้ามเป็น `<circle>` เพราะเทสต์นับจุดจาก element ที่เป็นจุด
- animation ทุกอย่างใหม่ (จุดโผล่ กลับกอง กะพริบ) ปิดเมื่อ `prefers-reduced-motion` ส่วนเวลาแฟลชไม่เปลี่ยน (กฎเดิม)
