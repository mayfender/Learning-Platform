// Helper ของ acceptance test DX-ADD (Tester)
// ข้อมูลเฉลย โจทย์ และรหัสความเข้าใจผิดทั้งหมดในไฟล์นี้พิมพ์จาก Lesson Spec DX-ADD (§4, §5) ด้วยตนเอง
// ไม่ได้ import จาก src/ และไม่ได้อ่านโค้ดของแอป
import { expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

export type StrategyId =
  | 'count-fingers'
  | 'count-on'
  | 'make-ten'
  | 'doubles'
  | 'known'
  | 'count-by-one'
  | 'column'
  | 'split-place'
  | 'jump-tens'
  | 'round'
  | 'unsure';

/** ข้อความของตัวเลือก "หนูคิดยังไง" (LS §5) */
export const STRATEGY_LABEL: Record<StrategyId, string> = {
  'count-fingers': 'นับนิ้ว',
  'count-on': 'นับต่อในใจทีละ 1',
  'make-ten': 'แยกให้ครบ 10',
  doubles: 'ใช้เลขคู่',
  known: 'จำได้เลย',
  'count-by-one': 'นับทีละ 1',
  column: 'ตั้งบวกในใจ',
  'split-place': 'แยกสิบกับหน่วย',
  'jump-tens': 'กระโดดทีละสิบ',
  round: 'ปัดเลขให้กลม',
  unsure: 'บอกไม่ถูก',
};

export const STRATEGY_SET_A: StrategyId[] = [
  'count-fingers',
  'count-on',
  'make-ten',
  'doubles',
  'known',
  'unsure',
];
export const STRATEGY_SET_B: StrategyId[] = [
  'count-by-one',
  'column',
  'split-place',
  'jump-tens',
  'round',
  'unsure',
];
/** วิธีคิดที่ LS §5 ระบุว่า "นับเป็นการนับ" */
export const COUNTING: StrategyId[] = ['count-fingers', 'count-on', 'count-by-one'];

export interface ItemDef {
  id: string;
  stage: 1 | 2 | 3 | 4 | 5;
  /** ข้อความโจทย์บนจอ (ด่าน 1 ไม่มีข้อความโจทย์ เป็นภาพ) */
  text?: string;
  dots?: number;
  expected: number;
  fluentMs?: number;
  set?: 'A' | 'B';
}

// LS §4 (คิดเฉลยใหม่เองทีละข้อ)
export const ITEMS: ItemDef[] = [
  { id: '1.1', stage: 1, dots: 7, expected: 7 },
  { id: '1.2', stage: 1, dots: 9, expected: 9 },
  { id: '1.3', stage: 1, dots: 6, expected: 6 },
  { id: '1.4', stage: 1, dots: 8, expected: 8 },
  { id: '2.1', stage: 2, text: '7 + ? = 10', expected: 3, fluentMs: 3000 },
  { id: '2.2', stage: 2, text: '4 + ? = 10', expected: 6, fluentMs: 3000 },
  { id: '2.3', stage: 2, text: '8 + ? = 10', expected: 2, fluentMs: 3000 },
  { id: '2.4', stage: 2, text: '3 + ? = 10', expected: 7, fluentMs: 3000 },
  { id: '3.1', stage: 3, text: '6 + 6 = ?', expected: 12, fluentMs: 3000 },
  { id: '3.2', stage: 3, text: '8 + 8 = ?', expected: 16, fluentMs: 3000 },
  { id: '3.3', stage: 3, text: '6 + 7 = ?', expected: 13, fluentMs: 4000, set: 'A' },
  { id: '3.4', stage: 3, text: '7 + 8 = ?', expected: 15, fluentMs: 4000, set: 'A' },
  { id: '4.1', stage: 4, text: '8 + 5 = ?', expected: 13, fluentMs: 4000, set: 'A' },
  { id: '4.2', stage: 4, text: '9 + 6 = ?', expected: 15, fluentMs: 4000, set: 'A' },
  { id: '4.3', stage: 4, text: '7 + 4 = ?', expected: 11, fluentMs: 4000, set: 'A' },
  { id: '4.4', stage: 4, text: '4 + 9 = ?', expected: 13, fluentMs: 4000, set: 'A' },
  { id: '5.1', stage: 5, text: '47 + 10 = ?', expected: 57, fluentMs: 5000 },
  { id: '5.2', stage: 5, text: '30 + 40 = ?', expected: 70, fluentMs: 5000 },
  { id: '5.3', stage: 5, text: '38 + 25 = ?', expected: 63, fluentMs: 15000, set: 'B' },
  { id: '5.4', stage: 5, text: '49 + 26 = ?', expected: 75, fluentMs: 15000, set: 'B' },
];
export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export interface WrongDef {
  r: number;
  code: string;
  /** วิธีคิด -> รหัส (มาก่อนเสมอ) ตาม LS §4 ที่เขียน "ถ้าเลือก ... ไม่งั้น ..." */
  byStrategy?: Partial<Record<StrategyId, string>>;
}
const w = (r: number, code: string, byStrategy?: Partial<Record<StrategyId, string>>): WrongDef =>
  byStrategy ? { r, code, byStrategy } : { r, code };

// LS §4 ตาราง "คำตอบผิด -> ความเข้าใจผิด"
export const WRONG: Record<string, WrongDef[]> = {
  '1.1': [w(6, 'M1'), w(8, 'M1'), w(5, 'M2'), w(3, 'M3')],
  '1.2': [w(8, 'M1'), w(10, 'M1'), w(5, 'M2'), w(1, 'M3')],
  '1.3': [w(7, 'M1'), w(5, 'M2'), w(4, 'M3')],
  '1.4': [w(7, 'M1'), w(9, 'M1'), w(5, 'M2'), w(2, 'M3')],
  '2.1': [w(2, 'M5'), w(4, 'M5'), w(17, 'M4')],
  '2.2': [w(5, 'M5'), w(7, 'M5'), w(14, 'M4')],
  '2.3': [w(1, 'M5'), w(3, 'M5'), w(18, 'M4')],
  '2.4': [w(6, 'M5'), w(8, 'M5'), w(13, 'M4')],
  '3.1': [w(11, 'M5'), w(13, 'M5'), w(2, 'M6')],
  '3.2': [w(15, 'M5'), w(17, 'M5'), w(6, 'M6')],
  '3.3': [w(12, 'M5', { doubles: 'M8' }), w(14, 'M5', { doubles: 'M8' }), w(3, 'M6')],
  '3.4': [w(14, 'M5', { doubles: 'M8' }), w(16, 'M5', { doubles: 'M8' }), w(5, 'M6')],
  '4.1': [w(12, 'M5'), w(14, 'M5'), w(3, 'M6'), w(15, 'M7'), w(18, 'M7')],
  '4.2': [w(14, 'M5'), w(16, 'M5', { 'make-ten': 'M7' }), w(19, 'M7'), w(5, 'M6')],
  '4.3': [w(10, 'M5'), w(12, 'M5'), w(1, 'M6'), w(14, 'M7'), w(17, 'M7')],
  '4.4': [w(12, 'M5'), w(14, 'M5', { 'make-ten': 'M7' }), w(19, 'M7'), w(3, 'M6')],
  '5.1': [w(48, 'M9'), w(56, 'M5'), w(58, 'M5')],
  '5.2': [w(7, 'M9'), w(69, 'M5'), w(71, 'M5')],
  '5.3': [w(53, 'M10'), w(513, 'M11'), w(62, 'M5'), w(64, 'M5')],
  '5.4': [
    w(65, 'M10'),
    w(615, 'M11'),
    w(74, 'M5', { round: 'M12' }),
    w(76, 'M5', { round: 'M12' }),
  ],
};

/** รหัสที่ควรได้ตาม LS (มาตรฐานของ Tester เอง) */
export function expectedCode(itemId: string, response: number, strategy?: StrategyId): string {
  const item = ITEM_BY_ID[itemId];
  if (!item) throw new Error(`unknown item ${itemId}`);
  if (response === item.expected) return '';
  const rule = WRONG[itemId]?.find((x) => x.r === response);
  if (!rule) return 'MX';
  return (strategy && rule.byStrategy?.[strategy]) || rule.code;
}

/** คำอธิบายความเข้าใจผิด LS §3 คอลัมน์ 2 */
export const MISCONCEPTION_TEXT: Record<string, string> = {
  M1: 'ไม่เห็นโครงสร้าง 5 ต้องนับทีละจุดแต่ไม่ทัน',
  M2: 'เห็นแค่แถวบนที่เต็ม 5',
  M3: 'นับช่องว่างแทนจุด',
  M4: 'โจทย์หาตัวที่หายไป เอาตัวเลขที่เห็นมาบวกกัน',
  M5: 'นับพลาด 1 (นับตัวตั้งซ้ำหรือนับขาด)',
  M6: 'ตอบแค่หลักหน่วย ลืมสิบที่ได้',
  M7: 'แยกให้ครบ 10 แล้วไม่หักส่วนที่ใช้เติมออก',
  M8: 'ใช้เลขคู่แต่ชดเชยผิด',
  M9: 'มองหลักสิบเป็นหน่วย (ค่าประจำหลัก)',
  M10: 'ลืมทด',
  M11: 'เอาผลแต่ละหลักมาต่อกันตรงๆ',
  M12: 'ปัดให้กลมแล้วชดเชยผิด',
};

export const STAGE_TITLE = ['เห็นภาพ 10 ช่อง', 'คู่รวม 10', 'เลขคู่', 'บวกข้ามสิบ', 'เลขสองหลัก'];
export const STAGE_INTRO = [
  'ด่าน 1 · เห็นภาพ 10 ช่อง — ภาพจะโผล่มาแป๊บเดียว นับไม่ทันก็ไม่เป็นไร ลองดูทั้งภาพ',
  'ด่าน 2 · คู่รวม 10 — เติมตัวเลขให้ได้ 10',
  'ด่าน 3 · เลขคู่ — คิดในใจแล้วตอบ',
  'ด่าน 4 · บวกข้ามสิบ — คิดในใจแล้วตอบ',
  'ด่าน 5 · เลขสองหลัก — ด่านสุดท้าย! ใช้วิธีไหนก็ได้',
];
export const STAGE_INSTRUCTION = [
  'ดูภาพให้ดี แล้วบอกว่ามีจุดกี่จุด',
  'เติมตัวเลขให้ได้ 10',
  'คิดในใจ แล้วตอบ',
  'คิดในใจ แล้วตอบ',
  'คิดในใจ แล้วตอบ',
];
export const ACKS = ['รับแล้ว!', 'โอเค ไปต่อ!', 'เยี่ยม ขอบคุณ!'];

export const LADDER = [
  'เห็น 5 และ 10 โดยไม่ต้องนับ',
  'คู่รวม 10 ได้ทันที',
  'เลขคู่และใกล้เลขคู่',
  'ทำให้ครบ 10',
  'บวกสิบและเลขลงตัวสิบ',
  'แยกหลักสิบกับหน่วย',
  'กระโดดบนเส้นจำนวน',
  'ปัดให้กลมแล้วชดเชย',
  'เลือกวิธีเอง และอธิบายได้ว่าทำไม',
];

// ---------------------------------------------------------------- นาฬิกาปลอม

export const T0 = new Date('2026-03-01T09:00:00Z');

/** ติดตั้งนาฬิกาปลอม (ต้องเรียกก่อน goto) เวลาจะเดินเองจนกว่าจะ pause */
export async function installClock(page: Page): Promise<void> {
  pausedPages.delete(page);
  await page.clock.install({ time: T0 });
}
const pausedPages = new WeakSet<Page>();
/** Tech Spec §3.3.1: หลังแตะที่เปลี่ยนหน้า หน้าใหม่ไม่รับ input ภายใน 400 ms */
export const GUARD_MS = 450;
/** ความหน่วงเริ่มต้นของแต่ละข้อ (ต้อง ≥ GUARD_MS เพราะข้อหลังแตะที่เปลี่ยนหน้าตอบได้เร็วสุด 450 ms) */
export const DEFAULT_MS = 500;
/** รอให้พ้น tap-guard (นาฬิกาปลอมที่หยุดอยู่ = เดินเวลา; ไม่งั้นรอเวลาจริง) */
export async function guardWait(page: Page): Promise<void> {
  if (pausedPages.has(page)) await tick(page, GUARD_MS);
  else await page.waitForTimeout(GUARD_MS);
}
/** หยุดนาฬิกา หลังจากนี้เวลาเดินเฉพาะเมื่อเรียก tick() */
export async function pauseClock(page: Page): Promise<void> {
  await page.clock.pauseAt(new Date(T0.getTime() + 60 * 60_000));
  pausedPages.add(page);
}
/** เดินเวลา ms แล้วรอให้ React render (WebKit ต้องรอสั้นๆ หลัง runFor) */
export async function tick(page: Page, ms: number): Promise<void> {
  if (ms > 0) await page.clock.runFor(ms);
  await page.waitForTimeout(40);
}

// ---------------------------------------------------------------- เปิดแอปและเริ่มภารกิจ

export async function openApp(page: Page, nickname = 'ทดสอบ'): Promise<void> {
  await page.goto('./');
  await page.getByRole('textbox').fill(nickname);
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await expect(page.getByRole('heading', { name: `สวัสดี ${nickname}` })).toBeVisible();
}
export async function openDx(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'ภารกิจสำรวจการบวก' }).click();
  await expect(page.getByRole('heading', { name: 'ภารกิจสำรวจการบวก' })).toBeVisible();
}
export async function passParentIntro(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'ต่อไป: หน้าของลูก' }).click();
  await expect(page.getByRole('heading', { name: 'ช่วยพ่อสำรวจหน่อย!' })).toBeVisible();
  await guardWait(page);
}
export async function startMission(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'เริ่มภารกิจ' }).click();
  await guardWait(page);
}
/** สร้างผู้เรียน (ถ้ายังไม่มี) -> เปิดภารกิจ -> เข้าหน้า intro ของด่าน 1 */
export async function beginSession(page: Page): Promise<void> {
  await openApp(page);
  await openDx(page);
  await passParentIntro(page);
  await startMission(page);
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
}

// ---------------------------------------------------------------- อ่านหน้าจอ

export async function mainText(page: Page): Promise<string> {
  return page.locator('main').innerText();
}
export async function firstLine(page: Page): Promise<string> {
  return ((await mainText(page)).split('\n')[0] ?? '').trim();
}
export function keyButton(page: Page, key: string) {
  return page.locator('main button', { hasText: new RegExp(`^${key}$`) });
}
export async function typed(page: Page): Promise<string> {
  // AnswerDisplay มี aria-live="polite"
  const t = (await page.locator('[aria-live="polite"]').first().innerText()).trim();
  return t === 'แตะตัวเลขด้านล่าง' ? '' : t;
}

// ---------------------------------------------------------------- ตอบ

export interface Answer {
  /** คำตอบที่พิมพ์ (ไม่ระบุ = เฉลยที่ถูก) */
  r?: number;
  /** เวลาเงียบ (ms) ที่เดินก่อนกดตอบ */
  ms?: number;
  /** วิธีคิดที่เลือก (ไม่ระบุ = known / column / round ตามชุด) */
  s?: StrategyId;
  /** เวลา (ms) ที่ลูกใช้อยู่ที่หน้าเลือกวิธีคิดก่อนแตะเลือก (ไม่ระบุ = แตะทันที) */
  sm?: number;
}
export type Plan = Record<string, Answer>;

export function defaultStrategy(item: ItemDef): StrategyId | undefined {
  if (item.set === 'A') return 'known';
  if (item.id === '5.3') return 'column';
  if (item.id === '5.4') return 'round';
  return undefined;
}

export type InputMode = 'tap' | 'keyboard';

export async function typeAnswer(page: Page, digits: string, mode: InputMode): Promise<void> {
  if (mode === 'keyboard') {
    await page.keyboard.type(digits);
    return;
  }
  for (const d of digits) await keyButton(page, d).click();
}
export async function submitAnswer(page: Page, mode: InputMode): Promise<void> {
  if (mode === 'keyboard') await page.keyboard.press('Enter');
  else await page.getByRole('button', { name: 'ตอบ', exact: true }).click();
}

// ---------------------------------------------------------------- หน้าตัวอย่างก่อนข้อ 1.1 (LS §8.2.1, Tech §14.1)

/** ค่าจาก LS §8.2.1 (พิมพ์เอง ไม่ import จาก src/) */
export const EXAMPLE = {
  demoText: 'ตัวอย่าง: ดูจุดทั้งหมดในกล่อง มีกี่จุด พิมพ์ตัวเลขแล้วกด ตอบ',
  tryText: 'ลองดูอีกที คราวนี้ภาพจะหายไป พิมพ์ว่าเห็นกี่จุด',
  revealText: 'มี 2 จุด ต่อไปเป็นข้อจริงแล้ว',
  demoDots: 3,
  /** รับเฉพาะเลขนี้ในขั้นตัวอย่าง */
  demoAccept: 3,
  tryDots: 2,
  readyMs: 900,
  flashMs: 1500,
  revealMs: 2000,
} as const;

/** จำนวน circle ใน ten-frame (จุดใน DOM) */
export async function dotCount(page: Page): Promise<number> {
  return page.locator('[data-testid="ten-frame"] circle').count();
}

/**
 * จำนวนจุดที่ลูกเห็นจริง: circle ที่มีขนาด ไม่ถูกซ่อนด้วย visibility/display, การ์ดไม่โปร่งใส
 * (opacity > 0.5) และอยู่ในหน้าจอ (ไม่ใช่แค่มีใน DOM)
 */
export async function seenDots(page: Page): Promise<number> {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="ten-frame"]');
    if (!svg) return 0;
    let opacity = 1;
    for (let el: Element | null = svg; el; el = el.parentElement) {
      const cs = getComputedStyle(el);
      opacity *= parseFloat(cs.opacity);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    }
    if (opacity <= 0.5) return 0;
    return Array.from(svg.querySelectorAll('circle')).filter((c) => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none' &&
        r.left >= 0 &&
        r.top >= 0 &&
        r.right <= window.innerWidth &&
        r.bottom <= window.innerHeight
      );
    }).length;
  });
}

export interface ExampleOptions {
  /** ตัวเลขที่พิมพ์ตอบในขั้น "ลองเอง" (ค่าเริ่มต้น 5 = ผิด เพื่อให้เห็นว่าไม่บอกถูกผิด) */
  tryResponse?: string;
  /** เรียกที่แต่ละขั้น: example-demo, example-try-ready, example-try-show, example-try-hidden, example-reveal */
  observe?: (label: string) => Promise<void>;
  /** กด "ตอบ" ด้วยการแตะสองครั้ง (เด็กแตะเบิ้ล) */
  dbl?: boolean;
}

async function submitExample(page: Page, dbl: boolean): Promise<void> {
  const btn = page.getByRole('button', { name: 'ตอบ', exact: true });
  if (dbl) await btn.dblclick();
  else await btn.click();
}

/**
 * เดินผ่านหน้าตัวอย่าง + ลองเอง + เฉลยภาพ (LS §8.2.1) เริ่มจากหน้าตัวอย่างที่เพิ่งแสดง
 * จบเมื่อเข้าข้อ 1.1 ("พร้อมนะ..."); ใช้ได้ทั้งนาฬิกาปลอมที่หยุดอยู่ (เดินเวลาด้วย tick) และเวลาจริง
 */
export async function passExample(page: Page, o: ExampleOptions = {}): Promise<void> {
  const obs = async (l: string): Promise<void> => {
    if (o.observe) await o.observe(l);
  };
  const paused = pausedPages.has(page);
  await expect(page.getByText(EXAMPLE.demoText, { exact: true })).toBeVisible();
  await obs('example-demo');
  await guardWait(page);
  await keyButton(page, String(EXAMPLE.demoAccept)).click();
  await submitExample(page, o.dbl ?? false);
  await expect(page.getByText('พร้อมนะ...')).toBeVisible();
  await page.waitForTimeout(60); // ให้ React ล้างค่าที่พิมพ์ (นาฬิกาปลอมที่หยุดทำให้ effect ช้ากว่าเวลาจริงเล็กน้อย)
  await obs('example-try-ready');
  if (paused) await tick(page, EXAMPLE.readyMs);
  else await expect(page.getByText('ดู!', { exact: true })).toBeVisible({ timeout: 4000 });
  await obs('example-try-show');
  if (paused) await tick(page, EXAMPLE.flashMs + 150);
  await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible({ timeout: 6000 });
  await obs('example-try-hidden');
  for (const d of o.tryResponse ?? '5') await keyButton(page, d).click();
  await submitExample(page, o.dbl ?? false);
  await expect(page.getByText(EXAMPLE.revealText, { exact: true })).toBeVisible();
  await obs('example-reveal');
  if (paused) await tick(page, EXAMPLE.revealMs);
  else await expect(page.getByText(EXAMPLE.revealText)).toBeHidden({ timeout: 5000 });
  await expect(page.getByText('พร้อมนะ...')).toBeVisible();
}

/** กด "ไปเลย" ของด่าน 1 แล้วผ่านหน้าตัวอย่างจนถึงข้อ 1.1 (ช่วยกันซ้ำ) */
export async function goStage1(page: Page, o: ExampleOptions = {}): Promise<void> {
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await passExample(page, o);
}

export async function pickStrategy(page: Page, id: StrategyId): Promise<void> {
  const label = STRATEGY_LABEL[id];
  await page
    .locator('main button')
    .filter({ hasText: new RegExp(`^${label}`) })
    .first()
    .click();
}

export interface RunOptions {
  /** หยุดก่อนเริ่มข้อนี้ (ไม่ทำข้อนี้) */
  stopBefore?: string;
  input?: InputMode;
  /** เรียกทุกหน้าที่ลูกเห็น (label บอกชนิดหน้า) */
  observe?: (label: string, page: Page) => Promise<void>;
  /** ข้อความหลังกดตอบของแต่ละข้อ */
  acks?: string[];
  /** ข้อความหน้าเปิดด่านทั้งหมดที่เห็น */
  intros?: string[];
  /** เริ่มจากข้อนี้ (สถานะต้องอยู่ก่อนข้อนี้: หน้าเปิดด่านถ้าเป็นข้อแรกของด่าน หรือกำลังเริ่มข้อ) */
  startAt?: string;
  /** เหลือให้ค้างที่หน้า strategy ของข้อนี้ (ตอบแล้ว ผ่าน ack แล้ว แต่ยังไม่เลือกวิธีคิด) */
  stopAtStrategyOf?: string;
  /** เก็บเวลาของนาฬิกาในหน้า (Date.now ms) ตอนกด "ตอบ" ของแต่ละข้อ */
  submitAt?: Record<string, number>;
}

/**
 * เล่นภารกิจจากหน้า intro ของด่าน 1 (ต้องเรียก beginSession + pauseClock แล้ว)
 * นาฬิกาต้อง pause เพื่อให้ความหน่วงเท่ากับ ms ที่กำหนดเป๊ะ
 * คืนค่า: 'finished' (ถึงหน้าจบ) หรือ id ของข้อที่หยุด
 */
export async function runSession(
  page: Page,
  plan: Plan = {},
  opts: RunOptions = {},
): Promise<string> {
  const mode = opts.input ?? 'tap';
  const obs = async (l: string): Promise<void> => {
    if (opts.observe) await opts.observe(l, page);
  };
  let lastStage = 0;
  let carry = 0; // เวลาที่เดินไปแล้วในข้อนี้ระหว่างรอ tap-guard
  const startIdx = Math.max(
    0,
    ITEMS.findIndex((i) => i.id === (opts.startAt ?? '1.1')),
  );
  const prev = ITEMS[startIdx - 1];
  if (prev && prev.stage === ITEMS[startIdx]?.stage) lastStage = prev.stage;
  for (const item of ITEMS.slice(startIdx)) {
    if (item.stage !== lastStage) {
      // หน้าเปิดด่าน หรือ (กรณีข้ามด่าน 5) หน้าจบ
      await expect(
        page.getByRole('button', { name: 'ไปเลย' }).or(page.getByText('ภารกิจสำเร็จ!')),
      ).toBeVisible();
      if ((await page.getByText('ภารกิจสำเร็จ!').count()) > 0) {
        await obs('kid-end');
        return 'finished';
      }
      opts.intros?.push(await mainText(page));
      await obs(`stage-intro-${item.stage}`);
      if (opts.stopBefore === item.id) return item.id;
      await page.getByRole('button', { name: 'ไปเลย' }).click();
      lastStage = item.stage;
      carry = 0;
      // ด่าน 1: ผ่านหน้าตัวอย่าง + ลองเอง ก่อนถึงข้อ 1.1 (LS §8.2.1)
      if (item.stage === 1) {
        await passExample(page, {
          observe: async (l) => {
            await obs(l);
          },
        });
      }
      if (item.stage > 1) {
        await guardWait(page);
        carry = GUARD_MS;
      }
    }
    if (opts.stopBefore === item.id) return item.id;
    const a = plan[item.id] ?? {};
    const response = a.r ?? item.expected;
    if (item.stage === 1) {
      await tick(page, 900);
      await obs(`flash-show-${item.id}`);
      await tick(page, 1650);
      await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible();
    } else {
      await expect(page.getByText(item.text ?? '', { exact: true })).toBeVisible();
    }
    await obs(`item-${item.id}`);
    await tick(page, Math.max(0, (a.ms ?? DEFAULT_MS) - carry));
    carry = 0;
    await typeAnswer(page, String(response), mode);
    if (opts.submitAt) opts.submitAt[item.id] = await page.evaluate(() => Date.now());
    await submitAnswer(page, mode);
    await expect(page.getByText(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/)).toBeVisible();
    opts.acks?.push((await mainText(page)).trim());
    await obs(`ack-${item.id}`);
    await tick(page, 1000);
    if (item.set) {
      await expect(page.getByText('หนูคิดข้อนี้ยังไง?')).toBeVisible();
      await obs(`strategy-${item.id}`);
      if (opts.stopAtStrategyOf === item.id) return item.id;
      if (a.sm) await tick(page, a.sm);
      await pickStrategy(page, a.s ?? defaultStrategy(item) ?? 'unsure');
      await guardWait(page);
      carry = GUARD_MS;
    }
  }
  await expect(page.getByText('ภารกิจสำเร็จ!')).toBeVisible();
  await obs('kid-end');
  return 'finished';
}

/** หลังจบ กด "ให้พ่อดูผล" และรอหน้าผล */
export async function openResults(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'ให้พ่อดูผล' }).click();
  await expect(page.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
}

/** ทำตั้งแต่เปิดแอปจนถึงหน้าผล */
export async function fullRun(page: Page, plan: Plan = {}, opts: RunOptions = {}): Promise<string> {
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  const r = await runSession(page, plan, opts);
  await openResults(page);
  return r;
}

// ---------------------------------------------------------------- หน้าผล

export interface ItemRow {
  id: string;
  problem: string;
  answer: string;
  result: string;
  time: string;
  fluent: string;
  strategy: string;
  misconception: string;
}
export async function itemRows(page: Page): Promise<ItemRow[]> {
  const section = page.locator('main section').filter({
    has: page.getByRole('heading', { name: 'รายละเอียดทุกข้อ' }),
  });
  const rows = await section
    .locator('tbody tr')
    .evaluateAll((trs) =>
      trs.map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim()),
      ),
    );
  return rows.map((c) => ({
    id: c[0] ?? '',
    problem: c[1] ?? '',
    answer: c[2] ?? '',
    result: c[3] ?? '',
    time: c[4] ?? '',
    fluent: c[5] ?? '',
    strategy: c[6] ?? '',
    misconception: c[7] ?? '',
  }));
}
export interface StageRow {
  label: string;
  cells: string[];
}
export async function stageRows(page: Page): Promise<StageRow[]> {
  const section = page.locator('main section').filter({
    has: page.getByRole('heading', { name: 'ผลรายด่าน' }),
  });
  const rows = await section
    .locator('tbody tr')
    .evaluateAll((trs) =>
      trs.map((tr) =>
        Array.from(tr.querySelectorAll('td,th')).map((td) => (td.textContent ?? '').trim()),
      ),
    );
  return rows.map((c) => ({ label: c[0] ?? '', cells: c.slice(1) }));
}
export async function sectionText(page: Page, heading: string): Promise<string> {
  const section = page.locator('main section').filter({
    has: page.getByRole('heading', { name: heading, exact: true }),
  });
  return section.innerText();
}
export async function recommendedStep(page: Page): Promise<number | 'incomplete'> {
  const t = await sectionText(page, 'ขั้นที่แนะนำ');
  const m = /แนะนำให้เริ่มที่ ขั้นที่ (\d):/.exec(t);
  if (m) return Number(m[1]);
  if (t.includes('ยังทำไม่ครบ ควรทำต่อให้จบก่อน')) return 'incomplete';
  throw new Error(`cannot read recommendation from: ${t}`);
}

// ---------------------------------------------------------------- ข้อมูลใน IndexedDB / export

export type Ev = { id: string; type: string; at: string; sessionId: string } & Record<
  string,
  unknown
>;
export interface DbDump {
  events: Ev[];
  learners: Array<Record<string, unknown>>;
}
export async function readDb(page: Page): Promise<DbDump> {
  return page.evaluate(async (): Promise<DbDump> => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const rq = indexedDB.open('learning-platform');
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(new Error('open failed'));
    });
    const all = (name: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const rq = db.transaction(name).objectStore(name).getAll();
        rq.onsuccess = () => resolve(rq.result as unknown[]);
        rq.onerror = () => reject(new Error('read failed'));
      });
    const events = (await all('events')) as Ev[];
    const learners = (await all('learners')) as Array<Record<string, unknown>>;
    db.close();
    events.sort((a, b) => a.at.localeCompare(b.at));
    return { events, learners };
  });
}
/** รอให้ outbox เขียนครบแล้วคืนค่า */
export async function readDbWhen(page: Page, minEvents: number): Promise<DbDump> {
  await expect
    .poll(async () => (await readDb(page)).events.length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(minEvents);
  return readDb(page);
}
export function byType(events: Ev[], type: string): Ev[] {
  return events.filter((e) => e.type === type);
}

export const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * ตรวจลำดับ event ของ session เดียว "ตามลำดับในอาร์เรย์" (ไม่เรียงใหม่) ตาม Tech §14.2 / ADR-0008:
 * session.started เป็นตัวแรก, session.completed/abandoned เป็นตัวสุดท้าย, at เป็น ISO (toISOString) และเพิ่มขึ้นเคร่งครัด
 */
const label = (e: Ev): string => `${e.type}${typeof e.itemId === 'string' ? ' ' + e.itemId : ''}`;
export function expectSessionOrder(events: Ev[], ctx: string): void {
  expect(events.length, `${ctx}: ต้องมี event`).toBeGreaterThan(1);
  expect(events[0]?.type, `${ctx}: ตัวแรก`).toBe('session.started');
  expect(['session.completed', 'session.abandoned'], `${ctx}: ตัวสุดท้าย`).toContain(
    events[events.length - 1]?.type,
  );
  for (const e of events) expect(e.at, `${ctx}: รูปแบบ at`).toMatch(ISO_MS);
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1] as Ev;
    const b = events[i] as Ev;
    expect(
      Date.parse(b.at),
      `${ctx}: at ต้องเพิ่มขึ้นเคร่งครัด (${label(a)} -> ${label(b)})`,
    ).toBeGreaterThan(Date.parse(a.at));
  }
}

/** แยก event ตาม sessionId โดยคงลำดับในอาร์เรย์ */
export function bySession(events: Ev[]): Map<string, Ev[]> {
  const m = new Map<string, Ev[]>();
  for (const e of events) m.set(e.sessionId, [...(m.get(e.sessionId) ?? []), e]);
  return m;
}

export interface ExportJson {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  learners: Array<Record<string, unknown>>;
  events: Ev[];
}
/** กดปุ่ม export บนหน้าปัจจุบัน แล้วอ่านไฟล์ที่ได้ */
export async function doExport(
  page: Page,
): Promise<{ json: ExportJson; name: string; path: string }> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export/ }).click();
  const dl = await downloadPromise;
  const path = await dl.path();
  const json = JSON.parse(await readFile(path, 'utf8')) as ExportJson;
  return { json, name: dl.suggestedFilename(), path };
}

// ---------------------------------------------------------------- พ่อกดค้างโลโก้

export async function longPressLogo(page: Page, ms: number, fakeClock: boolean): Promise<void> {
  const logo = page.getByRole('button', { name: 'โลโก้', exact: true });
  const box = await logo.boundingBox();
  if (!box) throw new Error('logo not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  if (fakeClock) await tick(page, ms);
  else await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(60);
}

// ---------------------------------------------------------------- ตรวจหน้าของลูก

const FORBIDDEN =
  /ถูก|ผิด|คะแนน|เฉลย|วินาที|นาที|\d+\s*:\s*\d{2}|ข้อที่|\d+\s*\/\s*\d+|score|correct|wrong|%|✓|✗|✔|✘/i;

/** ตรวจว่าหน้านี้ไม่มีเวลา คะแนน ความถูกต้อง หรือ progress (LS §8.4, §12 #3, Tech Spec §9) */
export async function expectNoFeedback(page: Page, label: string): Promise<void> {
  const body = (await page.locator('body').innerText()).replace('บอกไม่ถูก', '');
  expect(body, `หน้า ${label} ต้องไม่มีคำ/รูปแบบที่ห้าม`).not.toMatch(FORBIDDEN);
  const bad = await page
    .locator(
      '[role="timer"],[role="progressbar"],[role="meter"],[role="status"],progress,meter,time,[aria-valuenow],[aria-valuetext]',
    )
    .count();
  expect(bad, `หน้า ${label} ต้องไม่มี timer/progressbar/meter/time`).toBe(0);
  // ไม่มี ตัวเลขนับถอยหลัง/นาฬิกาใน aria-label
  const labels = await page
    .locator('[aria-label]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
  for (const l of labels) expect(l).not.toMatch(FORBIDDEN);
}

/** ลายเซ็นทางสายตาของ element ใน main (class + สีที่คำนวณ) ใช้เทียบหน้าเมื่อตอบถูกกับผิด */
export async function visualSignature(page: Page): Promise<string> {
  return page.locator('main').evaluate((main) => {
    const out: string[] = [];
    const walk = (el: Element): void => {
      const cs = getComputedStyle(el);
      out.push(
        [
          el.tagName,
          el.className.toString(),
          cs.color,
          cs.backgroundColor,
          cs.opacity,
          cs.animationName,
          cs.transitionProperty,
          cs.borderColor,
          cs.visibility,
          el.childElementCount === 0 ? '' : '',
        ].join('|'),
      );
      for (const c of Array.from(el.children)) walk(c);
    };
    walk(main);
    return out.join('\n');
  });
}

export async function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

/** ความสูงต่ำสุดของปุ่มที่มองเห็นทั้งหมดในหน้า */
export async function smallestButton(
  page: Page,
): Promise<{ name: string; w: number; h: number } | null> {
  return page.evaluate(() => {
    let min: { name: string; w: number; h: number } | null = null;
    for (const b of Array.from(document.querySelectorAll('button, a[href]'))) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(b);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // ลิงก์ที่ครอบปุ่มอยู่แล้ว วัดที่ปุ่มพอ
      if (b.tagName === 'A' && b.querySelector('button')) continue;
      if (b.getAttribute('aria-label') === 'โลโก้') continue;
      if (!min || r.height < min.h) {
        min = {
          name: (b.textContent ?? b.getAttribute('aria-label') ?? '').trim(),
          w: r.width,
          h: r.height,
        };
      }
    }
    return min;
  });
}

export function fmtSeconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}

// ---------------------------------------------------------------- สลับแท็บ / ความเปรียบต่าง

export async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
  await page.waitForTimeout(40);
}

/** รายการข้อความในหน้าที่ความเปรียบต่างต่ำกว่า WCAG AA (4.5, ข้อความใหญ่ 3.0) */
export async function lowContrast(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    type RGBA = [number, number, number, number];
    const parse = (c: string): RGBA | null => {
      const m = /rgba?\(([^)]+)\)/.exec(c);
      if (!m || !m[1]) return null;
      const p = m[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p.length > 3 ? (p[3] ?? 1) : 1];
    };
    const lin = (v: number): number => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const lum = (c: RGBA): number => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const blend = (top: RGBA, bottom: RGBA): RGBA => {
      const a = top[3];
      return [
        top[0] * a + bottom[0] * (1 - a),
        top[1] * a + bottom[1] * (1 - a),
        top[2] * a + bottom[2] * (1 - a),
        1,
      ];
    };
    const bgOf = (el: Element): RGBA => {
      const layers: RGBA[] = [];
      let cur: Element | null = el;
      while (cur) {
        const c = parse(getComputedStyle(cur).backgroundColor);
        if (c && c[3] > 0) layers.push(c);
        if (c && c[3] === 1) break;
        cur = cur.parentElement;
      }
      let base: RGBA = [255, 255, 255, 1];
      for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i] as RGBA, base);
      return base;
    };
    const issues: string[] = [];
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      const text = (node.textContent ?? '').trim();
      if (!text) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (el.closest('dialog:not([open])')) continue;
      if (el.closest<HTMLButtonElement>('button')?.disabled) continue;
      seen.add(el);
      const fg = parse(cs.color);
      if (!fg) {
        issues.push(`unparsed color ${cs.color} for "${text}"`);
        continue;
      }
      const bg = bgOf(el);
      const f = blend(fg, bg);
      const l1 = lum(f);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      if (ratio < (large ? 3 : 4.5)) issues.push(`${ratio.toFixed(2)} "${text.slice(0, 30)}"`);
    }
    return issues;
  });
}

export async function logoSize(page: Page): Promise<{ w: number; h: number } | null> {
  const box = await page.getByRole('button', { name: 'โลโก้', exact: true }).boundingBox();
  return box ? { w: box.width, h: box.height } : null;
}
