# Learning Platform

เว็บแอปบทเรียนคณิตศาสตร์สำหรับลูกสาววัย 9 ขวบของเจ้าของโปรเจกต์ (พ่อ) เน้นความเข้าใจและการเห็นภาพในหัว ไล่จาก บวก → ลบ → คูณ → หาร

## เริ่มทุก session ด้วยการอ่าน
1. **[docs/STATUS.md](docs/STATUS.md)**: สถานะล่าสุด งานค้าง และขั้นถัดไป (สำคัญที่สุด)
2. [roles/README.md](roles/README.md): 4 role ลำดับส่งต่องาน และกติการ่วม
3. อ่านเพิ่มเฉพาะที่เกี่ยวกับงาน
   - [docs/math-learning-plan.md](docs/math-learning-plan.md): เป้าหมายและหลักการสอน
   - [docs/architecture/overview.md](docs/architecture/overview.md) + `docs/architecture/adr/`: สถาปัตยกรรม
   - `docs/lessons/`: Lesson Spec (Designer)
   - `docs/specs/`: Tech Spec (Architect) พร้อมรายงานการพัฒนาท้ายไฟล์
   - `docs/test-plans/`, `docs/test-reports/`: งานของ Tester
4. เช็คงานที่ค้างในเครื่อง: `git status` และ `git log origin/main..HEAD` (อาจมีงานของ agent จาก session ก่อนที่ยังไม่ commit หรือยังไม่ push)

## วิธีทำงาน
- ทำงานผ่าน 4 role ตามไฟล์ใน `roles/` (Designer, Architect, Developer, Tester) โดยแต่ละ role มี AI model ที่กำหนดไว้ในไฟล์ของ role นั้น
- ลำดับงาน: Lesson Spec → พ่ออนุมัติ → Tech Spec → Developer และ Tester ทำขนานกัน → Tester ทดสอบ → Architect ตรวจ → Designer ตรวจ → พ่อลองกับลูก (แต่ละขั้น spawn agent ของ role นั้น จบขั้นแล้วกลับมารายงานพ่อที่ session หลักและรอคำสั่งก่อนไปขั้นถัดไป ดูหัวข้อ "หน้าที่ของ session หลัก")
- Tester ต้องทำงานเป็นอิสระ: ออกแบบเทสต์จาก spec โดยไม่อ่านโค้ด และรายงานตรงไปที่ Architect และพ่อ
- รหัสงาน: `ADD-04`, `DX-ADD` ฯลฯ ใช้ชื่อไฟล์เดียวกันทั้งใน `docs/lessons/` และ `docs/specs/`
- ห้ามเปลี่ยนเนื้อหาการสอน โจทย์ หรือเฉลยที่อนุมัติแล้ว ถ้าเจอปัญหา ให้รายงานกลับไปที่ role ต้นทาง
- **อัปเดต `docs/STATUS.md` ทุกครั้งที่งานเปลี่ยนสถานะ** (เริ่ม เสร็จ อนุมัติ หรือมีการตัดสินใจใหม่)
- สื่อสารกับเจ้าของโปรเจกต์เป็นภาษาไทย ส่วนชื่อในโค้ดเป็นภาษาอังกฤษ

## หน้าที่ของ session หลัก (ผู้ประสานงาน)
session ที่คุยกับพ่อโดยตรงคือผู้ประสานงาน มีหน้าที่ดังนี้
- **งานของ Designer ทำใน session หลักเอง** รวมถึงการตรวจงานในบท Designer
- **งานของ Architect, Developer และ Tester ทุกชิ้น (ทั้งงานเล็กและงานใหญ่ รวมถึงการตรวจงานในบท Architect) ให้ spawn ไปยัง agent ของ role นั้น** ที่ใช้ model ตามไฟล์ role ห้ามทำแทนใน session หลัก (แก้ ADR/spec/config ตอบคำถาม หรือแก้โค้ด)
- **วงจรการทำงาน (ตัดสินเมื่อ 2026-09-30):** ผู้ประสานงาน spawn agent ที่รับผิดชอบ → agent ทำเสร็จ (landing) → **กลับมาที่ session หลักเพื่อรายงานพ่อ แล้วรอคำสั่งถัดไป** ห้ามส่งต่อให้ role ถัดไปเองโดยอัตโนมัติ ก่อนรายงานให้ตรวจงานของ agent เองตามข้อ "ห้ามเชื่อรายงานของ agent" และตอบ/ตัดสินเฉพาะเรื่องที่เป็นของ Designer หรือพ่อ ส่วนข้อสงสัยที่เป็นของ role อื่นให้เสนอเป็นงานถัดไปในรายงาน รอพ่อสั่งให้ส่ง agent ไหนต่อ
- **คำสั่งที่ส่งให้ subagent ต้องมีครบ:** ไฟล์ role ที่ต้องอ่าน, spec ที่ใช้, ขอบเขต (ไฟล์ไหนแก้ได้/ห้ามแก้), คำตอบของคำถามที่ตัดสินแล้ว, "ห้าม commit/push", "ปิด server ที่เปิด", "รันเทสต์แบบ project เดียวระหว่างแก้ แล้วค่อยรันครบตอนจบ" และรูปแบบรายงานกลับ (ภาษาไทย สั้น)
- **Tester:** ห้ามให้อ่าน `src/`, `tests/e2e/` และหัวข้อรายงานการพัฒนาใน Tech Spec จนกว่าจะเขียนเทสต์เสร็จ
- **ห้ามเชื่อรายงานของ agent ก่อนตรวจเอง:** รันเทสต์ซ้ำเอง และ**ลองเล่นจริงในเบราว์เซอร์** (preview ตั้งไว้ใน `.claude/launch.json` ชื่อ `dev`) บั๊กร้ายแรงของ M1 ทั้ง 2 ตัวเจอด้วยวิธีนี้ ทั้งที่เทสต์ของ Developer ผ่านหมด
- **ผู้ประสานงานเป็นคนเดียวที่ commit** หลังตรวจแล้ว commit ในเครื่องได้เลย แต่ **push = deploy ขึ้นเว็บที่ลูกใช้** ให้ push เฉพาะเมื่องานผ่าน Tester, Architect และ Designer แล้ว หรือเป็นงานเอกสารหรือ config ที่ไม่กระทบแอป
- ถ้า session ขาดกลางคัน subagent จะหยุดด้วย session ใหม่ให้ดู `git status` แล้วส่ง subagent ใหม่ไปทำต่อจากงานที่ค้างในเครื่อง

## บทเรียนจาก M1 (อย่าพลาดซ้ำ)
- **Side effect ห้ามอยู่ใน `setState` updater หรือ reducer** เพราะ React StrictMode ในโหมด dev จะเรียกซ้ำ ทำให้ event ถูกบันทึก 2 เท่า ต้องทดสอบทั้ง `npm run dev` และ production build
- **เทสต์ต้องตรวจสิ่งที่ลูกเห็นจริง** เช่น จำนวนจุดตอนแฟลช ไม่ใช่แค่ตรวจว่าไม่มี error
- **อย่าตั้งค่าตัวเลขตามเทสต์** (เช่น กันแตะเบิ้ลด้วยระยะ 16px) ให้กำหนดจากพฤติกรรมเด็กจริงใน spec ก่อน แล้วค่อยปรับเทสต์ตาม spec
- เทสต์ที่ใช้นาฬิกาปลอม (fake clock) ต้องเลื่อนเวลาให้เดินจริง ไม่งั้นฟีเจอร์ที่ขึ้นกับเวลา (เช่น กันแตะเบิ้ล 400ms) จะดูเหมือนพัง
- แบบทดสอบมีจังหวะคงที่ที่เร่งไม่ได้ (20 ข้อ ≈ 40 วินาที) เทสต์ตรรกะที่ยาวให้รันเฉพาะ desktop

## Stack และคำสั่ง
React + TypeScript (strict) + Vite, PWA, IndexedDB (event log), Vitest + Playwright (Chromium เท่านั้น)

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | dev server (React StrictMode) |
| `npm run lint` | ESLint + Prettier + type check |
| `npm test` | Vitest |
| `npm run e2e` | e2e ของ Developer: Playwright 3 project (android-tablet, phone, desktop) ระหว่างพัฒนาใช้ `--project=android-tablet` |
| `npm run acceptance` | acceptance test ของ Tester (3 project เดียวกัน) รันกับ dev server ได้ด้วย `E2E_DEV=1 npm run acceptance` |
| `npm run build` | build ลง `dist/` |

## Git และ deploy
- Repo (public): https://github.com/mayfender/Learning-Platform ใช้ branch `main`
- push เข้า `main` แล้ว GitHub Actions รัน lint → test → e2e → acceptance → build → deploy ถ้าขั้นไหนไม่ผ่านจะไม่ deploy
- เว็บ: https://mayfender.github.io/Learning-Platform/
- ก่อน commit โค้ดต้องให้ lint, test, e2e และ acceptance ผ่าน **ห้าม commit ข้อมูลหรือไฟล์ export ของลูก** (repo เป็น public)
- ท้าย commit message ใส่บรรทัด `Co-Authored-By` ตามที่ระบบกำหนด
