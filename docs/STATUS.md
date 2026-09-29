# Project Status

- อัปเดตล่าสุด: 2026-09-29
- เว็บ: https://mayfender.github.io/Learning-Platform/
- Repo: https://github.com/mayfender/Learning-Platform

> อัปเดตไฟล์นี้ทุกครั้งที่งานเปลี่ยนสถานะ ข้อ "สถานะตอนนี้" และ "ขั้นถัดไป" ต้องตรงกับความจริงเสมอ ประวัติเพิ่มไว้ท้ายไฟล์ ห้ามลบ

## สถานะตอนนี้

**กำลังทำ:** M1 ภารกิจสำรวจการบวก (DX-ADD) ในบท Developer
**รอ:** พ่อทดสอบติดตั้ง PWA บนอุปกรณ์จริง (M0 AC7)

## Milestones

| Milestone | สถานะ | เอกสาร | หมายเหตุ |
|---|---|---|---|
| M0 โครงโปรเจกต์ | ✅ เสร็จ, deploy แล้ว | [specs/M0-scaffold.md](specs/M0-scaffold.md) | AC 12/13 เหลือ AC7 (ติดตั้ง PWA และใช้ offline บนอุปกรณ์จริง) |
| M1 แบบทดสอบวินิจฉัย DX-ADD | 🔨 กำลังพัฒนา | [lessons/DX-ADD-diagnostic.md](lessons/DX-ADD-diagnostic.md) · [specs/DX-ADD-diagnostic.md](specs/DX-ADD-diagnostic.md) | หลัง Developer ส่งงาน: Architect ตรวจ → Designer ตรวจ → deploy → ให้ลูกทำ |
| M2 บทเรียนแรก | ⏳ ยังไม่เริ่ม | — | ขั้นบนบันไดขึ้นกับผล DX-ADD ของลูก (คาดว่าขั้น 1–4) |
| M3+ บทเรียนถัดไป, Leitner, อุปกรณ์จำลองชิ้นอื่น | ⏳ | — | |

## สถานะเอกสาร

| เอกสาร | สถานะ |
|---|---|
| [math-learning-plan.md](math-learning-plan.md) | ใช้งาน (ข้อ 7.2 ยังอ้างถึง artifact เดิม ให้อัปเดตหลัง M1 ขึ้นเว็บ) |
| ADR-0001 ถึง 0005, 0007 | ยอมรับ |
| ADR-0006 ระบบทบทวน Leitner | **เสนอ** รอ Designer กำหนดช่วงเวลาและเกณฑ์คล่อง (ทำพร้อม M2) |
| Lesson Spec DX-ADD | อนุมัติแล้ว 2026-09-29 |
| Tech Spec M0 | เสร็จ |
| Tech Spec DX-ADD | กำลังพัฒนา |

## การตัดสินใจสำคัญ (ของเจ้าของโปรเจกต์)

| วันที่ | การตัดสินใจ |
|---|---|
| 2026-09-29 | แบ่งงาน 3 role: Designer (Opus), Architect (Sonnet), Developer (Sonnet) |
| 2026-09-29 | Static web + เก็บข้อมูลในเครื่อง (IndexedDB) ไม่ใช้ Claude Artifact และไม่ใช้ cloud DB |
| 2026-09-29 | AI เขียนโค้ดเป็นหลัก ใช้ React + TypeScript |
| 2026-09-29 | รองรับแท็บเล็ต Android, มือถือ, คอมพิวเตอร์ และ iPad |
| 2026-09-29 | Repo เป็น public และ host บน GitHub Pages ไม่ใช้ custom domain |
| 2026-09-29 | อนุมัติ DX-ADD v2: ไม่บอกถูก/ผิดระหว่างทำ, ข้ามด่าน 5 ถ้าด่าน 4 ถูก ≤ 1 ข้อ |
| 2026-09-29 | รับข้อเสนอ D1–D15 ของ Architect ใน Tech Spec DX-ADD ทั้งหมด |
| 2026-09-29 | ชื่อแอปชั่วคราว "บทเรียนคณิตศาสตร์" (ชื่อสั้น "คณิต") และ icon ten-frame สีส้ม |

## งานค้าง / รอคำตอบ

- [ ] พ่อทดสอบ M0 AC7: ติดตั้ง PWA บนแท็บเล็ตหรือมือถือจริง แล้วเปิด offline
- [ ] M1: Developer ส่งงาน → Architect ตรวจตาม AC → Designer ตรวจเจตนาการสอน → commit และ deploy
- [ ] หลัง M1 ขึ้นเว็บ: อัปเดตข้อ 7.2 ของ `math-learning-plan.md` ให้ชี้ไปที่เว็บแทน artifact เดิม
- [ ] ชื่อแอปและ icon ถาวร (ไม่รีบ)

## ขั้นถัดไป

1. ตรวจและ deploy M1
2. ให้ลูกทำ DX-ADD บนเว็บ แล้วพ่อ export ไฟล์ผลส่งให้ Designer
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
