# Learning Platform

เว็บแอปบทเรียนคณิตศาสตร์สำหรับลูกสาววัย 9 ขวบของเจ้าของโปรเจกต์ (พ่อ) เน้นความเข้าใจและการเห็นภาพในหัว ไล่จาก บวก → ลบ → คูณ → หาร

## เริ่มทุก session ด้วยการอ่าน
1. **[docs/STATUS.md](docs/STATUS.md)**: สถานะล่าสุด งานค้าง และขั้นถัดไป (สำคัญที่สุด)
2. [roles/README.md](roles/README.md): 3 role ลำดับส่งต่องาน และกติการ่วม
3. อ่านเพิ่มเฉพาะที่เกี่ยวกับงาน
   - [docs/math-learning-plan.md](docs/math-learning-plan.md): เป้าหมายและหลักการสอน
   - [docs/architecture/overview.md](docs/architecture/overview.md) + `docs/architecture/adr/`: สถาปัตยกรรม
   - `docs/lessons/`: Lesson Spec (Designer)
   - `docs/specs/`: Tech Spec (Architect) พร้อมรายงานการพัฒนาท้ายไฟล์

## วิธีทำงาน
- ทำงานผ่าน 3 role ตามไฟล์ใน `roles/` โดยแต่ละ role มี AI model ที่กำหนดไว้ในไฟล์ของ role นั้น
- ลำดับงาน: Lesson Spec → พ่ออนุมัติ → Tech Spec → Developer → Architect ตรวจ → Designer ตรวจ → พ่อลองกับลูก
- รหัสงาน: `ADD-04`, `DX-ADD` ฯลฯ ใช้ชื่อไฟล์เดียวกันทั้งใน `docs/lessons/` และ `docs/specs/`
- ห้ามเปลี่ยนเนื้อหาการสอน โจทย์ หรือเฉลยที่อนุมัติแล้ว ถ้าเจอปัญหา ให้รายงานกลับไปที่ role ต้นทาง
- **อัปเดต `docs/STATUS.md` ทุกครั้งที่งานเปลี่ยนสถานะ** (เริ่ม เสร็จ อนุมัติ หรือมีการตัดสินใจใหม่)
- สื่อสารกับเจ้าของโปรเจกต์เป็นภาษาไทย ส่วนชื่อในโค้ดเป็นภาษาอังกฤษ

## Stack และคำสั่ง
React + TypeScript (strict) + Vite, PWA, IndexedDB (event log), Vitest + Playwright

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | dev server |
| `npm run lint` | ESLint + type check + Prettier |
| `npm test` | Vitest |
| `npm run e2e` | Playwright 4 project (android-tablet, phone, ipad, desktop) |
| `npm run build` | build ลง `dist/` |

## Git และ deploy
- Repo (public): https://github.com/mayfender/Learning-Platform ใช้ branch `main`
- push เข้า `main` แล้ว GitHub Actions รัน lint → test → e2e → build → deploy
- เว็บ: https://mayfender.github.io/Learning-Platform/
- ต้องให้ lint, test, e2e ผ่านก่อน commit และห้าม commit ข้อมูลหรือไฟล์ export ของลูก
