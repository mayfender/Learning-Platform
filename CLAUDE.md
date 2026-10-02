# Learning Platform

เว็บแอปบทเรียนคณิตศาสตร์สำหรับลูกสาววัย 9 ขวบของเจ้าของโปรเจกต์ (พ่อ) เน้นความเข้าใจและการเห็นภาพในหัว ไล่จาก บวก → ลบ → คูณ → หาร

## เริ่มทุก session ด้วยการอ่าน
1. **[docs/STATUS.md](docs/STATUS.md)**: สถานะล่าสุด งานค้าง และขั้นถัดไป (สำคัญที่สุด)
2. [roles/README.md](roles/README.md): 2 role ที่ใช้งาน ลำดับส่งต่องาน และกติการ่วม
3. อ่านเพิ่มเฉพาะที่เกี่ยวกับงาน
   - [docs/math-learning-plan.md](docs/math-learning-plan.md): เป้าหมายและหลักการสอน
   - [docs/architecture/overview.md](docs/architecture/overview.md) + `docs/architecture/adr/`: สถาปัตยกรรม
   - `docs/lessons/`: Lesson Spec (Learning Designer)
   - `docs/mockups/`, `docs/specs/`: mockup และ Tech Spec (Builder) พร้อมรายงานการพัฒนาท้ายไฟล์
   - `docs/test-plans/`, `docs/test-reports/`: งานของ Tester เดิม (role ปิดใช้งานแล้ว เก็บไว้อ้างอิง)
4. เช็คงานที่ค้างในเครื่อง: `git status` และ `git log origin/main..HEAD` (อาจมีงานของ agent จาก session ก่อนที่ยังไม่ commit หรือยังไม่ push)

## วิธีทำงาน
- **ระบบ role ใหม่ (ตัดสินเมื่อ 2026-10-02):** ใช้ 2 role: **Learning Designer** ([roles/learning-designer.md](roles/learning-designer.md), Opus) และ **Builder** ([roles/builder.md](roles/builder.md), Sonnet, รวม UX/UI + Developer) role เดิม (Architect, Developer, Tester, UX/UI Designer) **ปิดใช้งาน** อยู่ที่ `roles/disabled/` ห้าม spawn
- ลำดับงาน: Learning Designer ทำ Lesson Spec → พ่ออนุมัติ → Builder ทำ mockup (`docs/mockups/<รหัสงาน>/`) → พ่อดูและอนุมัติ mockup → Builder เขียน Tech Spec สั้น โค้ด เทสต์ และทดสอบเอง → เปิด PR → ผู้ประสานงานตรวจเอง (รันเทสต์ ลองเล่นในเบราว์เซอร์ อ่านผล CI) → พ่ออนุมัติ → merge → พ่อลองกับลูก (แต่ละขั้น spawn agent ของ role นั้น จบขั้นแล้วกลับมารายงานพ่อที่ session หลักและรอคำสั่งก่อนไปขั้นถัดไป ดูหัวข้อ "หน้าที่ของ session หลัก")
- ไม่มี Tester อิสระแล้ว ผู้ประสานงานต้องตรวจงานของ Builder เข้มขึ้น: รันเทสต์ซ้ำเอง และลองเล่นจริงในเบราว์เซอร์ทุกครั้ง ตรวจสิ่งที่ลูกเห็นจริง
- รหัสงาน: `ADD-04`, `DX-ADD` ฯลฯ ใช้ชื่อไฟล์เดียวกันทั้งใน `docs/lessons/` และ `docs/specs/`
- ห้ามเปลี่ยนเนื้อหาการสอน โจทย์ หรือเฉลยที่อนุมัติแล้ว ถ้าเจอปัญหา ให้รายงานกลับไปที่ role ต้นทาง
- **อัปเดต `docs/STATUS.md` ทุกครั้งที่งานเปลี่ยนสถานะ** (เริ่ม เสร็จ อนุมัติ หรือมีการตัดสินใจใหม่)
- สื่อสารกับเจ้าของโปรเจกต์เป็นภาษาไทย ส่วนชื่อในโค้ดเป็นภาษาอังกฤษ

## หน้าที่ของ session หลัก (ผู้ประสานงาน)
session ที่คุยกับพ่อโดยตรงคือผู้ประสานงาน มีหน้าที่ดังนี้
- **งานของทั้ง 2 role ที่ใช้งาน (Learning Designer, Builder) ทุกชิ้น ทั้งเล็กและใหญ่ รวมถึงการตรวจงานในบทของ role นั้น ให้ spawn ไปยัง agent ของ role นั้น** ที่ใช้ model ตามไฟล์ role (Learning Designer = Opus, Builder = Sonnet) ห้ามทำแทนใน session หลัก (เขียน/แก้ Lesson Spec, วิเคราะห์ผลลูก, ตอบคำถามเชิงการสอน, แก้ ADR/spec/config, แก้โค้ด) session หลักทำหน้าที่ผู้ประสานงานล้วนๆ: คุยกับพ่อ ส่งงาน ตรวจรายงาน commit และ push
- **วงจรการทำงาน (ตัดสินเมื่อ 2026-09-30):** ผู้ประสานงาน spawn agent ที่รับผิดชอบ → agent ทำเสร็จ (landing) → **กลับมาที่ session หลักเพื่อรายงานพ่อ แล้วรอคำสั่งถัดไป** ห้ามส่งต่อให้ role ถัดไปเองโดยอัตโนมัติ ก่อนรายงานให้ตรวจงานของ agent เองตามข้อ "ห้ามเชื่อรายงานของ agent" และข้อสงสัยที่เจอให้เสนอเป็นงานถัดไปของ role ที่เป็นเจ้าของในรายงาน (เรื่องที่ต้องให้พ่อตัดสินให้ถามพ่อ) รอพ่อสั่งให้ส่ง agent ไหนต่อ
- **คำสั่งที่ส่งให้ subagent ต้องมีครบ:** ไฟล์ role ที่ต้องอ่าน, spec ที่ใช้, ชื่อ feature branch ที่ทำงานอยู่ (ดูหัวข้อ "Branch และ PR"), ขอบเขต (ไฟล์ไหนแก้ได้/ห้ามแก้), คำตอบของคำถามที่ตัดสินแล้ว, "commit/push ได้เฉพาะ feature branch ห้ามแตะ `main` ห้าม merge ห้าม force-push", "ปิด server ที่เปิด", "รันเทสต์แบบ project เดียวระหว่างแก้ แล้วค่อยรันครบตอนจบ" และรูปแบบรายงานกลับ (ภาษาไทย สั้น)
- **คำสั่งของ Designer agent:** ให้อ่านไฟล์ role, `docs/math-learning-plan.md`, Lesson Spec ที่เกี่ยว, ผลของลูก (ไฟล์ export ห้าม commit) และคำตอบของพ่อ พร้อมระบุว่าเขียน/แก้ไฟล์ไหนใน `docs/lessons/` และรายงานกลับเป็นภาษาไทย พร้อมคำถามที่ต้องให้พ่อตัดสิน
- **ห้ามเชื่อรายงานของ agent ก่อนตรวจเอง:** รันเทสต์ซ้ำเอง และ**ลองเล่นจริงในเบราว์เซอร์** (preview ตั้งไว้ใน `.claude/launch.json` ชื่อ `dev`) บั๊กร้ายแรงของ M1 ทั้ง 2 ตัวเจอด้วยวิธีนี้ ทั้งที่เทสต์ของ Developer ผ่านหมด
- **`main` แตะได้เฉพาะผู้ประสานงาน** commit/push เข้า `main` และ merge PR เป็นหน้าที่ของผู้ประสานงานเท่านั้น (agent ของ role อื่น commit/push ได้เฉพาะ feature branch) และ **push/merge เข้า `main` = deploy ขึ้นเว็บที่ลูกใช้** ให้ทำเฉพาะเมื่อผ่านการตรวจของผู้ประสานงานและ CI แล้วและพ่ออนุมัติ หรือเป็นงานเอกสารหรือ config ที่ไม่กระทบแอป
- ถ้า session ขาดกลางคัน subagent จะหยุดด้วย session ใหม่ให้ดู `git status` แล้วส่ง subagent ใหม่ไปทำต่อจากงานที่ค้างในเครื่อง

## Branch และ PR (ตัดสินเมื่อ 2026-09-30 ใช้กับ task ใหม่ทุกชิ้นนับจากนี้)
1. **เริ่ม task ใหม่:** สั่ง **Builder** (หรือผู้ประสานงาน) สร้าง feature branch ของทีมจาก `main` ล่าสุด ชื่อ `feature/<รหัสงาน>-<ชื่อสั้น>` (เช่น `feature/ADD-05-tens`) แล้ว `git push -u origin <branch>` และบันทึกชื่อ branch ไว้ในหัว Tech Spec กับ `docs/STATUS.md` ทุก role ทำงานบน branch นี้ (รวมถึงเอกสารของ Learning Designer)
2. **ระหว่างทำ:** agent ทุก role commit และ push ได้**เฉพาะ feature branch** เป็น commit เล็กๆ ที่สื่อความหมาย ห้ามแตะ `main` ห้าม merge ห้าม force-push
3. **Builder ทำเสร็จ:** Builder เปิด PR (`gh pr create --base main --head <branch>`) แล้ว**ใส่รายละเอียดเป็น comment บน PR** ตามรูปแบบรายงานส่งงานใน [roles/builder.md](roles/builder.md) (สิ่งที่ทำ, AC, ผลเทสต์, ทดสอบบนเบราว์เซอร์, สิ่งที่ต่างจาก Spec, คำถาม) ผู้ประสานงานตรวจ PR เอง
4. **Learning Designer ตรวจตาม Lesson Spec** (เป็น comment บน PR) เมื่อพ่อสั่ง: ลำดับ จังหวะ ข้อความ และเฉลยต้องตรงสเปค
5. ถ้ามีข้อที่ต้องแก้ ส่งกลับ Builder แก้บน branch เดิม
6. **ผู้ประสานงาน:** หลัง agent แต่ละตัว landing ให้ตรวจเองบน branch (รันเทสต์ ลองเล่นในเบราว์เซอร์) ผูก PR กับ session ด้วยเครื่องมือ `ccd_pr` แล้วอ่านผล CI ผ่านเครื่องมือนั้น (ห้ามวนเช็ค CI เอง) รายงานพ่อ และ **merge เข้า `main` เมื่อผ่านการตรวจของผู้ประสานงาน (และ Learning Designer ถ้าพ่อสั่ง) และพ่ออนุมัติเท่านั้น** CI รันบน PR อยู่แล้ว (lint, test, e2e, acceptance, build) ส่วน deploy เกิดเฉพาะตอน merge เข้า `main`
7. งานที่เป็นเอกสารล้วนและไม่กระทบแอป (เช่น แก้ workflow, STATUS) ผู้ประสานงาน commit เข้า `main` ตรงได้

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
| `npm run e2e` | e2e ของ Builder: Playwright 3 project (android-tablet, phone, desktop) ระหว่างพัฒนาใช้ `--project=android-tablet` |
| `npm run acceptance` | acceptance test (3 project เดียวกัน) รันกับ dev server ได้ด้วย `E2E_DEV=1 npm run acceptance` |
| `npm run build` | build ลง `dist/` |

## Git และ deploy
- Repo (public): https://github.com/mayfender/Learning-Platform ใช้ branch `main`
- push เข้า `main` แล้ว GitHub Actions รัน lint → test → e2e → acceptance → build → deploy ถ้าขั้นไหนไม่ผ่านจะไม่ deploy
- เว็บ: https://mayfender.github.io/Learning-Platform/
- ก่อน commit โค้ดต้องให้ lint, test, e2e และ acceptance ผ่าน **ห้าม commit ข้อมูลหรือไฟล์ export ของลูก** (repo เป็น public)
- ท้าย commit message ใส่บรรทัด `Co-Authored-By` ตามที่ระบบกำหนด
