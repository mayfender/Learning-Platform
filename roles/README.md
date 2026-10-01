# Roles และลำดับการทำงาน

โปรเจกต์นี้แบ่งงานเป็น 5 role และมีเจ้าของโปรเจกต์ (พ่อ) เป็นผู้ตัดสินใจสุดท้าย

| Role | AI Model | ไฟล์ | ผลงานหลัก | เก็บไว้ที่ |
|---|---|---|---|---|
| ผู้เชี่ยวชาญออกแบบการเรียนรู้ (Learning Designer) | Opus | [learning-designer.md](learning-designer.md) | Lesson Spec | `docs/lessons/` |
| UX/UI Designer | Sonnet | [ux-ui-designer.md](ux-ui-designer.md) | Mockup ที่คลิกดูได้ | `docs/mockups/` |
| Software Architect | Sonnet | [software-architect.md](software-architect.md) | Architecture Overview, ADR, Tech Spec | `docs/architecture/`, `docs/specs/` |
| Developer | Sonnet | [developer.md](developer.md) | โค้ด, เทสต์, รายงานส่งงาน | `src/`, `tests/e2e/`, `docs/specs/` |
| Tester | Sonnet | [tester.md](tester.md) | Test Plan, acceptance test, Test Report | `docs/test-plans/`, `tests/acceptance/`, `docs/test-reports/` |

แหล่งข้อมูลหลักที่ทุก role ต้องอ่าน: [docs/math-learning-plan.md](../docs/math-learning-plan.md)

## ลำดับการส่งต่องาน

```
พ่อ (เป้าหมาย / ผลการทดสอบของลูก)
   │
   ▼
Learning Designer ──► Lesson Spec ──► [พ่ออนุมัติ] ──► UX/UI Designer ──► Mockup ──► [พ่อดูและอนุมัติ]
                                          │
                                          ▼
Software Architect ──► Tech Spec (+ ADR ถ้ามีการตัดสินใจใหม่)
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
Developer ──► โค้ด + เทสต์ + รายงาน          Tester ──► Test Plan + acceptance test
                        │                        (ทำขนานกัน โดยไม่ดูโค้ด)
                        └─────────────────┬─────────────────┘
                                          ▼
Tester รันและทดสอบ ──► Test Report ── มี Blocker/Major ──► กลับไป Developer
                                          │ ไม่มี
                                          ▼
Architect ตรวจตาม Tech Spec ──► Designer ตรวจตาม Lesson Spec ──► [พ่อทดลองกับลูก]
                                          │
                                          ▼
                     ผลใช้งานจริง ──► กลับไปที่ Designer (ปรับบทเรียน)
```

## กติกาการทำงานร่วมกัน

1. **แต่ละ role ทำเฉพาะงานของตัวเอง**
   - Developer ไม่เปลี่ยนวิธีสอน
   - Designer ไม่กำหนดเทคโนโลยี
   - Architect ไม่แก้เนื้อหาบทเรียน
   - Tester ไม่แก้โค้ด ไม่แก้เทสต์ของ Developer และไม่อ่านโค้ดตอนออกแบบเทสต์
2. **เจอจุดที่ไม่ชัด ให้ถามกลับไปที่ต้นทาง อย่าเดาเอง**
   - Developer ถาม Architect
   - Architect ถาม Designer ในเรื่องวิธีสอน
   - ทุก role ถามพ่อในเรื่องเป้าหมายและตัวลูก
3. **ทุกเอกสารมีรหัสอ้างอิงร่วมกัน** เช่น บทเรียน `ADD-04` ใช้ Lesson Spec `docs/lessons/ADD-04-make-ten.md` คู่กับ Tech Spec `docs/specs/ADD-04-make-ten.md`
4. **รูปแบบรหัส:** `<วิชา>-<ขั้นบนบันได 2 หลัก>` ถ้ามีหลายบทในขั้นเดียวกัน ให้เติม `-a`, `-b`
   - วิชา: `ADD` บวก, `SUB` ลบ, `MUL` คูณ, `DIV` หาร, `DX` แบบทดสอบวินิจฉัย
5. **เปลี่ยนเอกสารที่อนุมัติแล้ว** ต้องบันทึกในหัวข้อ "ประวัติการแก้ไข" ท้ายเอกสาร
6. **อัปเดต [docs/STATUS.md](../docs/STATUS.md) ทุกครั้งที่งานเปลี่ยนสถานะ** ไม่ว่าจะเริ่ม ส่งงาน ตรวจผ่าน อนุมัติ หรือมีการตัดสินใจใหม่ เพื่อให้ session ถัดไปรู้สถานะทั้งหมด
7. **ความถูกต้องของตัวเลขเป็นความรับผิดชอบร่วม**
   - Designer ตรวจเฉลยเอง
   - Architect กำหนดให้มีเทสต์ตรวจเฉลย
   - Developer เขียนเทสต์นั้น
   - Tester คิดเฉลยใหม่เอง แล้วตรวจกับสิ่งที่แอปตัดสินจริง

## ผู้ประสานงาน

session หลักที่คุยกับพ่อเป็นผู้ประสานงาน: spawn agent ของทุก role (รวม Designer) เมื่อ agent ทำเสร็จให้กลับมารายงานพ่อและรอคำสั่งต่อไป ไม่ส่งต่อ role ถัดไปเอง ตรวจงานเอง และเป็นคนเดียวที่ commit และ push ส่วน role อื่น commit/push ได้เฉพาะ feature branch ของงานนั้น (ห้ามแตะ `main`, ห้าม merge) รายละเอียดอยู่ใน [CLAUDE.md](../CLAUDE.md) หัวข้อ "หน้าที่ของ session หลัก" และ "Branch และ PR"

## วิธีเรียกใช้ role กับ AI

พิมพ์บอก AI ให้ทำงานในบทนั้นโดยอ้างไฟล์ เช่น

> ทำงานในบท Learning Designer ตาม `roles/learning-designer.md` ออกแบบบทเรียน ADD-04 จากผลแบบทดสอบนี้ ...

## Branch และ PR ต่อ task

1. Architect สร้าง feature branch `feature/<รหัสงาน>-<ชื่อสั้น>` ของทีมตอนเริ่ม task
2. ทุก role ทำงานและ commit/push บน branch นี้
3. Developer ทำเสร็จแล้วเปิด PR และ comment รายละเอียดตามรูปแบบรายงานส่งงาน
4. Tester รับ PR เป็นงานถัดไป ทดสอบ และรายงานเป็น comment บน PR
5. Architect และ Designer ตรวจบน PR เดียวกัน
6. ผู้ประสานงาน merge เข้า `main` เมื่อผ่านทุก role และพ่ออนุมัติ (merge = deploy)
