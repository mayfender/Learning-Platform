// Helper ของ acceptance test ADD-04 (Tester)
// โจทย์ เฉลย ข้อความ และรหัสความเข้าใจผิดทั้งหมดในไฟล์นี้พิมพ์จาก Lesson Spec ADD-04 (§2–§5, §9–§11) ด้วยตนเอง
// ไม่ได้ import จาก src/ และไม่ได้อ่านโค้ดของแอป จุดทดสอบที่ใช้มีเฉพาะที่ Tech Spec กำหนด:
// `[data-dot]`, `[data-cell-index]`, `[data-cell-state]`, `data-testid="ten-frame"`/`data-visible`,
// aria-label ของ NumberBond และช่อง (Tech Spec §3.1, §3.2)
import { expect, type Page } from '@playwright/test';
import {
  GUARD_MS,
  guardWait,
  installClock,
  keyButton,
  mainText,
  openApp,
  pauseClock,
  readDb,
  readDbWhen,
  setVisibility,
  submitAnswer,
  tick,
  typeAnswer,
  type DbDump,
  type Ev,
} from './dx';

export { GUARD_MS, guardWait, keyButton, mainText, readDb, readDbWhen, submitAnswer, typeAnswer };
export type { DbDump, Ev };

// ---------------------------------------------------------------- เวลา (นาฬิกาปลอม หรือเวลาจริง)

const fakePages = new WeakSet<Page>();

/** เดินเวลา: นาฬิกาปลอมที่หยุดอยู่ใช้ tick, เวลาจริงใช้รอ */
export async function adv(page: Page, ms: number): Promise<void> {
  if (fakePages.has(page)) await tick(page, ms);
  else await page.waitForTimeout(ms + 20);
}

/** รอให้พ้น tap guard 400 ms (dx.guardWait รู้เองว่าปลอมหรือจริง) */
export async function guard(page: Page): Promise<void> {
  await guardWait(page);
}

// ---------------------------------------------------------------- ข้อความ (LS)

/** ตัดช่องว่าง เส้นประ และเครื่องหมายคำพูดออกก่อนเทียบ (แอปอาจแยกหัวข้อกับเนื้อความคนละบรรทัด) */
const STRIP_CODES = [0x200b, 0x2014, 0x2013, 0x201c, 0x201d, 0x2018, 0x2019, 0x22, 0x27, 0x60];
const STRIP = new RegExp(`[\\s${STRIP_CODES.map((c) => String.fromCharCode(c)).join('')}]+`, 'g');
export const norm = (s: string): string => s.replace(STRIP, '');

export const TITLE = 'ช่องว่างและเติมให้เต็มสิบ';

/** LS §11 ประโยคเปิดแต่ละส่วน */
export const INTRO = {
  check:
    'เช็คก่อน — ขอดูหน่อยว่าอะไรที่หนูทำได้แล้วบ้าง จะได้ข้ามส่วนที่รู้แล้ว ตอบเท่าที่คิดได้เลย',
  A: 'ส่วน A: ช่องว่างคือคำตอบ — ในกล่อง 10 ช่อง ช่องที่ยังว่างบอกคำตอบได้ ลองดูสิ',
} as const;

export const MSG = {
  ready: 'พร้อมนะ...',
  show: 'ดู!',
  hiddenGap: 'ซ่อนแล้ว! ว่างกี่ช่องนะ?',
  askFill: 'เติมอีกกี่ช่องถึงจะเต็ม',
  /** LS §4 A1 ตอบผิด L1 */
  L1: 'นั่นคือจุดที่มีอยู่ ลองดูช่องที่ยังว่าง',
  /** LS §4 A1 ตอบผิด M5 */
  M5A: 'ลองดูทีละแถว แถวบนเต็ม 5 แล้ว แถวล่างมีอีกกี่ช่อง',
  /** Tech Spec §4.7 P4 */
  M4A: 'หาช่องที่ยังว่าง ไม่ใช่เอาตัวเลขมารวมกัน ลองดูช่องว่างในกล่อง',
  /** Tech Spec §4.7 P5 (A) */
  MXA: 'ลองดูช่องที่ยังว่างในกล่อง',
  /** Tech Spec §4.7 P7 */
  reveal: 'มาดูด้วยกันนะ',
  /** LS §4 A3 ข้อความเมื่อเลือก "นับนิ้ว" */
  fingers: 'ไม่มีผิดเลย นิ้วช่วยได้ ลองดูว่าเห็นกล่องแล้วเร็วกว่าไหม',
  /** LS §4 ข้อสรุปกฎ A */
  ruleA: 'ช่องที่เต็ม + ช่องที่ว่าง = 10 เสมอ ดูช่องว่างก็รู้คำตอบ',
  mindQuestion: 'ในหัวเห็นอะไร',
  /** Tech Spec §4.7 P8 */
  handover: 'วันนี้พอแค่นี้ ส่งเครื่องให้พ่อได้เลย',
  parentNote: 'บันทึกสำหรับพ่อ',
} as const;

export const okA = (x: number, n: number): string => `ใช่ ช่องว่าง ${x} ช่อง ${n} กับ ${x} ได้ 10`;
export const imagine = (n: number): string => `ลองนึกกล่อง 10 ช่องที่มี ${n} จุด`;

/** ข้อความ feedback ของ A ที่ผูกกับรหัส (LS §4 A1 + Tech §4.7 P4, P5) */
export function gapMessage(code: string): string {
  switch (code) {
    case 'L1':
      return MSG.L1;
    case 'M5':
      return MSG.M5A;
    case 'M4':
      return MSG.M4A;
    default:
      return MSG.MXA;
  }
}

/** ตัวเลือก "ในหัวเห็นอะไร" (LS §4 A3) ตามลำดับ */
export type MindId = 'see-box' | 'see-number' | 'count-fingers' | 'count-in-head' | 'unsure';
export const MIND_ORDER: MindId[] = [
  'see-box',
  'see-number',
  'count-fingers',
  'count-in-head',
  'unsure',
];
export const MIND_LABEL: Record<MindId, string> = {
  'see-box': 'เห็นกล่อง 10 ช่อง',
  'see-number': 'นึกเป็นตัวเลข',
  'count-fingers': 'นับนิ้ว',
  'count-in-head': 'นับในใจ',
  unsure: 'บอกไม่ถูก',
};

// ---------------------------------------------------------------- โจทย์ (LS §3, §4) คิดเฉลยเอง

export interface GapItem {
  id: string;
  /** จำนวนจุดในกล่อง (ตัวเลขที่เห็นในโจทย์) */
  n: number;
  /** เฉลย = 10 − n */
  e: number;
  missing: 'first' | 'second';
  /** ข้อความโจทย์ตัวเลข (เฉพาะ A3) */
  text?: string;
}
export interface SumItem {
  id: string;
  a: number;
  b: number;
  /** เฉลย */
  s: number;
}

export const CHECK_GAP: GapItem[] = [
  { id: 'c1', n: 7, e: 3, missing: 'second' },
  { id: 'c2', n: 9, e: 1, missing: 'second' },
  { id: 'c3', n: 4, e: 6, missing: 'second' },
];
export const CHECK_SUM: SumItem[] = [
  { id: 'c4', a: 8, b: 5, s: 13 },
  { id: 'c5', a: 9, b: 7, s: 16 },
  { id: 'c6', a: 4, b: 7, s: 11 },
];
export const A1_ITEMS: GapItem[] = [
  { id: 'A1.1', n: 8, e: 2, missing: 'second' },
  { id: 'A1.2', n: 6, e: 4, missing: 'second' },
  { id: 'A1.3', n: 3, e: 7, missing: 'second' },
];
/** LS §4 A2: 6, 2, 8, 3, 1, 7 เฉลย 4, 8, 2, 7, 9, 3 (แก้ 2026-09-30 ไม่ซ้ำ c1–c3) */
export const A2_ITEMS: GapItem[] = [6, 2, 8, 3, 1, 7].map((n, i) => ({
  id: `A2.${i + 1}`,
  n,
  e: 10 - n,
  missing: 'second' as const,
}));
export const A2_EXPECTED = [4, 8, 2, 7, 9, 3];
export const A3_ITEMS: GapItem[] = [
  { id: 'A3.1', n: 7, e: 3, missing: 'second', text: '7 + ? = 10' },
  { id: 'A3.2', n: 4, e: 6, missing: 'first', text: '? + 4 = 10' },
  { id: 'A3.3', n: 8, e: 2, missing: 'second', text: '8 + ? = 10' },
  { id: 'A3.4', n: 3, e: 7, missing: 'first', text: '? + 3 = 10' },
  { id: 'A3.5', n: 6, e: 4, missing: 'second', text: '6 + ? = 10' },
  { id: 'A3.6', n: 9, e: 1, missing: 'first', text: '? + 9 = 10' },
];
export const A3_EXPECTED = [3, 6, 2, 7, 4, 1];

/** โจทย์ผลรวมบนจอ: `8 + 5 = ?` (formatProblem ของ arith เหมือน DX-ADD) */
export const sumRegex = (a: number, b: number): RegExp =>
  new RegExp(`^${a}\\s*\\+\\s*${b}\\s*=\\s*\\?$`);

// ---------------------------------------------------------------- รหัสความเข้าใจผิด (LS §2 คิดเอง)

/** ช่องว่างของกล่อง: n = ตัวเลขที่เห็น */
export function gapCode(n: number, r: number): string {
  const e = 10 - n;
  if (r === e) return '';
  if (r === n) return 'L1';
  if (r === 10 + n) return 'M4';
  if (Math.abs(r - e) === 1) return 'M5';
  return 'MX';
}
/** ผลรวมของบวกข้ามสิบ (กรณีชน M5/M7: M7 เฉพาะเมื่อบอกว่าเห็นกล่อง ไม่งั้น M5 ตาม Q1 ของ Designer) */
export function sumCode(a: number, b: number, r: number, mind?: MindId): string {
  const s = a + b;
  if (r === s) return '';
  if (r === s - 10) return 'M6';
  const m5 = r === s - 1 || r === s + 1;
  const m7 = r === 10 + a || r === 10 + b;
  if (m5 && m7) return mind === 'see-box' ? 'M7' : 'M5';
  if (m5) return 'M5';
  if (m7) return 'M7';
  return 'MX';
}

// ---------------------------------------------------------------- คำพูดของพ่อ (LS §4, §5, §7)

export const MATERIALS = [
  'ถาดไข่ 10 ช่อง (ตัดจากถาด 12 หรือวาดตาราง 2×5)',
  'เหรียญหรือเลโก้ 15 ชิ้น แบ่ง 2 สี',
];
export const NUMBER_TALKS = {
  problems: ['8 + 5', '9 + 6', '7 + 4'],
  openQuestions: ['หนูคิดยังไง', 'ในหัวเห็นอะไร', 'มีวิธีอื่นไหม', 'นิ้วช่วยตอนไหน'],
  curious: 'ถามด้วยความอยากรู้ ไม่ใช่จับผิด',
  heard: [
    '8 ขาด 2 เอา 2 จาก 5 เหลือ 3 เป็น 13',
    'วาด number bond 5 → 2 + 3 และกล่อง 10 ช่องให้ดู',
    'นับต่อจาก 8: 9, 10, 11, 12, 13',
    'ไม่ต้องห้าม ถามว่า "ตอนไหนที่หนูหยุดที่ 10" แล้วชี้ว่าตรงนั้นคือกล่องเต็ม',
    'ใช้นิ้วแล้วแยก 5 เป็น 2 กับ 3',
    'วิธีนี้เป็น make-ten ที่ใช้นิ้วช่วย ให้ชม',
    'จำได้เลย',
    'ถามว่า "ถ้าเป็น 8 + 7 ล่ะ"',
  ],
  dontSay: [
    'ง่ายนิดเดียว',
    'เก่งมาก',
    'ชมที่วิธีคิด เช่น "เอาจากกองมาเติมกล่องให้เต็มก่อน ฉลาดดี"',
    'ห้ามนับนิ้ว',
    'เร็วๆ หน่อย',
  ],
} as const;
/** LS §7 คำถามต่อยอด (อยู่ในหน้าพ่อ ไม่อยู่ในจอลูก) */
export const CHALLENGE_EXTENSION = ['ถ้ามีการ์ด 1–10 ล่ะ', 'เหลือ 5 และ 10', '10 ต้องคู่กับ 0'];

// ---------------------------------------------------------------- การอ่านหน้าจอ

export async function pageNorm(page: Page): Promise<string> {
  return norm(await mainText(page));
}

/** รอจนหน้ามีข้อความนี้ (เทียบแบบ norm) */
export async function expectPageHas(page: Page, text: string, ctx = ''): Promise<void> {
  await expect
    .poll(async () => (await pageNorm(page)).includes(norm(text)), {
      message: `${ctx} ต้องมีข้อความ "${text}"`,
      timeout: 8000,
    })
    .toBe(true);
}
export async function pageHas(page: Page, text: string): Promise<boolean> {
  return (await pageNorm(page)).includes(norm(text));
}

/** จำนวนจุดที่มองเห็นจริง: `[data-dot]` ที่ไม่ถูกซ่อน และการ์ด/ภาพไม่โปร่งใส (opacity > 0.5) */
export async function dotCount(page: Page, inViewport = false): Promise<number> {
  return page.evaluate((inView) => {
    let n = 0;
    for (const el of Array.from(document.querySelectorAll('main [data-dot]'))) {
      let opacity = 1;
      let hidden = false;
      for (let p: Element | null = el; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        opacity *= parseFloat(cs.opacity);
        if (cs.display === 'none' || cs.visibility === 'hidden') hidden = true;
      }
      if (hidden || opacity <= 0.5) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (inView && (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)) {
        continue;
      }
      n++;
    }
    return n;
  }, inViewport);
}

export interface CellInfo {
  index: number;
  state: string;
  w: number;
  h: number;
  role: string | null;
  label: string | null;
}
/** ช่องของกล่อง 10 ช่อง (`data-cell-index` / `data-cell-state`) เรียงตาม index */
export async function cells(page: Page): Promise<CellInfo[]> {
  return page.evaluate((): CellInfo[] => {
    const map = new Map<number, CellInfo>();
    for (const el of Array.from(document.querySelectorAll('main [data-cell-index]'))) {
      const index = Number(el.getAttribute('data-cell-index'));
      if (map.has(index)) continue;
      const r = el.getBoundingClientRect();
      map.set(index, {
        index,
        state: el.getAttribute('data-cell-state') ?? '',
        w: r.width,
        h: r.height,
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label'),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.index - b.index);
  });
}
export async function cellStates(page: Page): Promise<string[]> {
  return (await cells(page)).map((c) => c.state);
}
/** สถานะที่คาด: n ช่องแรก dot, ช่องใน `added` เป็น added, ที่เหลือ empty */
export function expectedStates(n: number, added: number[] = []): string[] {
  return Array.from({ length: 10 }, (_, i) =>
    i < n ? 'dot' : added.includes(i) ? 'added' : 'empty',
  );
}
export async function tapCell(page: Page, index: number, touch = false): Promise<void> {
  const loc = page.locator(`main [data-cell-index="${index}"]`).first();
  if (touch) await loc.tap();
  else await loc.click();
}

/**
 * ช่องที่มีวงแหวนไฮไลต์ (Tech Spec §3.1: `<rect rx>` เส้นหนา 3, ไม่มีสีเติม, ไม่ใช่ `circle`)
 * ตรวจแบบเรขาคณิต: หา rect ที่มีเส้นขอบหนา ≥ 3 และไม่มีสีเติม แล้วจับคู่กับช่องที่มันทับอยู่
 * (spec ไม่ได้กำหนด attribute ของวงแหวน ดู Test Plan คำถาม Q-T1)
 */
export async function ringedCells(page: Page): Promise<number[]> {
  return page.evaluate((): number[] => {
    const cellEls = new Map<number, Element>();
    for (const el of Array.from(document.querySelectorAll('main [data-cell-index]'))) {
      const i = Number(el.getAttribute('data-cell-index'));
      if (!cellEls.has(i)) cellEls.set(i, el);
    }
    const boxes = Array.from(cellEls.entries()).map(([i, el]) => ({
      i,
      r: el.getBoundingClientRect(),
    }));
    const svgs = new Set<Element>();
    for (const el of cellEls.values()) {
      const s = el.closest('svg');
      if (s) svgs.add(s);
    }
    const rings = new Set<number>();
    for (const svg of svgs) {
      for (const rect of Array.from(svg.querySelectorAll('rect'))) {
        const cs = getComputedStyle(rect);
        const sw = parseFloat(cs.strokeWidth);
        if (cs.stroke === 'none' || !(sw >= 3)) continue;
        const noFill =
          cs.fill === 'none' || cs.fill === 'transparent' || /,\s*0\)$/.test(cs.fill.trim());
        if (!noFill) continue;
        const r = rect.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const hit = boxes.find(
          (b) => cx >= b.r.left && cx <= b.r.right && cy >= b.r.top && cy <= b.r.bottom,
        );
        if (hit) rings.add(hit.i);
      }
    }
    return Array.from(rings).sort((a, b) => a - b);
  });
}
export const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

export interface DotStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
}
/** สี/เส้นขอบของจุดในแต่ละช่อง (null = ช่องไม่มีจุด) */
export async function dotStyles(page: Page): Promise<Array<DotStyle | null>> {
  return page.evaluate((): Array<DotStyle | null> => {
    const cellEls = new Map<number, Element>();
    for (const el of Array.from(document.querySelectorAll('main [data-cell-index]'))) {
      const i = Number(el.getAttribute('data-cell-index'));
      if (!cellEls.has(i)) cellEls.set(i, el);
    }
    const dots = Array.from(document.querySelectorAll('main [data-dot]'));
    return Array.from({ length: 10 }, (_, i): DotStyle | null => {
      const cell = cellEls.get(i);
      if (!cell) return null;
      const r = cell.getBoundingClientRect();
      const d = dots.find((el) => {
        const b = el.getBoundingClientRect();
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      });
      if (!d) return null;
      const cs = getComputedStyle(d);
      return { fill: cs.fill, stroke: cs.stroke, strokeWidth: parseFloat(cs.strokeWidth) };
    });
  });
}

/** จำนวนจุดแถวบน/แถวล่างที่เห็น (แถวบนเต็ม 5 ก่อน แล้วจึงแถวล่าง ตาม LS §4 ด่าน 1) */
export async function dotLayout(page: Page): Promise<{ top: number; bottom: number }> {
  return page.evaluate(() => {
    const ys = Array.from(document.querySelectorAll('main [data-dot]')).map((el) => {
      const r = el.getBoundingClientRect();
      return r.y + r.height / 2;
    });
    if (ys.length === 0) return { top: 0, bottom: 0 };
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxY - minY <= 5) return { top: ys.length, bottom: 0 };
    const mid = (minY + maxY) / 2;
    const top = ys.filter((y) => y <= mid).length;
    return { top, bottom: ys.length - top };
  });
}

export interface BondState {
  whole: string | null;
  a: string | null;
  b: string | null;
}
/** NumberBond อ่านจาก aria-label: `แยกเลข ทั้งหมด {whole} ส่วนที่หนึ่ง {a} ส่วนที่สอง {b}` (Tech §3.2) */
export async function bondState(page: Page): Promise<BondState | null> {
  const label = await page
    .locator('main [aria-label^="แยกเลข"]')
    .first()
    .getAttribute('aria-label', { timeout: 3000 })
    .catch(() => null);
  if (label === null) return null;
  const pick = (re: RegExp): string | null => re.exec(label)?.[1] ?? null;
  return {
    whole: pick(/ทั้งหมด\s*(\d+|ยังไม่รู้)/),
    a: pick(/ส่วนที่หนึ่ง\s*(\d+|ยังไม่รู้)/),
    b: pick(/ส่วนที่สอง\s*(\d+|ยังไม่รู้)/),
  };
}

/** จำนวนจุดใน DOM ทั้งหมด (ไม่ดู opacity ใช้ตอนภาพเพิ่งขึ้นแล้วกำลัง fade-in) */
export async function dotCountDom(page: Page): Promise<number> {
  return page.locator('main [data-dot]').count();
}

/** opacity รวมของ ten-frame (คูณขึ้นไปทุกชั้น) */
export async function frameOpacity(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="ten-frame"]');
    if (!el) return 0;
    let o = 1;
    for (let p: Element | null = el; p; p = p.parentElement) {
      o *= parseFloat(getComputedStyle(p).opacity);
    }
    return o;
  });
}

/** ปุ่ม "ตอบ" กดได้หรือไม่ (กดไม่ได้เมื่อยังไม่พิมพ์ตัวเลข) */
export async function submitEnabled(page: Page): Promise<boolean> {
  const b = page.getByRole('button', { name: 'ตอบ', exact: true });
  return (await b.count()) > 0 && (await b.first().isEnabled());
}

/** สถานะแป้น: ปุ่มเลขที่กดได้กี่ปุ่ม */
export async function keysEnabled(page: Page): Promise<number> {
  return page
    .locator('main button:visible')
    .evaluateAll(
      (els) =>
        els.filter(
          (e) => /^\d$/.test((e.textContent ?? '').trim()) && !(e as HTMLButtonElement).disabled,
        ).length,
    );
}

/** พิมพ์ตอบแล้วกด "ตอบ" (แตะแป้น) */
export async function typeSubmit(page: Page, r: number): Promise<void> {
  await typeAnswer(page, String(r), 'tap');
  await submitAnswer(page, 'tap');
}

export async function clickNext(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: 'ต่อไป', exact: true });
  await expect(btn).toBeVisible();
  await guard(page);
  await btn.click();
}
export async function clickGo(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: 'ไปเลย' });
  await expect(btn).toBeVisible();
  await btn.click();
}

// ---------------------------------------------------------------- เริ่มบทเรียน

export interface StartOptions {
  nickname?: string;
  /** ใช้นาฬิกาปลอมที่หยุดอยู่ (ค่าเริ่มต้น true) */
  fake?: boolean;
  /** ข้ามการสร้างผู้เรียน (มีอยู่แล้ว เริ่มจากหน้าหลัก) */
  hasLearner?: boolean;
}

/** คลิกผ่านหน้าเริ่มครั้ง (ป้ายปุ่มไม่ได้กำหนดใน spec: ยอมรับ "ต่อไป: หน้าของลูก" หรือปุ่มที่ขึ้นต้น "เริ่ม") จนถึงหน้า "ไปเลย" */
export async function enterLesson(page: Page): Promise<void> {
  const go = page.getByRole('button', { name: 'ไปเลย' });
  for (let i = 0; i < 4; i++) {
    const starter = page
      .locator('main button:visible')
      .filter({ hasText: /ต่อไป: หน้าของลูก|^\s*เริ่ม/ })
      .first();
    await expect(go.or(starter)).toBeVisible();
    if (await go.isVisible()) return;
    await starter.click();
    await guard(page);
  }
  await expect(go).toBeVisible();
}

/** เปิดแอป (ถ้ายังไม่มีผู้เรียนให้สร้าง) กดการ์ดของบท แล้วเข้าหน้า "ไปเลย" ของส่วนแรก */
export async function startLesson(page: Page, o: StartOptions = {}): Promise<void> {
  const fake = o.fake ?? true;
  if (fake) await installClock(page);
  if (!o.hasLearner) await openApp(page, o.nickname);
  await page.getByRole('link', { name: new RegExp(TITLE) }).click();
  await enterLesson(page);
  if (fake) {
    await pauseClock(page);
    fakePages.add(page);
  }
}

/** เริ่มครั้งถัดไปจากหน้าหลัก (ผู้เรียนมีอยู่แล้ว นาฬิกาปลอมหยุดอยู่แล้ว) */
export async function startNextSitting(page: Page): Promise<void> {
  await page.getByRole('link', { name: new RegExp(TITLE) }).click();
  await enterLesson(page);
}

/** ไปหน้าหลัก/หน้าพ่อโดยไม่โหลดหน้าใหม่ (คงนาฬิกาปลอม) */
export async function gotoHash(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
  await page.waitForTimeout(80);
}

// ---------------------------------------------------------------- เล่นทีละส่วน

export interface Ans {
  /** คำตอบ (ไม่ระบุ = เฉลย) */
  r?: number;
  /** เวลาเงียบ (ms) นับจากข้อนั้นเริ่มแสดง/หลังภาพหาย */
  ms?: number;
  /** "ในหัวเห็นอะไร" (A3, ค่าเริ่มต้น see-box) */
  s?: MindId;
  /** เวลาที่อยู่หน้าเลือก "ในหัวเห็นอะไร" ก่อนแตะ (ต้อง ≥ 450) */
  sm?: number;
  /** สลับแท็บ (ซ่อนแล้วกลับมา) ระหว่างตอบ ทำให้เวลาใช้ไม่ได้ */
  hidden?: boolean;
}
export type Plan = Record<string, Ans>;
export type Obs = (label: string, page: Page) => Promise<void>;

async function note(obs: Obs | undefined, label: string, page: Page): Promise<void> {
  if (obs) await obs(label, page);
}

/** รอภาพแฟลชขึ้นจริง (fade-in เดินตามเวลาจริง 150 ms) แล้วคืนจำนวนจุด */
async function flashUntilHidden(page: Page, obs: Obs | undefined, label: string): Promise<number> {
  await expect(page.getByText(MSG.ready)).toBeVisible();
  await adv(page, 900);
  await expect(page.getByText(MSG.show, { exact: true })).toBeVisible();
  await page.waitForTimeout(250);
  const n = await dotCount(page, true);
  await note(obs, `flash-show-${label}`, page);
  await adv(page, 1650);
  await expect(page.getByText(MSG.hiddenGap)).toBeVisible();
  return n;
}

/** เล่นเช็คก่อน c1–c6 (เริ่มจากหน้า "ไปเลย" ของส่วนเช็คก่อน จบเมื่อ ack ของ c6 หายแล้ว) */
export async function playCheck(
  page: Page,
  plan: Plan = {},
  obs?: Obs,
  opts: { intro?: boolean; from?: number } = {},
): Promise<void> {
  if (opts.intro !== false) {
    await note(obs, 'intro-check', page);
    await clickGo(page);
  }
  const all: Array<{ id: string; gap?: GapItem; sum?: SumItem }> = [
    ...CHECK_GAP.map((g) => ({ id: g.id, gap: g })),
    ...CHECK_SUM.map((s) => ({ id: s.id, sum: s })),
  ];
  for (const it of all.slice(opts.from ?? 0)) {
    const a = plan[it.id] ?? {};
    const r = a.r ?? it.gap?.e ?? it.sum?.s ?? 0;
    if (it.gap) {
      await flashUntilHidden(page, obs, it.id);
    } else if (it.sum) {
      await expect(page.getByText(sumRegex(it.sum.a, it.sum.b))).toBeVisible();
    }
    await note(obs, `item-${it.id}`, page);
    await adv(page, a.ms ?? 1000);
    if (a.hidden) {
      await setVisibility(page, 'hidden');
      await setVisibility(page, 'visible');
    }
    await typeSubmit(page, r);
    await page.waitForTimeout(30);
    await note(obs, `ack-${it.id}`, page);
    await adv(page, 1000);
  }
}

/** อ่านโจทย์ช่องว่างแบบตัวเลขจากจอ (`7 + ? = 10` หรือ `? + 4 = 10`) */
export async function readGapProblem(
  page: Page,
): Promise<{ n: number; e: number; missing: 'first' | 'second'; text: string }> {
  const loc = page.locator('main').getByText(/^(\d+\s*\+\s*\?\s*=\s*10|\?\s*\+\s*\d+\s*=\s*10)$/);
  await expect(loc.first()).toBeVisible();
  const text = ((await loc.first().textContent()) ?? '').trim();
  const m1 = /^(\d+)\s*\+\s*\?/.exec(text);
  const m2 = /^\?\s*\+\s*(\d+)/.exec(text);
  const n = Number(m1?.[1] ?? m2?.[1]);
  return { n, e: 10 - n, missing: m1 ? 'second' : 'first', text };
}

/** A1: ตอบถูกทุกข้อทันที (ไม่แตะช่อง) เริ่มจากหน้าแรกของ A1 */
export async function passA1(page: Page, obs?: Obs, from = 0): Promise<void> {
  for (const it of A1_ITEMS.slice(from)) {
    await expectPageHas(page, MSG.askFill, it.id);
    await guard(page);
    await note(obs, `a1-${it.id}`, page);
    await typeSubmit(page, it.e);
    await expectPageHas(page, okA(it.e, it.n), it.id);
    await note(obs, `a1-ok-${it.id}`, page);
    await clickNext(page);
  }
}

/** A2 6 ข้อ: อ่านจำนวนจุดจากภาพแฟลชเอง ตอบตาม plan (ค่าเริ่มต้น = เฉลย) คืนจำนวนจุดที่เห็นทีละข้อ */
export async function playA2(page: Page, plan: Plan = {}, obs?: Obs): Promise<number[]> {
  const seen: number[] = [];
  for (let k = 1; k <= 6; k++) {
    const id = `A2.${k}`;
    const a = plan[id] ?? {};
    const n = await flashUntilHidden(page, obs, id);
    seen.push(n);
    await note(obs, `item-${id}`, page);
    await adv(page, a.ms ?? 1000);
    if (a.hidden) {
      await setVisibility(page, 'hidden');
      await setVisibility(page, 'visible');
    }
    await typeSubmit(page, a.r ?? 10 - n);
    await expect(page.getByRole('button', { name: 'ต่อไป', exact: true })).toBeVisible();
    await note(obs, `reveal-${id}`, page);
    await clickNext(page);
  }
  return seen;
}

/** A3 6 ข้อ (โจทย์อ่านจากจอ) ตอบตาม plan แล้วผ่านคำถาม "ในหัวเห็นอะไร" และหน้า "ต่อไป" คืนโจทย์ที่เห็นทีละข้อ */
export async function playA3(
  page: Page,
  plan: Plan = {},
  obs?: Obs,
): Promise<Array<{ n: number; missing: 'first' | 'second'; text: string }>> {
  const seen: Array<{ n: number; missing: 'first' | 'second'; text: string }> = [];
  for (let k = 1; k <= 6; k++) {
    const id = `A3.${k}`;
    const a = plan[id] ?? {};
    const p = await readGapProblem(page);
    seen.push({ n: p.n, missing: p.missing, text: p.text });
    await guard(page); // ข้อนี้มาหลังแตะที่เปลี่ยนหน้า (ไปเลย/ต่อไป) จึงต้องรอพ้น 400 ms
    await note(obs, `item-${id}`, page);
    await adv(page, Math.max(0, (a.ms ?? 1000) - GUARD_MS));
    if (a.hidden) {
      await setVisibility(page, 'hidden');
      await setVisibility(page, 'visible');
    }
    await typeSubmit(page, a.r ?? p.e);
    await expectPageHas(page, MSG.mindQuestion, id);
    await note(obs, `mind-${id}`, page);
    await adv(page, a.sm ?? 600);
    await page
      .locator('main button')
      .filter({ hasText: new RegExp(`^${MIND_LABEL[a.s ?? 'see-box']}`) })
      .first()
      .click();
    await expect(page.getByRole('button', { name: 'ต่อไป', exact: true })).toBeVisible();
    await note(obs, `after-mind-${id}`, page);
    await clickNext(page);
  }
  return seen;
}

/** หน้าข้อสรุปกฎ A (หลัง A3) */
export async function passRuleA(page: Page, obs?: Obs): Promise<void> {
  await expectPageHas(page, MSG.ruleA, 'ข้อสรุปกฎ A');
  await note(obs, 'rule-A', page);
  await clickNext(page);
}

/**
 * เดินจากหน้าปัจจุบันไปจนถึงหน้า "บันทึกสำหรับพ่อ" โดยกด "ไปเลย" / "ต่อไป" / ปุ่มส่งเครื่องให้พ่อที่ขึ้นมา
 * (ป้ายปุ่มของหน้าส่งเครื่องไม่ได้กำหนดใน spec) คืนข้อความของทุกหน้าที่ผ่าน
 */
export async function advanceToParentNote(page: Page): Promise<string[]> {
  const texts: string[] = [];
  for (let i = 0; i < 14; i++) {
    if (await pageHas(page, MSG.parentNote)) return texts;
    texts.push(await mainText(page));
    const btns = page.locator('main button:visible');
    const pick = btns
      .filter({ hasText: /^(ไปเลย|ต่อไป|ส่งเครื่อง.*|ให้พ่อ.*|เริ่ม.*|รับทราบ|เรียบร้อย)$/ })
      .first();
    await expect(pick.or(page.getByText(MSG.parentNote))).toBeVisible();
    if (await pageHas(page, MSG.parentNote)) return texts;
    await guard(page);
    await pick.click();
    await page.waitForTimeout(60);
  }
  await expectPageHas(page, MSG.parentNote, 'ไปหน้าบันทึกของพ่อ');
  return texts;
}

export type Level3 = 'ไม่ใช้' | 'บางข้อ' | 'เกือบทุกข้อ';

/** เลือกตัวเลือกของช่อง (ใช้นิ้ว / ขยับปากนับ) ที่ฟอร์มบันทึกของพ่อ */
export async function pickParentOption(
  page: Page,
  group: 'ใช้นิ้ว' | 'ขยับปากนับ',
  option: Level3,
): Promise<void> {
  const rg = page.getByRole('radiogroup', { name: group });
  if ((await rg.count()) > 0) {
    await rg.getByRole('radio', { name: option, exact: true }).click();
    return;
  }
  const grp = page.getByRole('group', { name: group });
  if ((await grp.count()) > 0) {
    await grp.getByText(option, { exact: true }).click();
    return;
  }
  const nearest = page.locator(
    `xpath=//*[normalize-space(text())="${group}"]/ancestor::*[.//*[normalize-space(text())="${option}"]][1]`,
  );
  await nearest.first().getByText(option, { exact: true }).first().click();
}

export type Amount = 'none' | 'some' | 'most';
const AMOUNT_LABEL: Record<Amount, Level3> = {
  none: 'ไม่ใช้',
  some: 'บางข้อ',
  most: 'เกือบทุกข้อ',
};
export interface ParentNote {
  fingers: Amount;
  mouth: Amount;
  note?: string;
}
export async function saveParentNote(page: Page, n: ParentNote): Promise<void> {
  await pickParentOption(page, 'ใช้นิ้ว', AMOUNT_LABEL[n.fingers]);
  await pickParentOption(page, 'ขยับปากนับ', AMOUNT_LABEL[n.mouth]);
  if (n.note !== undefined) {
    await page.getByRole('textbox', { name: /โน้ต/ }).first().fill(n.note);
  }
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
}
export async function skipParentNote(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'ข้าม', exact: true }).click();
}

// ---------------------------------------------------------------- เส้นทางลัดสู่แต่ละส่วน

/** เช็คก่อนแบบ "ไม่ข้าม" (c1–c3 ถูกแต่ช้ากว่า 5 วินาที) จึงได้ A1 และ A2 ครบ */
export const CHECK_NO_SKIP: Plan = {
  c1: { ms: 5500 },
  c2: { ms: 5500 },
  c3: { ms: 5500 },
};
/** เช็คก่อนแบบข้าม A1/A2 (c1–c3 ถูกและเร็ว) */
export const CHECK_SKIP_A: Plan = {};

/** เริ่มบท ผ่านเช็คก่อนแบบข้าม A1/A2 แล้วหยุดที่หน้า "ไปเลย" ของส่วน A */
export async function toBlockA(
  page: Page,
  plan: Plan = CHECK_SKIP_A,
  o: StartOptions = {},
): Promise<void> {
  await startLesson(page, o);
  await playCheck(page, plan);
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
}

/** ไปถึงข้อ A1.1 (เช็คก่อนไม่ข้าม, กด "ไปเลย" ของส่วน A แล้ว) */
export async function toA1(page: Page, o: StartOptions = {}): Promise<void> {
  await toBlockA(page, CHECK_NO_SKIP, o);
  await clickGo(page);
  await expectPageHas(page, MSG.askFill, 'A1.1');
  await guard(page);
}

/** ไปถึงข้อ A2.1 (เช็คก่อนไม่ข้าม, ผ่าน A1 แล้ว) */
export async function toA2(page: Page, o: StartOptions = {}): Promise<void> {
  await toA1(page, o);
  await passA1(page);
}

/** ไปถึงข้อ A3.1 โดยข้าม A1/A2 ด้วยเช็คก่อน */
export async function toA3(page: Page, o: StartOptions = {}): Promise<void> {
  await toBlockA(page, CHECK_SKIP_A, o);
  await clickGo(page);
}

// ---------------------------------------------------------------- ข้อมูล

export function ofType(db: DbDump, type: string): Ev[] {
  return db.events.filter((e) => e.type === type);
}
export function answeredOf(db: DbDump, itemId: string): Ev[] {
  return db.events.filter((e) => e.type === 'item.answered' && e.itemId === itemId);
}
export function firstAnswered(db: DbDump, itemId: string): Ev {
  const e = answeredOf(db, itemId)[0];
  if (!e) throw new Error(`ไม่มี item.answered ของ ${itemId}`);
  return e;
}
export function blocksOf(db: DbDump, kind: string): { started: Ev[]; completed: Ev[] } {
  return {
    started: db.events.filter((e) => e.type === 'block.started' && e.blockKind === kind),
    completed: db.events.filter((e) => e.type === 'block.completed' && e.blockKind === kind),
  };
}
/** อ่านข้อมูลจาก IndexedDB หลังรอให้ outbox เขียนครบอย่างน้อย n event */
export async function dbWhen(page: Page, n: number): Promise<DbDump> {
  return readDbWhen(page, n);
}

// ---------------------------------------------------------------- ตรวจหน้าของลูก

/** คำต้องห้ามในทุกหน้าของลูก (LS §11, Tech §9): เวลา คะแนน "ผิด" "ช้า" ตัวจับเวลา */
const KID_FORBIDDEN =
  /ผิด|คะแนน|วินาที|นาที|ช้า|เร็ว|เก่ง|ยืม|\d+\s*:\s*\d{2}|%|✓|✗|✔|✘|score|wrong/i;
/** หน้า flow เงียบ (check/practice/review/drill) ห้ามบอกถูก/ผิดด้วยเช่นกัน */
const SILENT_FORBIDDEN =
  /ถูก|ผิด|คะแนน|เฉลย|วินาที|นาที|ช้า|\d+\s*:\s*\d{2}|%|✓|✗|✔|✘|score|correct|wrong/i;

/** ตรวจหน้าของลูก: ไม่มีเวลา/คะแนน/timer/progress `silent` = หน้า flow เงียบ */
export async function expectKidPage(page: Page, label: string, silent: boolean): Promise<void> {
  let body = (await page.locator('body').innerText()).replace(/บอกไม่ถูก/g, '');
  // ข้อความ LS ที่มีคำ "ผิด"/"เร็ว" อยู่เอง (ข้อความเมื่อเลือกนับนิ้ว, LS §4 A3) ไม่นับ
  body = body.replace(/ไม่มีผิดเลย นิ้วช่วยได้ ลองดูว่าเห็นกล่องแล้วเร็วกว่าไหม/g, '');
  expect(body, `หน้า ${label} ต้องไม่มีคำที่ห้าม`).not.toMatch(
    silent ? SILENT_FORBIDDEN : KID_FORBIDDEN,
  );
  const bad = await page
    .locator(
      '[role="timer"],[role="progressbar"],[role="meter"],[role="status"],progress,meter,time,[aria-valuenow],[aria-valuetext]',
    )
    .count();
  expect(bad, `หน้า ${label} ต้องไม่มี timer/progressbar/meter/time`).toBe(0);
  const labels = await page
    .locator('[aria-label]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
  for (const l of labels) expect(l).not.toMatch(silent ? SILENT_FORBIDDEN : KID_FORBIDDEN);
}

/** ความเปรียบต่างของสี 2 สี (WCAG) ใช้ตรวจ token ของจุดที่เติมเพิ่ม */
export async function tokenContrast(
  page: Page,
): Promise<{ addedVsSurface: number; edgeVsSurface: number; addedVsA: number; addedVsB: number }> {
  return page.evaluate(() => {
    const resolve = (cssVar: string): [number, number, number] => {
      const el = document.createElement('div');
      el.style.backgroundColor = `var(${cssVar})`;
      document.body.appendChild(el);
      const c = getComputedStyle(el).backgroundColor;
      el.remove();
      const m = /rgba?\(([^)]+)\)/.exec(c);
      const p = (m?.[1] ?? '0,0,0')
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
    };
    const lin = (v: number): number => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const lum = (c: [number, number, number]): number =>
      0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a: [number, number, number], b: [number, number, number]): number => {
      const l1 = lum(a);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const surface = resolve('--color-surface');
    const added = resolve('--color-dot-added');
    const edge = resolve('--color-on-highlight');
    return {
      addedVsSurface: ratio(added, surface),
      edgeVsSurface: ratio(edge, surface),
      addedVsA: ratio(added, resolve('--color-group-a')),
      addedVsB: ratio(added, resolve('--color-group-b')),
    };
  });
}
