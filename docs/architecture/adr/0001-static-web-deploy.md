# ADR-0001: Deploy เป็น static web app (PWA)

- สถานะ: ยอมรับ
- วันที่: 2026-09-29

## บริบท
ต้องเลือกว่าแอปจะรันที่ไหน โดยต้องรองรับแท็บเล็ต Android, มือถือ, คอมพิวเตอร์ และ iPad (N1) ดูแลคนเดียวได้ (N9) และไม่ส่งข้อมูลเด็กให้บุคคลที่สาม (N4)

## ทางเลือก
| ทางเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| Claude Artifact | มีฐานข้อมูลในตัว AI อ่านผลได้โดยตรง | ลูกต้องล็อกอิน claude.ai ด้วยบัญชีพ่อ ใช้ offline ไม่ได้ ผูกกับ platform |
| **Static web app (PWA)** | ฟรี เปิดจากลิงก์ได้ทุกเครื่อง ติดตั้งบนหน้าจอและใช้ offline ได้ ไม่มี server | ข้อมูลอยู่ในเครื่อง (ดู ADR-0003) |
| Web app + backend | ข้อมูลข้ามเครื่องได้ | ต้องดูแล server, ล็อกอิน และความปลอดภัย |

## การตัดสินใจ
เลือก **static web app ที่ติดตั้งเป็น PWA ได้** (เจ้าของโปรเจกต์เลือก)
- build ด้วย Vite ได้ผลเป็นไฟล์ static ทั้งหมด
- ใช้ `vite-plugin-pwa` ทำ manifest และ service worker เพื่อให้ติดตั้งบนหน้าจอและเปิด offline ได้
- ฟอนต์ต้องอยู่ในตัวแอป (self-host ผ่าน `@fontsource`) ไม่โหลดจาก Google Fonts เพื่อให้ใช้ offline ได้และไม่มี request ไปบุคคลที่สาม
- ใช้ hash routing (`/#/lesson/ADD-04`) เพื่อให้ใช้กับ static host ได้โดยไม่ต้องตั้งค่า rewrite
- host: **GitHub Pages** จาก public repo `mayfender/Learning-Platform` push เข้า `main` แล้ว GitHub Actions รันเทสต์ ถ้าผ่านจึง build และ deploy ถ้าไม่ผ่านจะไม่ deploy
- repo เป็น public ได้ เพราะข้อมูลของลูกอยู่ในเครื่องเท่านั้น (ADR-0003) **ห้าม commit ไฟล์ export หรือข้อมูลส่วนตัวใดๆ** (กันไว้ใน `.gitignore` แล้ว)

## ผลที่ตามมา
- ง่ายขึ้น: ไม่มีค่าใช้จ่าย ไม่มี server ต้องดูแล deploy แค่ push
- ยากขึ้น: พ่อดูผลได้เฉพาะบนเครื่องที่ลูกใช้ หรือผ่านไฟล์ export
- ต้องทำต่อ: ตั้ง GitHub Actions สำหรับเทสต์และ deploy และเปิด GitHub Pages (source: GitHub Actions) ใน M0
- ถ้าวันหน้าต้องการให้ repo เป็น private ให้ย้ายไป Cloudflare Pages โดยโค้ดเหมือนเดิม
- ถ้าวันหน้าต้องการ sync ข้ามเครื่อง ให้เพิ่ม adapter ใหม่ตาม ADR-0003 โดยไม่ต้องเปลี่ยนการ deploy
