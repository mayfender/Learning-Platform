# Architecture Overview

- เจ้าของเอกสาร: Software Architect (role ปิดใช้งานตั้งแต่ 2026-10-02 เอกสารนี้อธิบายแอป React ใน `src/` เป็นข้อมูลอ้างอิง ผู้ประสานงานเป็นผู้แก้ไขต่อ)
- หมายเหตุ: บทเรียนใหม่ไม่ใช้สถาปัตยกรรมนี้ แต่เป็นหน้า HTML single page ใน `public/topics/<เรื่อง>/` ที่ Builder สร้าง (เก็บผลใน localStorage และส่งออกเป็น JSON) ดู [roles/builder.md](../../roles/builder.md)
- อัปเดตล่าสุด: 2026-09-29
- ADR: [0001 deploy](adr/0001-static-web-deploy.md) · [0002 stack](adr/0002-stack-react-typescript-vite.md) · [0003 storage](adr/0003-local-storage-indexeddb.md) · [0004 content](adr/0004-content-as-typescript-modules.md) · [0005 manipulatives](adr/0005-manipulatives-svg-components.md) · [0006 SRS](adr/0006-spaced-repetition-leitner.md) · [0007 testing](adr/0007-testing-strategy.md) · [0008 event log](adr/0008-event-log-order-time-and-fields.md)

## 1. สรุปสั้น

| เรื่อง | เลือก |
|---|---|
| รูปแบบแอป | Static web app ติดตั้งเป็น PWA ได้ ใช้ offline ได้ |
| Host | GitHub Pages จาก public repo `mayfender/Learning-Platform` |
| ภาษา / Framework | TypeScript (strict) + React + Vite |
| Styling | CSS Modules + design token (CSS custom properties) |
| อุปกรณ์จำลอง | React component วาดด้วย SVG |
| เนื้อหาบทเรียน | ไฟล์ TypeScript ที่เป็นข้อมูลล้วน |
| ข้อมูล | IndexedDB (library `idb`) เก็บเป็น event log + export/import JSON |
| ทบทวนเว้นระยะ | Leitner ระดับทักษะ |
| เทสต์ | Vitest + Testing Library + Playwright (Android tablet / phone / desktop — Chromium) |
| อุปกรณ์ที่รองรับ | Chrome บนแท็บเล็ต Android, มือถือ และคอมพิวเตอร์ (iPad/Safari ใช้ได้แบบ best-effort ไม่ได้ทดสอบ ดู ADR-0007) |

## 2. ภาพรวมระบบ

```
┌──────────────────────────── เบราว์เซอร์ / PWA ────────────────────────────┐
│                                                                          │
│  app/ (หน้าจอ + routing)                                                  │
│   ├─ หน้าหลักของลูก     ├─ ตัวเล่นกิจกรรม (Runner)   ├─ หน้าสำหรับพ่อ         │
│   │                     │                          │                     │
│   ▼                     ▼                          ▼                     │
│  ui/ (ปุ่ม ตัวเลือก แป้นตัวเลข ข้อความตอบกลับ)   manipulatives/ (SVG)        │
│                         │                                                │
│                         ▼                                                │
│  engine/  ── reducer ของกิจกรรม, ตรวจคำตอบ, จับเวลาเงียบ,                    │
│             ประเมินผลวินิจฉัย, generators, Leitner      (TS ล้วน ไม่มี React) │
│     ▲                        │                                           │
│     │ อ่านเนื้อหา              │ บันทึก event / อ่าน event                     │
│  content/ (บทเรียน,        store/ ── ProgressStore                        │
│   แบบทดสอบ, ทักษะ)            ├─ IndexedDbStore (ใช้งานจริง)                │
│                              ├─ MemoryStore   (เทสต์)                     │
│                              └─ export / import JSON, migrations         │
└──────────────────────────────────────────────────────────────────────────┘
```

**ทิศทางการ import (ห้ามย้อนทาง)**
- `app` → `ui`, `manipulatives`, `engine`, `store`, `content`
- `engine` → `content` (type เท่านั้น)
- `content` → ห้าม import อะไรนอกจาก type และ `engine/generators`
- `engine` และ `store` ห้าม import React

## 3. โครงสร้างโฟลเดอร์

```
learning_platform/
├── docs/                       เอกสาร (แผน, lessons, specs, architecture)
├── roles/                      นิยาม role
├── public/                     icon, manifest assets
├── src/
│   ├── app/                    routing, layout, หน้าจอ
│   │   ├── routes/             Home, Runner, Parent, DevManipulatives
│   │   └── App.tsx
│   ├── content/
│   │   ├── skills.ts           ทะเบียนทักษะ + เกณฑ์คล่อง + ช่วง Leitner
│   │   ├── strategies.ts       ชุดตัวเลือก "หนูคิดยังไง"
│   │   ├── misconceptions.ts   ทะเบียนความเข้าใจผิด
│   │   ├── diagnostics/        DX-ADD.ts, ...
│   │   ├── lessons/            ADD-01.ts, ...
│   │   ├── registry.ts         รวมทุกบทและแบบทดสอบ
│   │   └── content.test.ts     ตรวจเนื้อหาทั้งหมดอัตโนมัติ
│   ├── engine/
│   │   ├── types.ts            type กลางของเนื้อหาและ event
│   │   ├── problem.ts          คำนวณเฉลยจากโจทย์
│   │   ├── runner.ts           reducer ของกิจกรรม
│   │   ├── timing.ts           จับเวลาเงียบ
│   │   ├── diagnostic.ts       ประเมินผลและแนะนำขั้น
│   │   ├── leitner.ts
│   │   ├── rng.ts              random แบบมี seed
│   │   └── generators/
│   ├── manipulatives/          TenFrame, Abacus, NumberBond, NumberLine, BaseTenBlocks
│   ├── ui/                     component UI ทั่วไป
│   ├── store/                  ProgressStore, IndexedDbStore, MemoryStore, exportImport, migrations
│   └── styles/                 tokens.css, global.css, fonts
├── tests/e2e/                  Playwright
├── index.html
├── vite.config.ts
├── playwright.config.ts
└── package.json
```

unit test วางคู่กับไฟล์ (`*.test.ts(x)`) ส่วน e2e อยู่ใน `tests/e2e/`

## 4. Data model

### 4.1 เนื้อหา (ร่าง — Tech Spec แต่ละบทจะเพิ่มรายละเอียด)

> type ที่ใช้จริงของแบบทดสอบวินิจฉัย (เงื่อนไขประเมินและกฎแนะนำเป็นข้อมูล แทนฟังก์ชัน `recommend`) ดู [Tech Spec DX-ADD §4.1](../specs/DX-ADD-diagnostic.md)

```ts
type SkillId = `${'add' | 'sub' | 'mul' | 'div'}.${string}`;   // เช่น 'add.make-10'

// เฉลยต้องคำนวณได้จากโจทย์ (ADR-0004)
type Problem =
  | { kind: 'arith'; op: '+' | '-' | '×' | '÷'; a: number; b: number }
  | { kind: 'missing-part'; whole: number; part: number }         // part + ? = whole
  | { kind: 'subitize'; count: number; visual: 'ten-frame' | 'abacus' };

interface Choice { value: number; misconceptionId?: string }     // ตัวเลือกผิดต้องมี misconceptionId

interface Item {
  id: string;                    // ไม่ซ้ำภายในกิจกรรม
  skillId: SkillId;
  problem: Problem;
  input: 'keypad' | 'choices';
  choices?: Choice[];
  visual?: { type: 'ten-frame' | 'abacus' | 'number-bond' | 'number-line' | 'base-ten'; mode: 'show' | 'flash'; flashMs?: number };
  fluentMs?: number;             // เกณฑ์ "คล่อง" (เวลาเงียบ)
  strategySet?: string;          // ถาม "หนูคิดยังไง" หลังตอบ (อ้าง strategies.ts)
}

interface Diagnostic {
  id: string;                    // 'DX-ADD'
  title: string;
  stages: { id: string; title: string; intro: string; items: Item[] }[];
  recommend: (result: DiagnosticResult) => { ladderStep: number; reason: string };
}

interface Lesson {
  id: string;                    // 'ADD-04'
  title: string;
  ladderStep: number;
  phases: Phase[];               // check / understand / talk / practice / challenge / drill
}
```

### 4.2 Event (เก็บใน IndexedDB แบบเพิ่มอย่างเดียว)

> รายละเอียด field ของ `schemaVersion: 1` ที่ใช้จริง (เช่น `stageId`, `expected`, `latencyValid`, `fluent`, `strategyId`, summary ใน `session.completed`/`session.abandoned`) ดู [Tech Spec DX-ADD §6](../specs/DX-ADD-diagnostic.md)

```ts
interface EventBase {
  id: string;                    // UUID
  at: string;                    // ISO datetime
  schemaVersion: 1;
  learnerId: string;
  sessionId: string;
  activityId: string;            // 'DX-ADD' หรือ 'ADD-04'
}

type AppEvent = EventBase & (
  | { type: 'session.started' }
  | { type: 'item.answered'; itemId: string; skillId: SkillId; problem: Problem;
      response: number; correct: boolean; misconceptionId?: string;
      latencyMs: number; attemptNo: number }
  | { type: 'strategy.reported'; itemId: string; strategyId: string }
  | { type: 'session.completed'; summary?: unknown }
  | { type: 'session.abandoned' }
);
```

- **`latencyMs`** นับจากตอนที่ลูกตอบได้ (ถ้าเป็นโจทย์แฟลช นับตั้งแต่ภาพหาย) จนถึงตอนกดส่ง ใช้ `performance.now()` และห้ามแสดงให้ลูกเห็น
- ถ้าแท็บถูกซ่อนระหว่างตอบ (`visibilitychange`) ให้ตัดข้อนั้นออกจากการคิดเวลา (บันทึก `latencyMs` แต่ติดธงว่าไม่นับ)

### 4.3 ผู้เรียน

```ts
interface Learner { id: string; nickname: string; createdAt: string }
```
ไม่เก็บชื่อจริง อายุ หรือข้อมูลอื่นที่ระบุตัวตน

### 4.4 ไฟล์ export

```json
{ "app": "math-learning", "schemaVersion": 1, "exportedAt": "...", "learners": [...], "events": [...] }
```
import ใช้วิธีรวมโดยตัด event ที่ `id` ซ้ำ ไม่เขียนทับ

## 5. หน้าจอ

| Route | ผู้ใช้ | หน้าที่ |
|---|---|---|
| `/#/` | ลูก | เลือกกิจกรรมของวันนี้ |
| `/#/play/:activityId` | ลูก | ตัวเล่นกิจกรรม (แบบทดสอบวินิจฉัยหรือบทเรียน) |
| `/#/parent` | พ่อ | ผลรายข้อ, ความเข้าใจผิดที่พบ, ขั้นที่แนะนำ, บทพูด Number Talks, export/import, ตั้งค่า |
| `/#/parent/results/:sessionId` | พ่อ | ผลของแบบทดสอบแต่ละครั้ง (เพิ่มใน M1) |
| `/#/dev/manipulatives` | นักพัฒนา | ดูอุปกรณ์จำลองทุกโหมด (ไม่แสดงใน build จริง) |

- **ทางเข้าหน้าสำหรับพ่อ:** กดค้างที่โลโก้ 2 วินาที ไม่ใช่ระบบความปลอดภัย แค่กันลูกกดเข้าโดยบังเอิญ
- เวลาตอบแสดง**เฉพาะในหน้าสำหรับพ่อ**

## 6. Design token และกติกา UI

```css
:root {
  --color-bg: #F2F7F3;        --color-surface: #FFFFFF;
  --color-text: #1F2D27;      --color-text-muted: #5B6B63;
  --color-accent: #FF7A45;    /* เน้น, ปุ่มหลัก */
  --color-success: #2F9E8F;   /* ถูก, สีรอง */
  --color-highlight: #FFC857;
  --color-try-again: #E0694F; /* ตอบผิด — ใช้แบบนุ่ม ไม่ใช่แดงสด */
  --color-group-a: var(--color-accent);   /* ชุด 5 แรกใน ten-frame/ลูกคิด */
  --color-group-b: var(--color-success);  /* ชุด 5 หลัง */
  --font-heading: 'Kodchasan', sans-serif;
  --font-body: 'Noto Sans Thai', sans-serif;
  --tap-min: 48px;
  --radius: 16px;
}
/* dark: ใช้ทั้ง @media (prefers-color-scheme: dark) และ [data-theme="dark"] */
:root[data-theme="dark"] {
  --color-bg: #121A16;        --color-surface: #1C2621;
  --color-text: #E8F0EB;      --color-text-muted: #9DB0A6;
  --color-accent: #FF8A5C;    --color-success: #3DB8A6;
  --color-highlight: #FFD479; --color-try-again: #F08270;
}
```

- ค่าในตารางนี้คือค่าเริ่มต้น ปรับได้ใน `tokens.css` ที่เดียว ห้ามใส่สีตรงใน component
- รองรับความกว้างตั้งแต่ 360px ไม่มี scroll แนวนอน ออกแบบให้ใช้ได้ทั้งแนวตั้งและแนวนอนบนแท็บเล็ต
- พื้นที่แตะ ≥ `--tap-min`
- ใช้แป้นตัวเลขของแอปเอง ไม่เรียกคีย์บอร์ดของระบบ เพื่อให้ขนาดและตำแหน่งเหมือนกันทุกอุปกรณ์ (โดยเฉพาะแท็บเล็ต Android)
- ปิด animation เมื่อ `prefers-reduced-motion`
- ป้องกันการซูมด้วยการแตะสองครั้งบนปุ่ม (`touch-action: manipulation`) แต่ไม่ปิดการซูมทั้งหน้า

## 7. มาตรฐานโค้ด

- TypeScript `strict` ห้ามใช้ `any` ใน `engine/`, `content/`, `store/`
- ชื่อโค้ดเป็นภาษาอังกฤษ ข้อความที่ผู้ใช้เห็นเป็นภาษาไทยและอยู่ใน `content/` หรือไฟล์ข้อความของหน้านั้น
- component เป็น function component + hooks
- ไม่เพิ่ม dependency ใหม่โดยไม่ระบุใน Tech Spec
- ไม่มี analytics, tracker หรือ request ไปโดเมนภายนอกขณะใช้งาน
- ทุกการเรียก store รองรับความล้มเหลว ถ้าบันทึกไม่ได้ ให้แจ้งพ่อในหน้าสำหรับพ่อ แต่ลูกเล่นต่อได้ (เก็บในหน่วยความจำไว้ก่อนแล้วลองใหม่)

## 8. Build, run และ deploy

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | dev server |
| `npm test` | Vitest (unit + component + ตรวจเนื้อหา) |
| `npm run e2e` | Playwright 3 project (e2e ของแอป React) |
| `npm run acceptance` | acceptance test ของแอป React (`tests/acceptance/`, 3 project เดียวกัน) |
| `npm run build` | build static + PWA ลง `dist/` |
| `npm run preview` | เปิด build จริงในเครื่อง |
| `npm run lint` | ESLint + Prettier + type check |

Deploy: push เข้า branch `main` → GitHub Actions รัน lint, test, e2e และ acceptance (ติดตั้งเฉพาะ Chromium) → ถ้าผ่านทั้งหมดจึง build และ deploy ไป GitHub Pages ถ้าเทสต์ไม่ผ่านจะไม่ deploy (Vite ต้องตั้ง `base: '/Learning-Platform/'`)

## 9. แผนงาน

ตารางนี้คือแผนเริ่มต้น สถานะจริงของแต่ละ milestone ดูที่ [docs/STATUS.md](../STATUS.md)

| Milestone | งาน | หมายเหตุ |
|---|---|---|
| **M0 โครงโปรเจกต์** | Vite + React + TS, tokens, ฟอนต์ self-host, PWA, routing, `ProgressStore` + IndexedDB + export/import, Vitest/Playwright, CI/deploy | ไม่มีเนื้อหา แต่ deploy ได้จริง |
| **M1 แบบทดสอบวินิจฉัย DX-ADD** | ย้าย "ภารกิจสำรวจการบวก" เข้าระบบ: `TenFrame` (โหมด flash), แป้นตัวเลข, ตัวเลือกวิธีคิด, จับเวลาเงียบ, หน้าผลสำหรับพ่อ | ต้องมี Lesson Spec `DX-ADD` ก่อน |
| **M2 บทเรียนแรก** | ตามขั้นที่ DX-ADD แนะนำ | เริ่มแยก engine ของบทเรียน 6 ช่วง |
| M3+ | บทเรียนถัดไป, Leitner, อุปกรณ์จำลองชิ้นอื่น | |

## 10. คำถามที่ยังเปิดอยู่

- (ปิดแล้ว 2026-09-30) ช่วงเวลาและเกณฑ์ Leitner ตัดสินใน ADR-0006 ตาม Lesson Spec ADD-04
