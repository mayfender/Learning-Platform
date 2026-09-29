# Tech Spec DX-ADD: ภารกิจสำรวจการบวก (แบบทดสอบวินิจฉัย) — Milestone M1

- อ้างอิง Lesson Spec: [docs/lessons/DX-ADD-diagnostic.md](../lessons/DX-ADD-diagnostic.md) (อนุมัติ 2026-09-29, แบบทดสอบเวอร์ชัน `DX-ADD v2`)
- สถานะ: พร้อมพัฒนา (เริ่มได้เมื่อ M0 เสร็จ)
- ADR ที่เกี่ยวข้อง: 0002, 0003, 0004, 0005, 0007 (0006 Leitner ยังไม่ทำ แต่ event ต้องมีข้อมูลพอ)
- ต่อจาก: [M0-scaffold.md](M0-scaffold.md)
- วันที่: 2026-09-29

> ข้อความภาษาไทยทุกข้อที่มาจาก Lesson Spec ต้อง**ตรงทุกตัวอักษร** ในเอกสารนี้อ้างเลขข้อของ Lesson Spec (เช่น "LS §8.3") แทนการคัดลอกซ้ำ ยกเว้นตัวอย่างโค้ด

## 1. สรุปสิ่งที่ต้องสร้าง

ย้าย "ภารกิจสำรวจการบวก" เข้าระบบตาม Lesson Spec: 20 ข้อ 5 ด่าน, แฟลช ten-frame, แป้นตัวเลขของแอป, คำถาม "หนูคิดยังไง", จับเวลาแบบเงียบ, จับคู่คำตอบผิดกับความเข้าใจผิด, ประเมินระดับรายด่านและกลุ่ม 5A/5B/5C, แนะนำขั้นเริ่มต้น, หน้าผลสำหรับพ่อพร้อมประวัติและ Number Talks

ชิ้นใหม่
- **content:** `skills.ts`, `ladders.ts`, `strategies.ts`, `misconceptions.ts`, `diagnostics/DX-ADD.ts`, `registry.ts`
- **engine (TS ล้วน):** `problem.ts`, `timing.ts`, `diagnostic/` (classify, evaluate, recommend, summary, machine, sessions)
- **manipulatives:** `TenFrame` (show / flash / hidden, สีเดียวหรือแบ่ง 5)
- **ui:** `Keypad`, `AnswerDisplay`, `OptionGrid`, `ConfirmDialog`, `useReducedMotion`
- **app:** `DiagnosticPlayer` + หน้าจอของลูก, `useDiagnosticRunner`, `useSilentTimer`, หน้าผล `/parent/results/:sessionId`, รายการประวัติ, การ์ดกิจกรรมในหน้าหลัก

ไม่มี dependency ใหม่ · `engine/diagnostic.ts` ใน overview §3 แยกเป็นโฟลเดอร์ `engine/diagnostic/` ส่วน `engine/runner.ts` สงวนไว้ให้ตัวเล่นบทเรียนใน M2

## 2. การจับคู่ Lesson Spec → ระบบ

| ส่วนใน Lesson Spec | Component / ไฟล์ | หมายเหตุ |
|---|---|---|
| §1 เป้าหมาย 3 เรื่อง | หน้าผล (§5.7) | ขั้นแนะนำ, วิธีคิด, ความเข้าใจผิด |
| §1 ใช้แป้นตัวเลขแทนตัวเลือก | `ui/Keypad`, `ui/AnswerDisplay` | §3.2 |
| §2 โครงสร้าง 5 ด่าน | `DX_ADD.stages` | §4.3 |
| §2 กฎข้ามด่าน 5 | `stages[4].skipIf` + `machine.ts` | §5.2 |
| §3 ความเข้าใจผิด M1–M12, MX | `content/misconceptions.ts` | §4.2 |
| §4 รายการโจทย์ + เกณฑ์คล่อง | `DX_ADD.stages[].items` | §4.3 |
| §4 กฎความสำคัญ (วิธีคิดมาก่อน) | `WrongAnswerRule.byStrategy` + `classify.ts` | §5.4 |
| §4 ด่าน 1 รูปแบบแฟลช 0.9/1.5 วิ, สีเดียว, ไม่มีดูซ้ำ | `item.visual` + `TenFrame` + `machine.ts` | §3.1, §5.2 |
| §5 ตัวเลือกวิธีคิด ชุด A/B + ตัวอย่าง | `content/strategies.ts` + `ui/OptionGrid` | §4.2 |
| §6 ระดับรายด่าน + 5A/5B/5C + กฎซ่อนแท็บ | `stage.level`, `stage.groups` + `evaluate.ts` | §5.5 |
| §7 แนะนำขั้น + หยุดกลางทาง | `DX_ADD.recommendation` + `recommend.ts` | §5.6 |
| §8.1–§8.5 ข้อความ | `DX_ADD.texts` | §4.3 |
| §9 หน้าผลสำหรับพ่อ 8 ส่วน | `app/parent/DiagnosticResults.tsx` | §5.7 |
| §10 Number Talks | `DX_ADD.numberTalks` | §5.7 |
| §11 ข้อมูลที่บันทึก | event ใน §6 | |
| §12 #3 ไม่บอกถูก/ผิด ไม่แสดงคะแนน | `machine.ts` (ack ไม่ขึ้นกับคำตอบ) | §8, AC6 |
| §12 #8 แฟลช 1.5 วิคงที่, reduced motion ตัดแค่ animation | `TenFrame` | §3.1 |
| §12 #9 จุดสีเดียว | `TenFrame colorMode='single'` | |
| §12 #10 ผลเก็บในแอป + ประวัติ + export | store (M0) + หน้าผล | |

## 3. อุปกรณ์จำลองและ UI ที่ใช้

### 3.1 `TenFrame` (สร้างใหม่ `src/manipulatives/TenFrame.tsx`)

`src/manipulatives/types.ts` มี `ManipulativeBaseProps` ตาม ADR-0005 ตามตัวอักษร

```ts
export interface TenFrameProps extends ManipulativeBaseProps {
  filled: number;                       // จำนวนเต็ม 0–10
  colorMode?: 'single' | 'split-5';     // ค่าเริ่มต้น 'split-5' (บทเรียน); DX-ADD ใช้ 'single'
}
```
- `frames` และ `onCellTap` ของ ADR-0005 **ยังไม่ทำใน M1** (`interactive` ใช้ค่า `false` เท่านั้น)
- ตาราง 2 แถว × 5 ช่อง เติมจุดตามลำดับ index 0–9 คือแถวบนซ้าย→ขวา แล้วแถวล่างซ้าย→ขวา (LS §4 ด่าน 1)
- สี: `split-5` ใช้ `--color-group-a` (ช่อง 0–4) และ `--color-group-b` (ช่อง 5–9), `single` ใช้ token ใหม่ `--color-dot-single` (ค่า = `var(--color-accent)` ทั้ง light/dark) ทุกจุดสีเดียวกัน
- `mode`
  - `show`: เห็นกรอบ เส้นช่อง และจุด
  - `hidden`: แสดง**การ์ดเปล่าขนาดเท่าเดิม** (ไม่มีเส้นช่อง ไม่มีจุด) เพื่อไม่ให้ layout ขยับ
  - `flash`: แสดงเหมือน `show` แล้วซ่อนเองหลัง `flashMs` จากนั้นเรียก `onFlashEnd` **ครั้งเดียว**
- เวลาแฟลช (LS §12 #8)
  - ปกติ: fade-in 150ms เริ่มที่ t=0 (อยู่ในช่วง `flashMs`), ที่ t=`flashMs` เริ่ม fade-out 150ms, `onFlashEnd` ที่ t=`flashMs`+150
  - `prefers-reduced-motion: reduce`: แสดงทันทีที่ t=0, ซ่อนทันทีที่ t=`flashMs`, `onFlashEnd` ที่ t=`flashMs`
  - **`flashMs` ไม่เปลี่ยนตาม reduced motion** ใช้ `setTimeout` ไม่พึ่ง `transitionend`, ยกเลิก timer เมื่อ unmount
  - เริ่มแฟลชใหม่ด้วยการเปลี่ยน `key` จากผู้เรียก
- ขนาด: `sm` กว้าง 200px, `md` `min(100%, 320px)`, `lg` `min(100%, 440px)` (SVG `viewBox` คงที่); ไม่มีสีตรงใน SVG
- a11y: `role="img"`, `aria-label={label ?? 'ตาราง 10 ช่อง'}` (**ห้ามใส่จำนวนจุดใน label**)
- `filled` นอกช่วง 0–10 หรือไม่ใช่จำนวนเต็ม → throw ใน dev

`useReducedMotion()` อยู่ใน `src/ui/` อ่าน `matchMedia('(prefers-reduced-motion: reduce)')` และติดตามการเปลี่ยน

หน้า `/#/dev/manipulatives` แสดง TenFrame ทุก `mode` × `colorMode` และปุ่ม "แฟลช 1.5 วิ" สำหรับลอง

### 3.2 `Keypad` + `AnswerDisplay` (`src/ui/`)

```ts
interface KeypadProps {
  value: string;                 // ตัวเลขที่พิมพ์ (เฉพาะ 0-9)
  onChange(next: string): void;
  onSubmit(): void;
  submitLabel: string;           // 'ตอบ' จาก content
  maxDigits?: number;            // ค่าเริ่มต้น 3 (คำตอบยาวสุดคือ 3 หลัก เช่น 513, 615)
  disabled?: boolean;
}
interface AnswerDisplayProps { value: string; placeholder: string }   // placeholder = 'แตะตัวเลขด้านล่าง'
```
- ผัง 4×3: `1 2 3 / 4 5 6 / 7 8 9 / ⌫ 0 ตอบ` ปุ่มสูง ≥ 56px
- ปุ่มลบตัวเลขแสดงเป็นไอคอน ⌫ พร้อม `aria-label="ลบตัวเลข"` (ไม่ใช้คำว่า "ลบ" บนปุ่ม เพราะซ้ำกับเครื่องหมายลบ — คำถามเปิด D10)
- กดตัวเลขเมื่อครบ `maxDigits` ไม่มีผล; ถ้าค่าปัจจุบันเป็น `"0"` ตัวเลขถัดไปแทนที่ `0`
- ปุ่ม "ตอบ" กดไม่ได้เมื่อค่าว่างหรือ `disabled`
- เมื่อไม่ `disabled` รับคีย์บอร์ดจริงด้วย: `0–9`, `Backspace`, `Enter` (ฟังที่ `window` เฉพาะตอน mount)
- ไม่ใช้ `<input>` เพื่อไม่ให้คีย์บอร์ดระบบเด้ง (overview §6)
- `AnswerDisplay` แสดงตัวเลขตัวใหญ่ ถ้าว่างแสดง placeholder สีจาง มี `aria-live="polite"`

### 3.3 `OptionGrid` (`src/ui/`) — ตัวเลือก "หนูคิดยังไง"

```ts
interface OptionGridProps {
  options: readonly { id: string; label: string; example?: string }[];
  onPick(id: string): void;
  columns?: 2;
}
```
2 คอลัมน์ (LS §5) ทุกความกว้างรวม 360px, ปุ่มสูง ≥ 64px, ตัวอย่างเป็นตัวเล็กใต้ข้อความ, แตะครั้งเดียว = เลือกและไปต่อ (คำถามเปิด D3), กันแตะซ้ำหลังเลือก

### 3.4 `ConfirmDialog` (`src/ui/`)
ใช้ `<dialog>` + `showModal()` props: `open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel`

## 4. ไฟล์เนื้อหา

### 4.1 Type (เพิ่ม/ปรับใน `src/engine/types.ts`)

```ts
export type SkillId = `${'add' | 'sub' | 'mul' | 'div'}.${string}`;

export type Problem =
  | { kind: 'arith'; op: '+' | '-' | '×' | '÷'; a: number; b: number }
  | { kind: 'missing-part'; whole: number; part: number }             // part + ? = whole
  | { kind: 'subitize'; count: number; visual: 'ten-frame' | 'abacus' };

export interface Misconception { id: string; description: string; observedBy: string }  // LS §3 คอลัมน์ 2, 3

export type ExampleCheck =
  | { kind: 'sums-equal'; groups: readonly (readonly number[])[] }  // ผลรวมทุกกลุ่มเท่ากัน
  | { kind: 'count-on'; start: number; count: number }               // start… start+1, …, start+count
  | { kind: 'jumps'; start: number; steps: readonly number[] };      // start → start+s1 → …
export interface StrategyOption {
  id: StrategyId;
  label: string;
  example?: { text: string; check?: ExampleCheck };
  counting: 'yes' | 'no' | 'ignore';                                 // LS §5 คอลัมน์ "นับเป็นการนับ"
}
export type StrategyId =
  | 'count-fingers' | 'count-on' | 'make-ten' | 'doubles' | 'known'
  | 'count-by-one' | 'column' | 'split-place' | 'jump-tens' | 'round' | 'unsure';
export interface StrategySet { id: string; options: readonly StrategyOption[] }

export interface WrongAnswerRule {
  response: number;
  misconceptionId: string;                                           // ใช้เมื่อวิธีคิดไม่ตรง byStrategy
  byStrategy?: Partial<Record<StrategyId, string>>;                  // วิธีคิด → รหัส (มาก่อนเสมอ)
}

export interface FlashVisual {
  type: 'ten-frame'; mode: 'flash'; readyMs: number; flashMs: number; colorMode: 'single' | 'split-5';
}

export interface Item {
  id: string;
  skillId: SkillId;
  problem: Problem;
  expected: number;               // เฉลยที่พิมพ์จาก Lesson Spec; เทสต์เทียบกับ solve(problem)
  input: 'keypad' | 'choices';
  choices?: readonly Choice[];    // Choice ตาม overview §4.1 (DX-ADD ไม่ใช้)
  visual?: FlashVisual;
  fluentMs?: number;              // ไม่มี = ไม่ใช้เกณฑ์เวลา
  strategySetId?: string;         // มี = ถาม "หนูคิดยังไง"
}
export interface DiagnosticItem extends Item {
  input: 'keypad';
  ladderSteps: readonly number[]; // ข้อ 5.3 = [6, 7]
  wrongAnswers: readonly WrongAnswerRule[];
}

export interface StageLevelCriteria {
  good: { minCorrect: number; minFluent?: number; maxCounting?: number };
  mid: { minCorrect: number };    // ไม่ถึง mid = low
}
export interface StageGroup { id: string; itemIds: readonly string[]; forbidStrategies: readonly StrategyId[] }

export interface DiagnosticStage {
  id: string;                     // 's1'..'s5'
  number: number;                 // 1..5 (แสดงผล)
  title: string;                  // LS §2 "ชื่อที่ลูกเห็น"
  intro: string;                  // LS §8.3 ทั้งบรรทัด
  instruction: string;            // LS §8.4 คำสั่งใต้โจทย์
  items: readonly DiagnosticItem[];
  level?: StageLevelCriteria;     // ด่าน 1–4
  groups?: readonly StageGroup[]; // ด่าน 5
  skipIf?: { stageId: string; correctAtMost: number };
}

export type RecommendationCondition =
  | { kind: 'stage-not-good'; stageId: string }
  | { kind: 'group-not-pass'; groupId: string; orStageSkipped?: string }
  | { kind: 'item-strategy-not'; itemId: string; strategyId: StrategyId }
  | { kind: 'always' };
export interface RecommendationRule { no: number; when: RecommendationCondition; ladderStep: number; reason: string }

export interface LadderStepInfo { step: number; name: string }
export interface NumberTalk { ladderStep: number; prompt: string; questions: readonly string[] }

export interface Diagnostic {
  kind: 'diagnostic';
  id: string;                      // 'DX-ADD'
  version: string;                 // 'DX-ADD v2'
  title: string;
  ladder: readonly LadderStepInfo[];
  misconceptions: readonly Misconception[];
  strategySets: readonly StrategySet[];
  timing: { ackMs: number };
  stages: readonly DiagnosticStage[];
  recommendation: readonly RecommendationRule[];
  texts: DiagnosticTexts;
  numberTalks: { items: readonly NumberTalk[]; rules: readonly string[] };
}
```
- ใช้ข้อมูลล้วนแทนฟังก์ชัน `recommend` ในร่าง overview §4.1 เพื่อให้ตรวจด้วยเทสต์และใช้ engine เดียวกับแบบทดสอบวิชาอื่นได้
- `DiagnosticTexts` ดู §4.3

### 4.2 Registry ร่วม

**`content/ladders.ts`** `additionLadder: LadderStepInfo[]` ชื่อขั้น 1–9 คัดจาก `docs/math-learning-plan.md` §5 คอลัมน์ "เนื้อหา" ตามตัวอักษร (เช่น ขั้น 4 = "**ทำให้ครบ 10**" ไม่มีเครื่องหมาย `**`) (คำถามเปิด D14)

**`content/skills.ts`** `skills: { id: SkillId; ladderStep: number; title: string }[]` ใน M1 มีเท่านี้ (เกณฑ์ Leitner รอ ADR-0006)

| skillId | ขั้น | ข้อที่ใช้ |
|---|---|---|
| `add.subitize-10` | 1 | 1.1–1.4 |
| `add.bonds-10` | 2 | 2.1–2.4 |
| `add.doubles` | 3 | 3.1–3.4 |
| `add.make-10` | 4 | 4.1–4.4 |
| `add.tens` | 5 | 5.1–5.2 |
| `add.2digit` | 6–8 | 5.3–5.4 |

**`content/misconceptions.ts`** `addMisconceptions: Misconception[]` M1–M12 และ MX จาก LS §3 ตามตัวอักษร

**`content/strategies.ts`** 2 ชุดจาก LS §5 (id ตาม LS ทุกตัว)

| set id | ใช้กับ | options (ตามลำดับ LS) |
|---|---|---|
| `add.single-digit` (ชุด A) | 3.3, 3.4, 4.1–4.4 | count-fingers, count-on, make-ten, doubles, known, unsure |
| `add.two-digit` (ชุด B) | 5.3, 5.4 | count-by-one, column, split-place, jump-tens, round, unsure |

ตัวอย่างและ `check` (ตรวจเลขแล้ว)

| option | `example.text` | `check` | ตรวจ |
|---|---|---|---|
| count-on | `9… 10, 11, 12` (ใช้ `…` U+2026) | `{ kind: 'count-on', start: 9, count: 3 }` | 9→12 |
| make-ten | `9+3 = 9+1+2` | `sums-equal [[9,3],[9,1,2]]` | 12 = 12 |
| doubles | `5+6 = 5+5+1` | `sums-equal [[5,6],[5,5,1]]` | 11 = 11 |
| column | `หน่วยบวกหน่วย แล้วทด` | ไม่มี | — |
| split-place | `23+14 = 30+7` | `sums-equal [[23,14],[30,7]]` | 37 = 37 |
| jump-tens | `23 → 33 → 37` | `{ kind: 'jumps', start: 23, steps: [10, 4] }` | 23+10 = 33, 33+4 = 37 |
| round | `29+5 = 30+4` | `sums-equal [[29,5],[30,4]]` | 34 = 34 |

`formatExample(check)` (ใน `engine/problem.ts`) ต้องสร้างข้อความเดียวกับ `example.text` เป๊ะ: sums-equal = กลุ่มต่อด้วย `+` คั่นกลุ่มด้วย ` = `; count-on = `${start}… ` + ตัวเลขถัดไปคั่นด้วย `, `; jumps = ทุกจุดคั่นด้วย ` → `

### 4.3 `src/content/diagnostics/DX-ADD.ts`

```ts
import type { Diagnostic } from '@/engine/types';
import { additionLadder } from '../ladders';
import { addMisconceptions } from '../misconceptions';
import { addStrategySets } from '../strategies';

const FLASH = { type: 'ten-frame', mode: 'flash', readyMs: 900, flashMs: 1500, colorMode: 'single' } as const;

export const DX_ADD = {
  kind: 'diagnostic',
  id: 'DX-ADD',
  version: 'DX-ADD v2',
  title: 'ภารกิจสำรวจการบวก',
  ladder: additionLadder,
  misconceptions: addMisconceptions,
  strategySets: addStrategySets,
  timing: { ackMs: 1000 },                           // คำถามเปิด D1
  stages: [
    {
      id: 's1', number: 1, title: 'เห็นภาพ 10 ช่อง',
      intro: 'ด่าน 1 · เห็นภาพ 10 ช่อง — ภาพจะโผล่มาแป๊บเดียว นับไม่ทันก็ไม่เป็นไร ลองดูทั้งภาพ',
      instruction: 'ดูภาพให้ดี แล้วบอกว่ามีจุดกี่จุด',
      level: { good: { minCorrect: 4 }, mid: { minCorrect: 3 } },
      items: [
        { id: '1.1', skillId: 'add.subitize-10', ladderSteps: [1], input: 'keypad',
          problem: { kind: 'subitize', count: 7, visual: 'ten-frame' }, expected: 7, visual: FLASH,
          wrongAnswers: [
            { response: 6, misconceptionId: 'M1' }, { response: 8, misconceptionId: 'M1' },
            { response: 5, misconceptionId: 'M2' }, { response: 3, misconceptionId: 'M3' },
          ] },
        // 1.2–1.4 ตาม LS §4 ด่าน 1 (ไม่มี fluentMs)
      ],
    },
    {
      id: 's2', number: 2, title: 'คู่รวม 10', /* intro, instruction ตาม LS §8.3, §8.4 */
      level: { good: { minCorrect: 4, minFluent: 3 }, mid: { minCorrect: 3 } },
      items: [
        { id: '2.1', skillId: 'add.bonds-10', ladderSteps: [2], input: 'keypad',
          problem: { kind: 'missing-part', whole: 10, part: 7 }, expected: 3, fluentMs: 3000,
          wrongAnswers: [
            { response: 2, misconceptionId: 'M5' }, { response: 4, misconceptionId: 'M5' },
            { response: 17, misconceptionId: 'M4' },
          ] },
        // 2.2–2.4
      ],
    },
    {
      id: 's3', number: 3, title: 'เลขคู่',
      level: { good: { minCorrect: 4, minFluent: 3, maxCounting: 0 }, mid: { minCorrect: 3 } },
      items: [
        // 3.1, 3.2: fluentMs 3000 ไม่มี strategySetId
        { id: '3.3', skillId: 'add.doubles', ladderSteps: [3], input: 'keypad',
          problem: { kind: 'arith', op: '+', a: 6, b: 7 }, expected: 13, fluentMs: 4000,
          strategySetId: 'add.single-digit',
          wrongAnswers: [
            { response: 12, misconceptionId: 'M5', byStrategy: { doubles: 'M8' } },
            { response: 14, misconceptionId: 'M5', byStrategy: { doubles: 'M8' } },
            { response: 3, misconceptionId: 'M6' },
          ] },
        // 3.4
      ],
    },
    {
      id: 's4', number: 4, title: 'บวกข้ามสิบ',
      level: { good: { minCorrect: 4, minFluent: 3, maxCounting: 1 }, mid: { minCorrect: 3 } },
      items: [
        // 4.1: 12,14→M5 · 3→M6 · 15,18→M7 (ไม่มีเงื่อนไขวิธีคิด)
        { id: '4.2', skillId: 'add.make-10', ladderSteps: [4], input: 'keypad',
          problem: { kind: 'arith', op: '+', a: 9, b: 6 }, expected: 15, fluentMs: 4000,
          strategySetId: 'add.single-digit',
          wrongAnswers: [
            { response: 14, misconceptionId: 'M5' },
            { response: 16, misconceptionId: 'M5', byStrategy: { 'make-ten': 'M7' } },
            { response: 19, misconceptionId: 'M7' },
            { response: 5, misconceptionId: 'M6' },
          ] },
        // 4.3, 4.4 (4.4: 14 → M7 ถ้า make-ten ไม่งั้น M5)
      ],
    },
    {
      id: 's5', number: 5, title: 'เลขสองหลัก',
      skipIf: { stageId: 's4', correctAtMost: 1 },
      groups: [
        { id: '5A', itemIds: ['5.1', '5.2'], forbidStrategies: [] },
        { id: '5B', itemIds: ['5.3'], forbidStrategies: ['count-by-one'] },
        { id: '5C', itemIds: ['5.4'], forbidStrategies: ['count-by-one'] },
      ],
      items: [
        // 5.1 [5] 5000, 5.2 [5] 5000, 5.3 [6,7] 15000 ถาม, 5.4 [8] 15000 ถาม
        { id: '5.4', skillId: 'add.2digit', ladderSteps: [8], input: 'keypad',
          problem: { kind: 'arith', op: '+', a: 49, b: 26 }, expected: 75, fluentMs: 15000,
          strategySetId: 'add.two-digit',
          wrongAnswers: [
            { response: 65, misconceptionId: 'M10' },
            { response: 615, misconceptionId: 'M11' },
            { response: 74, misconceptionId: 'M5', byStrategy: { round: 'M12' } },
            { response: 76, misconceptionId: 'M5', byStrategy: { round: 'M12' } },
          ] },
      ],
    },
  ],
  recommendation: [
    { no: 1, when: { kind: 'stage-not-good', stageId: 's1' }, ladderStep: 1, reason: '…LS §7 แถว 1' },
    { no: 2, when: { kind: 'stage-not-good', stageId: 's2' }, ladderStep: 2, reason: '…' },
    { no: 3, when: { kind: 'stage-not-good', stageId: 's3' }, ladderStep: 3, reason: '…' },
    { no: 4, when: { kind: 'stage-not-good', stageId: 's4' }, ladderStep: 4, reason: '…' },
    { no: 5, when: { kind: 'group-not-pass', groupId: '5A', orStageSkipped: 's5' }, ladderStep: 5, reason: '…' },
    { no: 6, when: { kind: 'group-not-pass', groupId: '5B' }, ladderStep: 6, reason: '…' },
    { no: 7, when: { kind: 'group-not-pass', groupId: '5C' }, ladderStep: 7, reason: '…' },
    { no: 8, when: { kind: 'item-strategy-not', itemId: '5.4', strategyId: 'round' }, ladderStep: 8, reason: '…' },
    { no: 9, when: { kind: 'always' }, ladderStep: 9, reason: '…' },
  ],
  texts: { /* ดูตารางข้างล่าง */ },
  numberTalks: { items: [ /* LS §10 ขั้น 1–9 */ ], rules: [ /* LS §10 กติกา 4 ข้อ */ ] },
} as const satisfies Diagnostic;
```

ข้อที่เว้นไว้ (`//`) ให้กรอกจาก LS §4 ตามรูปแบบเดียวกัน **`byStrategy` ใส่เฉพาะคำตอบที่ LS เขียนเงื่อนไข "ถ้าเลือก … ไม่งั้น …" เท่านั้น** ได้แก่ 3.3 (12, 14), 3.4 (14, 16), 4.2 (16), 4.4 (14), 5.4 (74, 76)

**`DiagnosticTexts`** (ทุกค่าตรงตาม LS)

| key | ค่า / ที่มา |
|---|---|
| `parentIntro.title`, `.description` | LS §8.1 |
| `parentIntro.bullets: { strong?: string; text: string }[]` | LS §8.1 รายการ 4 ข้อ (ส่วนตัวหนาอยู่ใน `strong`) |
| `parentIntro.button` | `ต่อไป: หน้าของลูก` |
| `kidIntro.title`, `.lines[2]`, `.button` | LS §8.2 |
| `stageGo` | `ไปเลย` |
| `flash.ready`, `.show`, `.hidden` | `พร้อมนะ...`, `ดู!`, `ซ่อนแล้ว! กี่จุดนะ?` |
| `answerPlaceholder` | `แตะตัวเลขด้านล่าง` |
| `submit` | `ตอบ` |
| `acks` | `['รับแล้ว!', 'โอเค ไปต่อ!', 'เยี่ยม ขอบคุณ!']` |
| `strategyQuestion` | `หนูคิดข้อนี้ยังไง?` |
| `stageComplete` | `ผ่านด่าน {n} แล้ว! เหลืออีก {m} ด่าน` |
| `kidEnd.title`, `.text`, `.button` | LS §8.5 |
| `results.recommend` | `แนะนำให้เริ่มที่ ขั้นที่ {n}: {name}` |
| `results.parentNote` | LS §7 หมายเหตุสำหรับพ่อ |
| `results.incomplete` | `ยังทำไม่ครบ ควรทำต่อให้จบก่อน` |
| `results.levels` | `good` คล่องแล้ว · `mid` ยังไม่อัตโนมัติ · `low` ยังไม่แน่น · `skipped` ข้าม (LS §6) |
| `results.ladderPassed`, `.ladderStart` | `ผ่านแล้ว`, `← เริ่มตรงนี้` |
| `results.noMisconception` | `ไม่พบรูปแบบความเข้าใจผิด` |
| `results.retry` | `ทำใหม่อีกครั้ง` |
| `results.*` ที่ LS ไม่ได้กำหนด | ข้อเสนอใน §5.7 (คำถามเปิด D13) |
| `stop.*` | ข้อเสนอใน §5.3 (คำถามเปิด D4) |

## 5. ลำดับการทำงานและ state

### 5.1 หน้าจอและ route

| route | หน้าที่ |
|---|---|
| `/` | M1 แสดงการ์ด `DX_ADD.title` → `/play/DX-ADD` (ถ้ายังไม่มีผู้เรียน ใช้ฟอร์ม M0) |
| `/play/:activityId` | หา `diagnostics[activityId]` ใน `content/registry.ts` → `DiagnosticPlayer`; ไม่มีผู้เรียน → `/` |
| `/parent` | เพิ่มส่วน "ผลแบบทดสอบ" = `HistoryList` ของผู้เรียนปัจจุบัน |
| `/parent/results/:sessionId` | **route ใหม่** หน้าผล (§5.7) |

### 5.2 State machine (`engine/diagnostic/machine.ts`, pure)

```ts
type Phase =
  | { kind: 'parent-intro' }
  | { kind: 'kid-intro' }
  | { kind: 'stage-intro'; stage: number; completed: { n: number; m: number } | null }
  | { kind: 'item'; stage: number; item: number; step: 'ready' | 'show' | 'answering' }
  | { kind: 'ack'; stage: number; item: number; text: string }
  | { kind: 'strategy'; stage: number; item: number }
  | { kind: 'kid-end' }
  | { kind: 'stopped' };

interface RunnerState {
  phase: Phase;
  started: boolean;
  answers: readonly AnswerRecord[];     // ข้อที่เสร็จแล้ว (บันทึกแล้ว)
  pending: PendingAnswer | null;        // ตอบแล้ว รอคำถามวิธีคิด
  submitted: number;                    // ใช้หมุนข้อความ ack
  skippedStageIds: readonly string[];
}

type RunnerAction =
  | { type: 'PARENT_CONTINUE' } | { type: 'KID_START' } | { type: 'STAGE_GO' }
  | { type: 'READY_DONE' } | { type: 'FLASH_END' }
  | { type: 'SUBMIT'; response: number; latencyMs: number; latencyValid: boolean; flashInterrupted: boolean }
  | { type: 'ACK_DONE' } | { type: 'STRATEGY_PICK'; strategyId: StrategyId } | { type: 'STOP' };

type Effect =
  | { type: 'emit'; event: EventPayload }     // AppEvent ที่ยังไม่มี id/at/schemaVersion/learnerId/sessionId/activityId
  | { type: 'schedule'; afterMs: number; action: 'READY_DONE' | 'ACK_DONE' };

export function createDiagnosticMachine(dx: Diagnostic): {
  initial(): RunnerState;
  transition(state: RunnerState, action: RunnerAction): { state: RunnerState; effects: Effect[] };
};
```

ตาราง transition (คู่ phase/action ที่ไม่อยู่ในตาราง = ไม่เปลี่ยนอะไร ไม่มี effect)

| จาก | action | ไป | effect |
|---|---|---|---|
| parent-intro | PARENT_CONTINUE | kid-intro | — |
| kid-intro | KID_START | stage-intro(0, null), `started=true` | emit `session.started` |
| stage-intro | STAGE_GO | `enterItem(stage, 0)` | |
| item/ready | READY_DONE | item/show | — |
| item/show | FLASH_END | item/answering | — |
| item/answering | SUBMIT | ack (`text = acks[submitted % acks.length]`), `submitted+1` | schedule(`timing.ackMs`, ACK_DONE); ถ้าข้อ**ไม่ถาม**วิธีคิด: บันทึกลง `answers` + emit `item.answered` ทันที; ถ้าถาม: เก็บใน `pending` |
| ack | ACK_DONE | มี `pending` → strategy; ไม่มี → `advance()` | |
| strategy | STRATEGY_PICK (id ต้องอยู่ในชุดของข้อ ไม่งั้นไม่สนใจ) | `advance()` | จัดประเภทใหม่พร้อมวิธีคิด → บันทึก + emit `item.answered`, `pending=null` |
| ก่อน `started` | STOP | stopped | — (UI กลับหน้าหลัก) |
| หลัง `started` ยกเว้น kid-end/stopped | STOP | stopped | ทิ้ง `pending`; emit `session.abandoned` (summary แบบ partial) |

- `enterItem(s, i)`: ข้อมี `visual.mode === 'flash'` → item/ready + schedule(`visual.readyMs`, READY_DONE); ไม่งั้น → item/answering
- `advance()`: มีข้อถัดไปในด่าน → `enterItem`; จบด่าน → หาด่านถัดไป ถ้ามี `skipIf` และ `ถูกในด่าน skipIf.stageId ≤ correctAtMost` → เพิ่มใน `skippedStageIds` แล้วข้ามต่อ
  - ยังมีด่านที่ไม่ข้าม → stage-intro(ด่านนั้น, `completed = { n: ด่านที่เพิ่งจบ.number, m: stages.length − n }`)
  - ไม่มีแล้ว → kid-end + emit `session.completed` (summary แบบ complete)
  - ผล: ข้ามด่าน 5 แล้วไม่มีข้อความ "ผ่านด่าน 4" ไปหน้าจบเลย (LS §8.4) และด่าน 5 ที่ทำจบแล้วไม่มีข้อความจบด่าน
- ข้อความจบด่านแสดง**ด้านบนของหน้าเปิดด่านถัดไป** ไม่มีหน้าหรือปุ่มเพิ่ม (คำถามเปิด D2)
- ข้อความ ack ไม่ขึ้นกับถูก/ผิด (หมุนตามลำดับข้อที่ตอบ) นี่คือกลไกของ LS §12 #3

### 5.3 Hook และหน้าจอ (`src/app/diagnostic/`)

**`useDiagnosticRunner(dx, { learnerId, outbox })`**
- สร้าง `sessionId = newId()` ครั้งเดียวตอน mount
- เรียก `transition` แล้วทำ effect
  - `emit` → เติม `id: newId()`, `at: new Date().toISOString()`, `schemaVersion: 1`, `learnerId`, `sessionId`, `activityId: dx.id` แล้ว `outbox.append([event])`
  - `schedule` → `setTimeout` เก็บ timer เดียว ล้างทุกครั้งที่ phase เปลี่ยน และตอน unmount
- phase `stopped`: ถ้า `started` → `navigate('/parent/results/' + sessionId)` ไม่งั้น → `navigate('/')`

**`DiagnosticPlayer`** render ตาม phase

| phase | สิ่งที่แสดง |
|---|---|
| parent-intro | LS §8.1 |
| kid-intro | LS §8.2 |
| stage-intro | (ถ้ามี) `stageComplete` เติม `{n}`, `{m}` + `stage.intro` + ปุ่ม `stageGo` |
| item (ด่าน 1) | `TenFrame colorMode="single"` (`key=item.id`): ready → `hidden` + `flash.ready`; show → `flash` (`flashMs=visual.flashMs`, `onFlashEnd` → FLASH_END) + `flash.show`; answering → `hidden` + `flash.hidden` · ใต้ภาพ `stage.instruction` · `AnswerDisplay` · `Keypad` (`disabled` จนกว่า answering) |
| item (ด่าน 2–5) | โจทย์ตัวใหญ่ `formatProblem` (arith `8 + 5 = ?`, missing-part `7 + ? = 10`) · `stage.instruction` · `AnswerDisplay` · `Keypad` |
| ack | `phase.text` ตัวใหญ่กลางจอ |
| strategy | `strategyQuestion` + `OptionGrid` (label + `example.text`) |
| kid-end | LS §8.5 ปุ่ม → `/parent/results/:sessionId` |

- ค่าที่พิมพ์เก็บใน state ของหน้าข้อ (reset ด้วย `key=item.id`) กด "ตอบ" → `Number(value)` + ผลจาก `useSilentTimer` → SUBMIT
- layout: แนวตั้งเรียงบนลงล่าง; ความกว้าง ≥ 700px และแนวนอน → 2 คอลัมน์ (โจทย์/ภาพซ้าย, แป้นขวา); ใช้ได้ที่ 360px ไม่ต้อง scroll แนวนอน
- **หยุดกลางทาง (พ่อ):** ในหน้า Play กดค้างโลโก้ 2 วินาที → `ConfirmDialog` ข้อความเสนอ: title `หยุดภารกิจนี้?`, body `ผลจะประเมินจากด่านที่ทำครบเท่านั้น`, ปุ่ม `หยุดและดูผล` / `ทำต่อ` → ยืนยัน = STOP; เปิด dialog ระหว่าง answering → `timer.invalidate()` (คำถามเปิด D4)
- ห้าม `UpdateBanner` ในหน้านี้ (M0)

### 5.4 จัดประเภทความเข้าใจผิด (`engine/diagnostic/classify.ts`)

```ts
export function classify(item: DiagnosticItem, response: number, strategyId?: StrategyId):
  { correct: boolean; misconceptionId?: string };
```
1. `response === solve(item.problem)` → `{ correct: true }` (ไม่มีรหัส ไม่ว่าเลือกวิธีไหน)
2. หา `rule` ที่ `rule.response === response`
   - พบ: `rule.byStrategy?.[strategyId] ?? rule.misconceptionId` (**วิธีคิดมาก่อน** ตาม LS §4)
   - ไม่พบ: `'MX'`
3. ข้อที่ถามวิธีคิด จัดประเภทตอน STRATEGY_PICK (หลังได้วิธีคิด) ตาม LS §11

`solve()` (`engine/problem.ts`): arith `+ - × ÷` (÷ ต้องหารลงตัว ไม่งั้น throw), missing-part = `whole − part`, subitize = `count`

### 5.5 เวลาเงียบ ความคล่อง และระดับ

**`engine/timing.ts`**
```ts
export interface SilentTimer {
  start(): void;                                                 // เริ่มนับ (เรียกซ้ำ = เริ่มใหม่)
  invalidate(): void;                                            // ติดธงว่าเวลาใช้ไม่ได้
  stop(): { latencyMs: number; latencyValid: boolean };          // latencyMs ปัดเป็นจำนวนเต็ม
}
export function createSilentTimer(now: () => number = () => performance.now()): SilentTimer;
```

**`useSilentTimer(itemKey, phaseStep)`** (app)
- `start()` ใน `useEffect` เมื่อ step เป็น `answering` (ข้อแฟลช = หลังภาพหายและ `onFlashEnd` แล้ว; ข้ออื่น = ตอนหน้าข้อแสดงและแป้นใช้ได้)
- ฟัง `visibilitychange`: `document.visibilityState === 'hidden'` ระหว่าง answering → `invalidate()`; ถ้าหน้าถูกซ่อนอยู่แล้วตอน start → invalid
- ถ้าถูกซ่อนระหว่าง ready/show ของข้อแฟลช → `flashInterrupted = true` (บันทึกไว้ดูเท่านั้น ไม่มีผลต่อการประเมิน คำถามเปิด D8)
- ห้าม render ค่าเวลาใดๆ ในหน้าของลูก

**ความคล่อง** `isFluent(item, correct, latencyMs, latencyValid): boolean | null`
- ไม่มี `fluentMs` → `null` (ด่าน 1)
- ผิด → `false`; ถูกและ `latencyValid === false` → `true` (LS §6); ถูก → `latencyMs <= fluentMs`

**สรุปรายด่าน** `summarizeStage(dx, stage, answers, skipped)` → `StageSummary` (§6)
- `status`: `skipped` / `done` (ตอบครบทุกข้อ) / `incomplete` (ตอบ 1 ข้อขึ้นไปแต่ไม่ครบ) / `not-reached`
- `correct`, `answered`; `fluentCount` (`null` ถ้าไม่มีข้อที่มี `fluentMs`); `countingCount` = จำนวนข้อที่วิธีคิดที่เลือกมี `counting === 'yes'` (`null` ถ้าด่านไม่มีข้อที่ถาม); `meanLatencyMs` = เฉลี่ยของข้อที่ `latencyValid` (รวมข้อผิด) `null` ถ้าไม่มี (คำถามเปิด D12)
- `level` (เฉพาะ `status === 'done'` และมี `stage.level`): `good` ถ้า `correct ≥ good.minCorrect` และ `fluentCount ≥ good.minFluent` (ถ้ากำหนด) และ `countingCount ≤ good.maxCounting` (ถ้ากำหนด); ไม่งั้น `mid` ถ้า `correct ≥ mid.minCorrect`; ไม่งั้น `low` · skipped → `'skipped'` · อื่นๆ → `null`

**กลุ่ม** `evaluateGroup(stage, group, answers, stageStatus)` → `'pass' | 'fail' | 'skipped' | 'not-evaluated'`
- ด่าน skipped → `skipped`; ด่านไม่ `done` → `not-evaluated`
- `pass` เมื่อทุกข้อในกลุ่ม ถูก และ `fluent === true` และวิธีคิดไม่อยู่ใน `forbidStrategies`

### 5.6 แนะนำขั้น (`engine/diagnostic/recommend.ts`)

```ts
export type Recommendation = { kind: 'step'; ladderStep: number; ruleNo: number } | { kind: 'incomplete' };
export function recommend(dx: Diagnostic, stages: StageSummary[], groups: GroupSummary[], answers: AnswerRecord[]): Recommendation;
```
ไล่ `dx.recommendation` ตามลำดับ `no` แต่ละกฎ**ประเมินได้**เมื่อด่านที่กฎอ้างถึงมี status `done` หรือ `skipped`
- `stage-not-good`: ด่านนั้น `level !== 'good'`
- `group-not-pass`: กลุ่ม `fail` หรือ (มี `orStageSkipped` และด่านนั้น skipped) หรือกลุ่ม `skipped`
- `item-strategy-not`: วิธีคิดของข้อนั้น `!== strategyId` (รวมกรณี `unsure`)
- `always`: จริงเสมอ (ประเมินได้เมื่อทุกด่าน done/skipped)

ถ้ากฎประเมินได้และเป็นจริง → `step`; ถ้าเจอกฎที่ประเมินไม่ได้ (ด่านยังไม่ครบ) → `incomplete` ทันที

ผลคือกติกา "หยุดกลางทาง" ของ LS §7: ด่านที่ครบเป็น prefix เสมอ ถ้ามีด่านที่ครบแต่ไม่ใช่ `good` จะถูกพบก่อนถึงด่านที่ไม่ครบ ถ้าครบแล้ว `good` ทั้งหมดจะได้ `incomplete` · ด่าน 5 ทำไม่ครบ = ประเมินไม่ได้ทั้งด่าน แม้ 5A จะตอบครบแล้ว (คำถามเปิด D6)

**`summarize(dx, answers, skippedStageIds, completion)`** (`summary.ts`) รวม stage, group, misconception (เรียง M1…M12, MX พร้อม itemIds) และ recommendation เป็น `DiagnosticSummary`

**`sessions.ts`** `groupSessions(events): SessionView[]` จัดกลุ่มตาม `sessionId` เรียงใหม่→เก่า `{ sessionId, activityId, activityVersion, startedAt, endedAt?, status: 'complete' | 'abandoned' | 'open', summary?, items: ItemAnsweredEvent[] }` (`open` = ไม่มี event จบ เช่น ปิดแอปกลางทาง)

### 5.7 หน้าผลสำหรับพ่อ (`/parent/results/:sessionId`)

ข้อมูล: `store.listEvents({ sessionId })` รวมกับ `outbox.pending()` ของ session นั้น (ตัด id ซ้ำ)
- ใช้ `summary` จาก `session.completed` / `session.abandoned`
- session `open`: ถ้า `activityVersion === dx.version` คำนวณด้วย `summarize(..., 'partial')` ไม่งั้นแสดงแค่ตารางรายข้อ
- ป้าย "หยุดกลางทาง" เมื่อ `completion === 'partial'` หรือ `open`

ส่วนต่างๆ เรียงตาม LS §9 (หัวข้อส่วนใช้ชื่อใน LS §9)
1. **ขั้นที่แนะนำ:** `results.recommend` (`{name}` จาก `dx.ladder`) + `reason` ของกฎ + `parentNote`; ถ้า `incomplete` แสดง `results.incomplete` + `parentNote`
2. **ผลรายด่าน:** ด่าน 1–4 ต่อแถว: `ด่าน {n} · {title}`, ถูก `{correct}/{items.length}`, เวลาเฉลี่ย `{x.x} วิ` หรือ `—`, ใช้การนับ `{countingCount}` หรือ `—`, ระดับ (`results.levels` หรือ "ทำไม่ครบ"/"ยังไม่ได้ทำ") · ด่าน 5: 3 แถวย่อย 5A/5B/5C = "ผ่าน" / "ยังไม่ผ่าน" / "ข้าม" / "ยังไม่ได้ทำ"
3. **บันไดการบวก:** 9 ขั้น ขั้น < แนะนำ = `ผ่านแล้ว`, ขั้นที่แนะนำไฮไลต์ด้วย `--color-highlight` + `← เริ่มตรงนี้` · ซ่อนเมื่อ `incomplete` (คำถามเปิด D7)
4. **ความเข้าใจผิดที่พบ:** `{id} — {description}` + "พบในข้อ {itemIds}" หรือ `noMisconception`
5. **รายละเอียดทุกข้อ:** คอลัมน์ ข้อ · โจทย์ (`formatProblem`; subitize = `แฟลช {count} จุด`) · คำตอบ · ถูก/ผิด (`ถูก` หรือ `ผิด · เฉลย {expected}`) · เวลา `{x.x}` (ถ้า `latencyValid=false` เติม ` *` และ footnote `* สลับแอปหรือหยุดระหว่างข้อนี้ ไม่นำเวลามาคิด`) · คล่อง (`ใช่`/`ไม่`/`—`) · วิธีคิด (label) · ความเข้าใจผิด (รหัส) — ที่ 360px ให้ตาราง scroll แนวนอน**ภายในกล่องของตาราง** (`overflow-x: auto`) หน้าไม่ scroll
6. **คุยกันต่อ (Number Talks):** ข้อของขั้นที่แนะนำ (`prompt` + `questions`) + `rules` ทุกข้อ · ซ่อนเมื่อ `incomplete` (D7)
7. **ปุ่ม:** `ทำใหม่อีกครั้ง` → `/play/DX-ADD` · export (ใช้ฟังก์ชันของ M0)
8. **ประวัติ:** `HistoryList` ของผู้เรียนและ activity เดียวกัน วันที่ (`toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })`) + `ขั้นที่ {n}` / `ยังทำไม่ครบ` แตะเพื่อเปิดผลย้อนหลัง ครั้งปัจจุบันมีเครื่องหมายกำกับ

เวลาแสดง**เฉพาะในหน้านี้**

## 6. ข้อมูลที่บันทึก

ปรับรายละเอียด `AppEvent` จาก overview §4.2 (ยังเป็น `schemaVersion: 1` เพราะ M0 ไม่เคยเขียน event)

```ts
interface EventBase { id: string; at: string; schemaVersion: 1; learnerId: string; sessionId: string; activityId: string }

export interface ItemAnsweredEvent {
  type: 'item.answered';
  itemId: string;
  stageId?: string;                // DX: 's1'..'s5'
  ladderSteps?: number[];          // DX: จาก item
  skillId: SkillId;
  problem: Problem;
  expected: number;                // solve(problem)
  response: number;
  correct: boolean;
  misconceptionId?: string;        // หลังได้วิธีคิดแล้ว
  latencyMs: number;
  latencyValid: boolean;
  fluentMs?: number;               // snapshot เกณฑ์ ณ ตอนนั้น (เกณฑ์อาจปรับภายหลัง)
  fluent: boolean | null;
  strategySetId?: string;
  strategyId?: StrategyId;
  flashInterrupted?: boolean;      // เฉพาะข้อแฟลชที่ถูกซ่อนแท็บระหว่างแสดง
  attemptNo: number;               // DX = 1 เสมอ
}

export type AppEvent = EventBase & (
  | { type: 'session.started'; activityKind: 'diagnostic' | 'lesson'; activityVersion: string }
  | ItemAnsweredEvent
  | { type: 'strategy.reported'; itemId: string; strategyId: StrategyId }   // สงวนไว้ DX-ADD ไม่ใช้
  | { type: 'session.completed'; activityVersion: string; summary: SessionSummary }
  | { type: 'session.abandoned'; activityVersion: string; summary: SessionSummary }
);

export type SessionSummary = DiagnosticSummary;   // บทเรียนจะเพิ่มเป็น union ใน M2
export interface DiagnosticSummary {
  kind: 'diagnostic';
  completion: 'complete' | 'partial';
  stages: StageSummary[];          // { stageId, number, status, answered, correct, fluentCount, countingCount, meanLatencyMs, level }
  groups: GroupSummary[];          // { groupId, status }
  skippedStageIds: string[];
  misconceptions: { id: string; itemIds: string[] }[];
  recommendation: Recommendation;
}
```

| event | เมื่อ | ครอบคลุม LS §11 |
|---|---|---|
| `session.started` | ลูกกด "เริ่มภารกิจ" | เวลาเริ่ม (`at`), เวอร์ชัน |
| `item.answered` | ข้อไม่ถามวิธีคิด: ตอน SUBMIT · ข้อถาม: ตอน STRATEGY_PICK | ข้อมูลต่อข้อครบ |
| `session.completed` | เข้าหน้าจบของลูก | เวลาจบ, ทำครบ, ด่านที่ข้าม, ระดับ, กลุ่ม, ขั้นที่แนะนำ |
| `session.abandoned` | พ่อยืนยันหยุด | เหมือนข้างบน แบบ partial |

- เขียนผ่าน outbox (M0) ถ้าเขียนไม่ได้ลูกเล่นต่อได้
- `isAppEvent` (M0) ต้องปรับให้ตรวจ field ใหม่ และมีเทสต์
- ข้อที่ตอบแล้วแต่ยังไม่ได้เลือกวิธีคิดตอนพ่อกดหยุด จะไม่ถูกบันทึก (คำถามเปิด D5)

## 7. เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] AC1: เทสต์เนื้อหา (§8.1) ผ่านทั้งหมด — เฉลยทุกข้อคำนวณจากโจทย์ตรงกับ LS, คำตอบผิดทุกตัวได้รหัสตาม LS ทุกวิธีคิด, ตัวอย่างวิธีคิดเลขถูก
- [ ] AC2: ลำดับหน้าจอตรง §5.2: พ่อ → ลูก → เปิดด่าน 1 → 20 ข้อ → หน้าจบ; ข้อ 3.3, 3.4, ทุกข้อด่าน 4, 5.3, 5.4 ถามวิธีคิด ข้ออื่นไม่ถาม
- [ ] AC3: ด่าน 4 ถูก ≤ 1 ข้อ → ไม่เห็นด่าน 5 ไม่มีข้อความ "ผ่านด่าน 4" ไปหน้าจบทันที และ summary มี `skippedStageIds: ['s5']`; ถูก 2 ข้อ → เห็น "ผ่านด่าน 4 แล้ว! เหลืออีก 1 ด่าน" และทำด่าน 5
- [ ] AC4: ด่าน 1: "พร้อมนะ..." 900ms → ภาพ 1500ms พร้อม "ดู!" → ซ่อนพร้อม "ซ่อนแล้ว! กี่จุดนะ?" แป้นใช้ได้หลังซ่อนเท่านั้น จุดสีเดียว ไม่มีปุ่มดูซ้ำ; reduced motion เวลาเท่าเดิม ไม่มี fade (component test ด้วย fake timers)
- [ ] AC5: หน้าของลูกไม่มีตัวเลขเวลา ตัวจับเวลา แถบนับถอยหลัง คะแนน หรือคำบอกถูก/ผิด (e2e ตรวจ §8.4)
- [ ] AC6: ข้อความ ack เป็นลำดับเดียวกันไม่ว่าตอบถูกหรือผิด (e2e เทียบ 2 รอบ)
- [ ] AC7: ข้อความของลูกและพ่อตรงกับ LS §8 ทุกตัวอักษร (Designer ตรวจ + e2e ตรวจบางข้อความ)
- [ ] AC8: event ทุกตัวมี field ตาม §6; ซ่อนแท็บระหว่างตอบ → `latencyValid: false` และถ้าถูกถือว่าคล่อง
- [ ] AC9: หน้าผลแสดงครบ 8 ส่วนตามลำดับ LS §9 และขั้นที่แนะนำตรงกับกฎ §5.6; หลัง reload ผลยังอยู่
- [ ] AC10: พ่อกดค้างโลโก้ → ยืนยันหยุด → หน้าผลแบบหยุดกลางทาง ประเมินจากด่านที่ครบตาม LS §7
- [ ] AC11: ไฟล์ export มี `session.started` (`activityVersion: 'DX-ADD v2'`), `item.answered` ครบทุกข้อที่ตอบ และ `session.completed` ของ session นั้น
- [ ] AC12: ประวัติแสดงทุกครั้งที่เคยทำ เปิดดูย้อนหลังได้ รวมถึง session `open`
- [ ] AC13: ทุกหน้าใช้ได้ที่ 360px ไม่มี scroll แนวนอนของหน้า ปุ่ม ≥ 48px, dark mode อ่านได้ (e2e + ตรวจด้วยตา)
- [ ] AC14: e2e ผ่านทั้ง 4 project, `npm test` และ `npm run lint` ผ่าน, ไม่มี error ใน console

## 8. เทสต์ที่ต้องมี

### 8.1 เนื้อหา
**`src/content/content.test.ts`** (ทั่วไป วนทุก diagnostic ใน registry)
- `solve(problem) === expected` ทุกข้อ, id ข้อไม่ซ้ำ
- `wrongAnswers`: `response` ไม่ซ้ำกันในข้อ, **ไม่เท่ากับเฉลย**, ≥ 0; รหัสทุกตัว (ทั้ง `misconceptionId` และค่าใน `byStrategy`) มีใน `dx.misconceptions`; key ของ `byStrategy` อยู่ในชุดวิธีคิดของข้อ และข้อที่มี `byStrategy` ต้องมี `strategySetId`
- `strategySetId` มีจริง, `skillId` มีใน `skills.ts`, `ladderSteps` อยู่ใน 1–9
- subitize: `count` 0–10 และข้อมี `visual` แบบ ten-frame
- `recommendation`: `no` เรียง 1..n, กฎสุดท้ายเป็น `always`, id ของด่าน/กลุ่ม/ข้อ/วิธีคิดที่อ้างถึงมีจริง; `groups[].itemIds` อยู่ในด่านนั้น
- ตัวอย่างวิธีคิด: `sums-equal` ทุกกลุ่มผลรวมเท่ากัน, `formatExample(check) === example.text`, และคู่ตัวตั้งกลุ่มแรกไม่ตรงกับโจทย์ `arith` ใดๆ ที่ใช้ชุดนั้น (ไม่ใบ้)
- `numberTalks` มีครบขั้น 1–9, `texts.stageComplete` มี `{n}` และ `{m}`

**`src/content/diagnostics/DX-ADD.test.ts`** (เฉพาะ DX-ADD) ตารางคาดหวัง**พิมพ์ใหม่จาก Lesson Spec โดยตรง** ห้าม import มาจากไฟล์เนื้อหา
- 20 ข้อ: id, โจทย์, เฉลย, `fluentMs` (ไม่มี / 3000 / 4000 / 5000 / 15000), ถามวิธีคิดหรือไม่ และชุดไหน, `ladderSteps`
- ทุกคู่ (ข้อ, คำตอบผิดที่ LS ระบุ, วิธีคิด ∈ ชุดของข้อ ∪ {ไม่ได้ถาม}) → `classify` ได้รหัสตาม LS เช่น
  ```ts
  ['3.3', 12, 'doubles', 'M8'], ['3.3', 12, 'make-ten', 'M5'], ['3.3', 12, undefined, 'M5'],
  ['4.2', 16, 'make-ten', 'M7'], ['4.2', 16, 'count-on', 'M5'], ['4.4', 14, 'make-ten', 'M7'],
  ['5.4', 74, 'round', 'M12'], ['5.4', 76, 'column', 'M5'], ['4.1', 15, 'doubles', 'M7'],
  ```
  (ต้องครบทุกคู่ ไม่ใช่แค่ตัวอย่างนี้)
- คำตอบที่ไม่อยู่ในตาราง (เช่น 99) → `MX`; คำตอบถูก → ไม่มีรหัส ทุกวิธีคิด
- ด่าน 1: `readyMs 900`, `flashMs 1500`, `colorMode 'single'`; `skipIf` ของ s5 = `{ stageId: 's4', correctAtMost: 1 }`; `version === 'DX-ADD v2'`

### 8.2 Engine (unit)
- `problem.test.ts`: `solve` ทุก kind/op, ÷ ไม่ลงตัว throw, `formatProblem`, `formatExample`
- `timing.test.ts`: clock ปลอม — วัดเวลา, `invalidate`, start ซ้ำ
- `evaluate.test.ts`: `isFluent` ทุกกรณี (รวม invalid + ถูก = คล่อง, ≤ เกณฑ์พอดี = คล่อง); ระดับด่าน 1–4 ตาม LS §6 ทีละเงื่อนไข (เช่น ด่าน 2 ถูก 4 คล่อง 2 → mid; ด่าน 3 เลือก count-on ที่ 3.3 → mid; ด่าน 4 นับ 2 ข้อ → mid, นับ 1 ข้อ → good; `unsure` ไม่นับเป็นการนับ); 5A/5B/5C pass/fail/skipped/not-evaluated
- `recommend.test.ts`: อย่างน้อย 1 กรณีต่อแถวของ LS §7
  1. ด่าน 1 mid → 1 · 2. ด่าน 2 คล่อง 2 ข้อ → 2 · 3. ข้อ 3.4 เลือก count-fingers → 3 · 4. ด่าน 4 นับ 2 ข้อ → 4 · 5a. 5.1 ถูกแต่ช้ากว่า 5000ms → 5 · 5b. ด่าน 5 skipped (สร้าง summary ตรงๆ) → 5 · 6. 5.3 เลือก count-by-one → 6 · 7. 5.4 ผิด → 7 · 8. 5.4 ผ่าน เลือก column → 8 · 8b. เลือก unsure → 8 · 9. 5.4 เลือก round → 9
  - หยุดกลางทาง: หยุดในด่าน 1 → incomplete; ด่าน 1 mid แล้วหยุดในด่าน 2 → 1; ด่าน 1–2 good หยุดในด่าน 3 → incomplete; ด่าน 1–4 good ด่าน 5 ตอบ 2 ข้อ → incomplete; ด่าน 1 good ด่าน 2 low หยุดในด่าน 4 → 2
- `machine.test.ts`: ลำดับ phase ครบ 20 ข้อ; effect `emit` ครบและตรงชนิด; ข้อที่ถามวิธีคิด emit หลัง STRATEGY_PICK เท่านั้น; ข้อแฟลชได้ `schedule(900, READY_DONE)`; action ผิด phase ไม่มีผล (เช่น SUBMIT ตอน ready/show, STRATEGY_PICK id นอกชุด); **กฎข้าม** (ด่าน 4 ถูก 0, 1 → ข้าม; 2 → ไม่ข้าม, ค่า `completed` ถูก); ข้อความ ack หมุนตามลำดับโดยไม่ขึ้นกับถูก/ผิด; STOP ก่อนเริ่มไม่มี event, STOP ระหว่าง strategy ทิ้ง pending และ emit abandoned
- `sessions.test.ts`: จัดกลุ่ม, status complete/abandoned/open, เรียงใหม่→เก่า

### 8.3 Component (Vitest + Testing Library, fake timers)
- `TenFrame.test.tsx`: จำนวนจุด = `filled`, ลำดับการเติม, `single` ทุกจุดสีเดียว, `split-5` แบ่งสี, `hidden` ไม่มีจุด, flash ปกติ (ซ่อนที่ 1500, `onFlashEnd` ที่ 1650 ครั้งเดียว), reduced motion (ทั้งคู่ที่ 1500), unmount ก่อนหมดเวลาไม่เรียก `onFlashEnd`, label ไม่มีจำนวน
- `Keypad.test.tsx`: พิมพ์/ลบ/จำกัด 3 หลัก/0 นำหน้า/ปุ่มตอบ disabled เมื่อว่าง/คีย์บอร์ดจริง
- `DiagnosticPlayer.test.tsx` (MemoryStore + fake timers): ข้อ 1.1 แสดง "พร้อมนะ..." ถึง 899ms, "ดู!" ที่ 900ms, "ซ่อนแล้ว! กี่จุดนะ?" ที่ 900+1500+150 (และ 900+1500 เมื่อ reduced motion) และแป้น disabled ก่อนหน้านั้น; ack หายหลัง 1000ms; เปลี่ยน `visibilityState` เป็น hidden ระหว่างตอบ → event มี `latencyValid: false`
- `DiagnosticResults.test.tsx`: render จาก event ชุดตัวอย่าง (ครบ / หยุดกลางทาง / open) ตรวจ 8 ส่วน, ซ่อนบันไดและ Number Talks เมื่อ incomplete, footnote เวลา

### 8.4 E2E (`tests/e2e/dx-add.spec.ts`)
helper: สร้างผู้เรียนผ่าน UI, `answer(page, digits)` แตะแป้นแล้วกด "ตอบ", `pick(page, label)`

1. **ทำครบ (ทุก project)**: ตั้ง viewport กว้าง 360 (สูงตาม project) ตอบถูกทุกข้อ ชุด A เลือก "จำได้เลย", 5.3 "ตั้งบวกในใจ", 5.4 "ปัดเลขให้กลม"
   - ทุกหน้าของลูกหลังหน้า kid-intro (ข้อ, ack, เปิดด่าน, หน้าจบ): `innerText` ไม่ match `/ถูก|ผิด|คะแนน|เฉลย|วินาที|นาที|\d+:\d{2}/` (หน้าวิธีคิดยกเว้นคำว่า "ถูก" เพราะมี "บอกไม่ถูก") และไม่มี `[role=timer]`, `[role=progressbar]`, `progress`, `time`
   - หน้าข้อและหน้าวิธีคิด: `scrollWidth <= innerWidth`
   - ไปหน้าผล → "แนะนำให้เริ่มที่ ขั้นที่ 9:" → reload → ยังแสดง และตารางรายข้อ 20 แถว
   - export → JSON มี `session.started` (`activityVersion: 'DX-ADD v2'`), `item.answered` 20 ตัว, `session.completed` ที่ `sessionId` เดียวกัน
2. **ไม่บอกผล + กฎข้าม (desktop)**: รอบ A ตอบถูกทุกข้อด่าน 1–4, รอบ B ตอบ `99` ทุกข้อ (ถามวิธีคิดเลือก "นับนิ้ว") เก็บข้อความ ack 16 ข้อแรกของทั้งสองรอบ → เท่ากัน; รอบ B หลังด่าน 4 ไปหน้าจบทันที ไม่เห็น "ผ่านด่าน 4" และหน้าผลแสดงด่าน 5 "ข้าม" และแนะนำขั้นที่ 1
3. **หยุดกลางทาง (desktop)**: ด่าน 1 ถูกทุกข้อ ตอบด่าน 2 หนึ่งข้อ → กดค้างโลโก้ 2.1 วินาที → "หยุดและดูผล" → หน้าผลแสดง "ยังทำไม่ครบ ควรทำต่อให้จบก่อน" และประวัติมี session นี้
4. **dark mode (phone)**: `emulateMedia({ colorScheme: 'dark' })` ผ่านด่าน 1 ข้อแรกและเปิดหน้าผล ไม่มี error และพื้นหลังเป็นสี dark

## 9. สิ่งที่ Developer ต้องไม่ทำ

- **ห้ามแสดงถูก/ผิด คะแนน เฉลย หรือเวลาใดๆ ในหน้าของลูก** รวมถึงสี เสียง ไอคอน การสั่น หรือ animation ที่ต่างกันตามถูก/ผิด
- ห้ามแสดงนาฬิกา ตัวนับถอยหลัง แถบความคืบหน้า หรือ "ข้อ x/20" (LS ไม่ได้กำหนด)
- ห้ามมีปุ่มดูภาพซ้ำ ย้อนกลับ หรือแก้คำตอบหลังกด "ตอบ"
- ห้ามเปลี่ยนเวลาแฟลชตาม reduced motion หรืออุปกรณ์ และห้ามใช้ 2 สีใน ten-frame ของแบบทดสอบนี้
- ห้ามแก้ข้อความ โจทย์ เฉลย เกณฑ์ หรือรหัสความเข้าใจผิดเอง ถ้าเห็นว่าผิดให้แจ้ง (Developer → Architect → Designer)
- ห้ามฝังข้อความไทยของบทเรียนใน component (อยู่ใน `DX-ADD.ts`)
- ห้ามคำนวณเฉลยจากค่าที่พิมพ์ไว้แทน `solve(problem)` ในตอนใช้งานจริง
- ห้ามใช้ภาพการ์ตูน มาสคอต หรืออีโมจิแบบเด็กเล็ก (LS §8)
- ห้ามเขียน store ตรงจากหน้าจอ ต้องผ่าน outbox

## 10. แผนงานย่อย

| ลำดับ | งาน | ขนาด |
|---|---|---|
| 1 | ปรับ `engine/types.ts` (§4.1, §6) + `isAppEvent` + `problem.ts` + เทสต์ | S |
| 2 | `ladders.ts`, `skills.ts`, `misconceptions.ts`, `strategies.ts` | S |
| 3 | `DX-ADD.ts` + `registry.ts` + `content.test.ts` + `DX-ADD.test.ts` | M |
| 4 | `classify`, `evaluate`, `recommend`, `summary`, `sessions` + เทสต์ | M |
| 5 | `machine.ts` + เทสต์ (รวมกฎข้ามและ STOP) | M |
| 6 | `TenFrame` + `useReducedMotion` + เทสต์ + หน้า dev | M |
| 7 | `Keypad`, `AnswerDisplay`, `OptionGrid`, `ConfirmDialog` + เทสต์ | M |
| 8 | `timing.ts`, `useSilentTimer`, `useDiagnosticRunner` + เทสต์ fake timers | M |
| 9 | `DiagnosticPlayer` + หน้าจอของลูก + หยุดกลางทาง + การ์ดหน้าหลัก + route | L |
| 10 | หน้าผล 8 ส่วน + `HistoryList` + ส่วนผลในหน้าพ่อ + เทสต์ | L |
| 11 | e2e `dx-add.spec.ts` 4 project | M |
| 12 | ทดสอบบนแท็บเล็ตจริง + รายงานส่งงาน | S |

## 11. คำถามที่ยังเปิดอยู่

ใช้ข้อเสนอไปก่อนได้ ถ้า Designer/พ่อตอบต่างจากนี้ แก้ที่ `DX-ADD.ts` หรือจุดเดียวที่ระบุ

| # | ถึง | คำถาม | ข้อเสนอ |
|---|---|---|---|
| D1 | Designer | ข้อความ ack แสดงนานเท่าไร (LS บอกแค่ "สั้นๆ") | 1.0 วินาที (`timing.ackMs`) |
| D2 | Designer | ข้อความ "ผ่านด่าน {n} แล้ว!…" แสดงที่ไหน | บนหน้าเปิดด่านถัดไป ใช้ปุ่ม "ไปเลย" ปุ่มเดียว |
| D3 | Designer | ตัวเลือกวิธีคิด แตะแล้วไปต่อทันทีหรือต้องกดยืนยัน และมี ack อีกไหม | แตะแล้วไปข้อถัดไปทันที ไม่มี ack ซ้ำ |
| D4 | Designer/พ่อ | พ่อหยุดกลางทางอย่างไร (LS มีกติกาแต่ไม่มีวิธี) | กดค้างโลโก้ 2 วิ → กล่องยืนยัน ข้อความตาม §5.3 |
| D5 | Designer | ข้อที่ตอบแล้วแต่ยังไม่เลือกวิธีคิดตอนหยุด | ไม่บันทึก (ข้อนับว่าเสร็จเมื่อได้วิธีคิดแล้ว) |
| D6 | Designer | หยุดระหว่างด่าน 5 แต่ 5.1–5.2 ครบแล้ว ประเมิน 5A ไหม | ไม่ ประเมินเฉพาะด่านที่ทำครบตามตัวอักษร LS §7 |
| D7 | Designer | กรณี "ยังทำไม่ครบ" แสดงบันไดและ Number Talks ไหม | ซ่อนทั้งสองส่วน |
| D8 | Designer | ซ่อนแท็บระหว่างแฟลช (ลูกอาจไม่เห็นภาพ) | ไม่มีผลต่อการประเมิน ไม่แฟลชซ้ำ บันทึก `flashInterrupted` ไว้ดู |
| D9 | Designer | ก่อนแฟลชและหลังซ่อน แสดงอะไรแทนภาพ | การ์ดเปล่าขนาดเท่าเดิม ไม่มีเส้นช่อง (กันการนับช่องว่าง) |
| D10 | Designer | ปุ่มลบตัวเลขบนแป้น | ไอคอน ⌫ ไม่ใช้คำว่า "ลบ" |
| D11 | Designer | เงื่อนไขวิธีคิดใช้เฉพาะคำตอบที่ LS เขียน "ถ้าเลือก…" ใช่ไหม (เช่น 4.1 ตอบ 15 แต่เลือก "ใช้เลขคู่" ยังเป็น M7) | ใช่ ตามตารางตามตัวอักษร |
| D12 | Designer | เวลาเฉลี่ยรายด่านรวมข้อที่ตอบผิดไหม | รวม (ไม่รวมข้อที่เวลาใช้ไม่ได้) |
| D13 | Designer | ข้อความหน้าพ่อที่ LS ไม่ได้กำหนด: "ผ่าน/ยังไม่ผ่าน", "ทำไม่ครบ", "ยังไม่ได้ทำ", "หยุดกลางทาง", footnote เวลา, "พบในข้อ", `ถูก`/`ผิด · เฉลย {n}`, `ใช่/ไม่/—` | ใช้ตาม §5.7 |
| D14 | Designer | ชื่อขั้นบนบันไดและ skillId | ชื่อจาก plan §5, skillId ตาม §4.2 (จะทบทวนเมื่อทำ ADR-0006) |
| D15 | Designer | fade 150ms ตอนแสดง/ซ่อนภาพ (โหมดปกติ) ทำให้ภาพค่อยๆ หายหลัง 1.5 วิ | ยอมรับได้ ภาพอยู่บนจอ 1.5 วิ (รวม fade-in) แล้วค่อยๆ หายใน 150ms; reduced motion แสดง/ซ่อนทันที 1.5 วิพอดี |

## 12. ประวัติการแก้ไข

| วันที่ | การเปลี่ยนแปลง | เหตุผล |
|---|---|---|
| 2026-09-29 | สร้างเอกสาร | เริ่ม M1 |
