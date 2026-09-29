# Roles และลำดับการทำงาน

โปรเจกต์นี้แบ่งงานเป็น 3 role และมีเจ้าของโปรเจกต์ (พ่อ) เป็นผู้ตัดสินใจสุดท้าย

| Role | ไฟล์ | ผลงานหลัก | เก็บไว้ที่ |
|---|---|---|---|
| ผู้เชี่ยวชาญออกแบบการเรียนรู้ (Learning Designer) | [learning-designer.md](learning-designer.md) | Lesson Spec | `docs/lessons/` |
| Software Architect | [software-architect.md](software-architect.md) | Architecture Overview, ADR, Tech Spec | `docs/architecture/`, `docs/specs/` |
| Developer | [developer.md](developer.md) | โค้ด, เทสต์, รายงานส่งงาน | `src/`, `tests/`, `docs/specs/` |

แหล่งข้อมูลหลักที่ทุก role ต้องอ่าน: [docs/math-learning-plan.md](../docs/math-learning-plan.md)

## ลำดับการส่งต่องาน

```
พ่อ (เป้าหมาย / ผลการทดสอบของลูก)
   │
   ▼
Learning Designer ──► Lesson Spec ──► [พ่ออนุมัติ]
                                          │
                                          ▼
Software Architect ──► Tech Spec (+ ADR ถ้ามีการตัดสินใจใหม่)
                                          │
                                          ▼
Developer ──► โค้ด + เทสต์ + รายงานส่งงาน
                                          │
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
2. **เจอจุดที่ไม่ชัด ให้ถามกลับไปที่ต้นทาง อย่าเดาเอง**
   - Developer ถาม Architect
   - Architect ถาม Designer ในเรื่องวิธีสอน
   - ทุก role ถามพ่อในเรื่องเป้าหมายและตัวลูก
3. **ทุกเอกสารมีรหัสอ้างอิงร่วมกัน** เช่น บทเรียน `ADD-04` ใช้ Lesson Spec `docs/lessons/ADD-04-make-ten.md` คู่กับ Tech Spec `docs/specs/ADD-04-make-ten.md`
4. **รูปแบบรหัส:** `<วิชา>-<ขั้นบนบันได 2 หลัก>` ถ้ามีหลายบทในขั้นเดียวกัน ให้เติม `-a`, `-b`
   - วิชา: `ADD` บวก, `SUB` ลบ, `MUL` คูณ, `DIV` หาร, `DX` แบบทดสอบวินิจฉัย
5. **เปลี่ยนเอกสารที่อนุมัติแล้ว** ต้องบันทึกในหัวข้อ "ประวัติการแก้ไข" ท้ายเอกสาร
6. **ความถูกต้องของตัวเลขเป็นความรับผิดชอบร่วม**
   - Designer ตรวจเฉลยเอง
   - Architect กำหนดให้มีเทสต์ตรวจเฉลย
   - Developer เขียนเทสต์นั้น

## วิธีเรียกใช้ role กับ AI

พิมพ์บอก AI ให้ทำงานในบทนั้นโดยอ้างไฟล์ เช่น

> ทำงานในบท Learning Designer ตาม `roles/learning-designer.md` ออกแบบบทเรียน ADD-04 จากผลแบบทดสอบนี้ ...
