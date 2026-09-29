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
