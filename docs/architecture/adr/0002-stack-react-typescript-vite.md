# ADR-0002: ใช้ React + TypeScript + Vite

- สถานะ: ยอมรับ
- วันที่: 2026-09-29

## บริบท
AI เป็นผู้เขียนโค้ดหลัก เจ้าของโปรเจกต์ตรวจผลจากการใช้งาน ต้องได้ผลเป็นไฟล์ static (ADR-0001) และต้องการความถูกต้องของเนื้อหาสูง (N5)

## ทางเลือก
| ทางเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| HTML + JS ล้วน | ไม่มี build | แยก component ยาก และไม่มี type ตรวจเนื้อหา |
| Svelte + Vite | โค้ดสั้น animation ดี | AI คุ้นน้อยกว่า และ ecosystem เล็กกว่า |
| **React + TypeScript + Vite** | AI เขียนได้แม่นที่สุด เอกสารและ library มาก type ช่วยจับข้อผิดพลาด | bundle ใหญ่กว่า Svelte เล็กน้อย (ไม่เป็นปัญหาสำหรับแอปนี้) |

## การตัดสินใจ
เลือก **React + TypeScript (strict mode) + Vite**
- package manager: `npm` และ commit `package-lock.json`
- runtime: Node.js LTS
- styling: CSS Modules + CSS custom properties (design token ใน `src/styles/tokens.css`) ไม่ใช้ CSS framework
- routing: `react-router` แบบ `HashRouter`
- state ของบทเรียน: reducer ที่เป็น TypeScript ล้วนใน `engine/` (ไม่ผูกกับ React จึงทดสอบได้ง่าย) ไม่ใช้ Redux หรือ state library อื่น
- lint/format: ESLint + Prettier
- ใช้ library เวอร์ชันเสถียรล่าสุด ณ วันที่สร้างโปรเจกต์ และเพิ่ม library ใหม่ต้องมีเหตุผลใน Tech Spec

## ผลที่ตามมา
- engine และเนื้อหาเป็น TypeScript ล้วน ทดสอบได้โดยไม่ต้องเปิดเบราว์เซอร์
- Developer ต้องใช้ type เข้มงวด ห้ามใช้ `any` ในเนื้อหาและ engine
