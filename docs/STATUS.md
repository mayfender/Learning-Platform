# Project Status

- อัปเดตล่าสุด: 2026-09-30
- เว็บ: https://mayfender.github.io/Learning-Platform/
- Repo: https://github.com/mayfender/Learning-Platform

> อัปเดตไฟล์นี้ทุกครั้งที่งานเปลี่ยนสถานะ ข้อ "สถานะตอนนี้" และ "ขั้นถัดไป" ต้องตรงกับความจริงเสมอ ประวัติเพิ่มไว้ท้ายไฟล์ ห้ามลบ

## สถานะตอนนี้

**กำลังทำ:** ไม่มีงานที่กำลังพัฒนา M1 (DX-ADD) deploy ขึ้นเว็บแล้ว (CI ผ่านทุกขั้นรวม acceptance)
**รอ:** พ่อทำเช็คลิสต์อุปกรณ์จริง ([รายงานรอบ 2 ข้อ 6](test-reports/DX-ADD-2026-09-30.md)) แล้วให้ลูกทำ DX-ADD และ export ผลส่งให้ Designer

## Milestones

| Milestone | สถานะ | เอกสาร | หมายเหตุ |
|---|---|---|---|
| M0 โครงโปรเจกต์ | ✅ เสร็จ, deploy แล้ว | [specs/M0-scaffold.md](specs/M0-scaffold.md) | AC 12/13 เหลือ AC7 (ติดตั้ง PWA และใช้ offline บนอุปกรณ์จริง) |
| M1 แบบทดสอบวินิจฉัย DX-ADD | ✅ เสร็จ, deploy 2026-09-30 | [lessons/DX-ADD-diagnostic.md](lessons/DX-ADD-diagnostic.md) · [specs/DX-ADD-diagnostic.md](specs/DX-ADD-diagnostic.md) | Test Plan: [test-plans/DX-ADD.md](test-plans/DX-ADD.md) · รายงาน: [รอบ 1](test-reports/DX-ADD-2026-09-29.md), [รอบ 2](test-reports/DX-ADD-2026-09-30.md) |
| M2 บทเรียนแรก | ⏳ ยังไม่เริ่ม | — | ขั้นบนบันไดขึ้นกับผล DX-ADD ของลูก (คาดว่าขั้น 1–4) |
| M3+ บทเรียนถัดไป, Leitner, อุปกรณ์จำลองชิ้นอื่น | ⏳ | — | |

## สถานะเอกสาร

| เอกสาร | สถานะ |
|---|---|
| [math-learning-plan.md](math-learning-plan.md) | ใช้งาน (ข้อ 7.2 ชี้ไปที่เว็บแอปแล้ว) |
| [architecture/overview.md](architecture/overview.md) | ใช้งาน |
| ADR-0001 ถึง 0005, 0007 | ยอมรับ (0007 แก้ 2026-09-30: ตัด iPad) |
| ADR-0006 ระบบทบทวน Leitner | **เสนอ** รอ Designer กำหนดช่วงเวลาและเกณฑ์คล่อง (ทำพร้อม M2) |
| Lesson Spec DX-ADD | อนุมัติแล้ว 2026-09-29 (ชี้แจง §4 เมื่อ 2026-09-30) |
| Tech Spec M0 | เสร็จ |
| Tech Spec DX-ADD | เสร็จ (มี §3.3.1 กันแตะเบิ้ล 400ms เพิ่ม 2026-09-30) |
| Test Plan / Test Report DX-ADD | รอบ 2 ผ่าน |
| [roles/](../roles/README.md) | 4 role: Designer, Architect, Developer, Tester |

## การตัดสินใจสำคัญ (ของเจ้าของโปรเจกต์)

| วันที่ | การตัดสินใจ |
|---|---|
| 2026-09-29 | แบ่งงาน 3 role: Designer (Opus), Architect (Sonnet), Developer (Sonnet) (ต่อมาเพิ่ม Tester) |
| 2026-09-29 | Static web + เก็บข้อมูลในเครื่อง (IndexedDB) ไม่ใช้ Claude Artifact และไม่ใช้ cloud DB |
| 2026-09-29 | AI เขียนโค้ดเป็นหลัก ใช้ React + TypeScript |
| 2026-09-29 | รองรับแท็บเล็ต Android, มือถือ, คอมพิวเตอร์ และ iPad |
| 2026-09-29 | Repo เป็น public และ host บน GitHub Pages ไม่ใช้ custom domain |
| 2026-09-29 | อนุมัติ DX-ADD v2: ไม่บอกถูก/ผิดระหว่างทำ, ข้ามด่าน 5 ถ้าด่าน 4 ถูก ≤ 1 ข้อ |
| 2026-09-29 | รับข้อเสนอ D1–D15 ของ Architect ใน Tech Spec DX-ADD ทั้งหมด |
| 2026-09-29 | เพิ่ม role Tester (Sonnet) ทำงานอิสระจาก Developer: ออกแบบเทสต์จาก spec โดยไม่อ่านโค้ด |
| 2026-09-29 | ชื่อแอปชั่วคราว "บทเรียนคณิตศาสตร์" (ชื่อสั้น "คณิต") และ icon ten-frame สีส้ม |
| 2026-09-29 | ให้ Tester ตรวจก่อน deploy ทุกครั้ง และลดขอบเขต acceptance: เทสต์ตรรกะที่ยาวรันเฉพาะ desktop ส่วนเรื่องที่ขึ้นกับอุปกรณ์รันครบ |
| 2026-09-30 | ตัด iPad ออกจากชุดทดสอบ (ลูกไม่ใช้ iPad) ทดสอบเฉพาะ Chrome บนแท็บเล็ต Android, มือถือ และคอมพิวเตอร์ ส่วน iPad ใช้ได้แบบ best-effort |

## งานค้าง / รอคำตอบ

- [ ] พ่อทำเช็คลิสต์อุปกรณ์จริงท้ายรายงาน Tester รอบ 2 (รวม M0 AC7: ติดตั้ง PWA และเปิด offline)
- [ ] ลูกทำ DX-ADD แล้วพ่อ export ไฟล์ผลส่งให้ Designer
- [ ] Q6 (Architect): เวลาของข้อ 5.3/5.4 ถูกตัดทิ้ง (`*`) ในการทดสอบครั้งหนึ่ง แต่ทำซ้ำไม่ได้ ให้สังเกตบนอุปกรณ์จริง
- [ ] ชื่อแอปและ icon ถาวร (ไม่รีบ)

## ขั้นถัดไป

1. พ่อทำเช็คลิสต์อุปกรณ์จริง แล้วให้ลูกทำ DX-ADD
2. พ่อ export ไฟล์ผลส่งให้ Designer (ห้าม commit ไฟล์นี้)
3. Designer วิเคราะห์ผล แล้วเขียน Lesson Spec บทเรียนแรก (M2) พร้อมกำหนดเกณฑ์ ADR-0006

## ประวัติ

| วันที่ | เหตุการณ์ |
|---|---|
| 2026-09-29 | สร้างไฟล์ role 3 ไฟล์ และคัดลอกแผนเข้าโปรเจกต์ |
| 2026-09-29 | ตัดสิน ADR-0001 ถึง 0007 และเขียน Architecture Overview |
| 2026-09-29 | สร้าง repo public บน GitHub |
| 2026-09-29 | Designer เขียน Lesson Spec DX-ADD v2 และพ่ออนุมัติ |
| 2026-09-29 | Architect เขียน Tech Spec M0 และ DX-ADD |
| 2026-09-29 | Developer ทำ M0 เสร็จ (lint ผ่าน, unit 53/53, e2e 32/32) CI ผ่าน และ deploy ขึ้น GitHub Pages |
| 2026-09-29 | เริ่ม M1 (DX-ADD) ในบท Developer |
| 2026-09-29 | Developer ส่ง M1 (unit 257/257, e2e 39 ผ่าน) Designer ตรวจเนื้อหาตรง Lesson Spec แต่ Architect ลองเล่นจริงแล้วพบว่าแฟลช ten-frame ไม่แสดงจุด จึงส่งกลับแก้ พร้อมให้เพิ่มเทสต์และปรับ outbox ให้ flush จนคิวว่าง |
| 2026-09-29 | Architect ตรวจรอบ 2: แฟลชแก้แล้ว แต่พบ event ถูกบันทึกซ้ำ 2 เท่า (StrictMode) จึงส่งกลับแก้อีกรอบ |
| 2026-09-29 | เพิ่ม role Tester และปรับลำดับงานใน roles/README.md และ CLAUDE.md |
| 2026-09-29 | Developer แก้บั๊ก event ซ้ำ (ย้าย side effect ออกจาก setState updater) Architect ยืนยันบน dev server ว่าได้ 20/1/1 event, unit 262/262, e2e 44 ผ่าน ตรวจผ่านทั้ง Architect และ Designer |
| 2026-09-29 | Tester ตรวจ M1 รอบ 1 (acceptance 97 เคส ตามขอบเขตที่ลด: production 119 ผ่าน/12 ไม่ผ่านต่อ project, dev TC-20 ผ่าน; ชุดเต็มก่อนลดขอบเขต 196/21) เนื้อหา คณิตศาสตร์ event และแฟลชผ่านหมด แต่พบ Major 2 (แตะซ้ำที่ตัวเลือกวิธีคิดบนอุปกรณ์แนวตั้ง, dark mode ไฮไลต์บันไดอ่านไม่ออก) และ Minor 2 → ปล่อยไม่ได้ ส่งกลับ Developer |
| 2026-09-30 | Architect ไม่รับวิธีกันแตะเบิ้ลแบบตำแหน่ง 16px/250ms และกำหนดกฎใหม่ใน Tech Spec §3.3.1 (ไม่รับ input 400ms หลังเปลี่ยนหน้า) Developer กำลังแก้ |
| 2026-09-30 | ตัด project ipad ออกจาก Playwright และ CI ติดตั้งเฉพาะ Chromium (ADR-0007) |
| 2026-09-30 | Tester ทดสอบซ้ำ M1 รอบ 2 (commit 0b8bfe1, matrix 3 project): BUG-01–04 และ S1–S3 แก้แล้ว, acceptance 124 ผ่าน/0 ไม่ผ่าน, lint ผ่าน, vitest 270/270 → ปล่อยได้ ส่งต่อ Architect |
| 2026-09-30 | Designer ตอบคำถามของ Tester: Q1 (เงื่อนไข "ด่าน 5 ถูกข้าม" ในแถว 5 ตั้งใจใส่กันไว้ ไม่มีผล), Q2 (ชี้แจงใน Lesson Spec §4 ว่าตารางรายข้อคือคำตัดสินสุดท้าย), Q7 (ข้อความหน้าพ่อตาม D13 ยอมรับ) |
| 2026-09-30 | M1 ผ่าน Architect และ Designer แล้ว push เพื่อ deploy |
| 2026-09-30 | CI ผ่านทุกขั้น (lint, test, e2e, acceptance, build) และ deploy M1 ขึ้นเว็บแล้ว |
| 2026-09-30 | ตรวจเอกสารสำหรับส่งต่อ session: CLAUDE.md เพิ่มหน้าที่ผู้ประสานงานและบทเรียนจาก M1, overview เพิ่ม acceptance, roles/README เพิ่มผู้ประสานงาน |
