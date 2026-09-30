// Acceptance test ของ M1 (DX-ADD) โดย Tester — ออกแบบจาก Lesson Spec และ Tech Spec §1–§12 เท่านั้น
// ห้ามอ่านหรือ import จาก src/ (roles/tester.md §2) ดูแผนที่ docs/test-plans/DX-ADD.md
// ชื่อเทสต์ขึ้นต้นด้วยรหัส TC ตรงกับ Test Plan
import { expect, test, type Page } from '@playwright/test';
import {
  ACKS,
  DEFAULT_MS,
  guardWait,
  ITEMS,
  ITEM_BY_ID,
  LADDER,
  MISCONCEPTION_TEXT,
  STAGE_INSTRUCTION,
  STAGE_INTRO,
  STAGE_TITLE,
  STRATEGY_LABEL,
  WRONG,
  beginSession,
  byType,
  doExport,
  expectNoFeedback,
  expectedCode,
  firstLine,
  fullRun,
  installClock,
  itemRows,
  keyButton,
  logoSize,
  longPressLogo,
  lowContrast,
  mainText,
  noHorizontalScroll,
  openApp,
  openDx,
  openResults,
  passParentIntro,
  pickStrategy,
  pauseClock,
  readDb,
  readDbWhen,
  recommendedStep,
  runSession,
  sectionText,
  setVisibility,
  smallestButton,
  stageRows,
  startMission,
  tick,
  typed,
  typeAnswer,
  submitAnswer,
  visualSignature,
  type Ev,
  type Plan,
  type StrategyId,
} from './helpers/dx';
import {
  GROUP_TEXT,
  LEVEL_TEXT,
  NUMBER_TALK,
  NUMBER_TALK_RULES,
  PARENT_NOTE,
  REASON,
  SCENARIOS,
  probeQueues,
  type Scenario,
} from './helpers/scenarios';

test.describe.configure({ timeout: 120_000 });

const isDev = Boolean(process.env.E2E_DEV);
/** ลดขอบเขตตามที่พ่ออนุมัติ: เคสที่ไม่ขึ้นกับอุปกรณ์รันเฉพาะ desktop */
const DESKTOP_ONLY = 'ลดขอบเขตตามที่พ่ออนุมัติ: ตรรกะไม่ขึ้นกับอุปกรณ์ รันเฉพาะ desktop';
const projectName = (): string => test.info().project.name;
const isTouchProject = (): boolean => projectName() !== 'desktop';

/** เก็บ error ของหน้าและ request ที่ออกนอก host ของแอป */
function watch(page: Page): { errors: string[]; external: string[] } {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (/^https?:$/.test(u.protocol) && u.host !== 'localhost:4173') external.push(r.url());
  });
  return { errors, external };
}

// =============================================================== A. โครงหน้าและข้อความ

test('TC-01 หน้าพ่อก่อนเริ่ม ข้อความตรง LS §8.1 (AC2, AC7)', async ({ page }) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await openApp(page);
  await openDx(page);
  await expect(page.getByRole('heading', { name: 'ภารกิจสำรวจการบวก', exact: true })).toBeVisible();
  const main = page.locator('main');
  await expect(main).toContainText(
    '20 ข้อ ใช้เวลาประมาณ 7–10 นาที ผลลัพธ์จะบอกว่าควรเริ่มฝึกที่ขั้นไหนของบันไดการบวก',
  );
  const items = await main.locator('li').allInnerTexts();
  expect(items.map((s) => s.trim())).toEqual([
    'ให้ลูกทำเอง คุณพ่อนั่งดูข้างๆ ได้ แต่ไม่ต้องใบ้',
    'ไม่ต้องห้ามนับนิ้ว เราอยากเห็นวิธีที่ลูกใช้จริง',
    'ระบบจับเวลาแบบเงียบๆ ลูกจะไม่เห็นตัวจับเวลาและจะไม่รู้ว่าข้อไหนถูกหรือผิดระหว่างทำ เพื่อไม่ให้กดดัน',
    'บางข้อจะถามว่า "หนูคิดยังไง" ถ้าลูกไม่แน่ใจ คุณพ่อช่วยเลือกจากที่เห็นได้',
  ]);
  expect(await main.locator('li strong').allInnerTexts()).toEqual([
    'ให้ลูกทำเอง',
    'ไม่ต้องห้ามนับนิ้ว',
    'ระบบจับเวลาแบบเงียบๆ',
  ]);
  await expect(page.getByRole('button', { name: 'ต่อไป: หน้าของลูก', exact: true })).toBeVisible();
});

test('TC-01b หน้าพ่อและหน้าของลูกก่อนเริ่มที่ 360px: ไม่มี scroll แนวนอน ปุ่ม ≥ 48px ไม่มี timer/progress (AC13, AC5)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openApp(page);
  await openDx(page);
  for (const label of ['parent-intro', 'kid-intro']) {
    expect(await noHorizontalScroll(page), `${label} h-scroll`).toBe(true);
    const b = await smallestButton(page);
    expect(b?.h ?? 48, `${label} ปุ่มเล็กสุด`).toBeGreaterThanOrEqual(48);
    const bad = await page
      .locator('[role="timer"],[role="progressbar"],[role="meter"],progress,meter,time')
      .count();
    expect(bad).toBe(0);
    if (label === 'parent-intro') await passParentIntro(page);
  }
});

test('TC-02 หน้าของลูกก่อนเริ่ม และ session.started เกิดตอนกดเริ่มเท่านั้น (LS §8.2, Tech §6)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await openApp(page);
  await openDx(page);
  await passParentIntro(page);
  await expect(page.locator('main p:visible')).toHaveText([
    'อันนี้ไม่ใช่การสอบ ตอบผิดได้ ไม่เป็นไรเลย พ่ออยากรู้แค่ว่าหนูคิดยังไง',
    'มี 5 ด่าน ด่านแรกภาพจะโผล่มาแป๊บเดียว ต้องดูให้ไว!',
  ]);
  await expect(page.getByRole('button', { name: 'เริ่มภารกิจ', exact: true })).toBeVisible();
  expect((await readDb(page)).events).toHaveLength(0);
  await startMission(page);
  const db = await readDbWhen(page, 1);
  expect(db.events).toHaveLength(1);
  const s = db.events[0] as Ev;
  expect(s.type).toBe('session.started');
  expect(s.activityId).toBe('DX-ADD');
  expect(s.activityVersion).toBe('DX-ADD v2');
  expect(s.activityKind).toBe('diagnostic');
  expect(s.schemaVersion).toBe(1);
});

test('TC-03 ลำดับหน้าจอ 20 ข้อ ข้อความเปิดด่าน คำสั่ง โจทย์ และข้อที่ถามวิธีคิด (AC2, AC7, LS §8.3–8.5)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const w = watch(page);
  const intros: string[] = [];
  const acks: string[] = [];
  const strategyItems: string[] = [];
  const instructionsSeen: Record<string, string> = {};
  await fullRun(
    page,
    {},
    {
      intros,
      acks,
      observe: async (label, pg) => {
        if (label.startsWith('strategy-')) strategyItems.push(label.slice(9));
        if (label.startsWith('item-')) {
          const id = label.slice(5);
          instructionsSeen[id] = await mainText(pg);
          // หน้าข้อต้องไม่ใช่หน้าวิธีคิด
          await expect(pg.getByText('หนูคิดข้อนี้ยังไง?')).toHaveCount(0);
        }
      },
    },
  );
  // ข้อความเปิดด่าน
  expect(intros).toHaveLength(5);
  intros.forEach((t, i) => {
    expect(t).toContain(STAGE_INTRO[i] ?? '?');
    expect(t).toContain('ไปเลย');
    if (i === 0) expect(t).not.toContain('ผ่านด่าน');
    else expect(t).toContain(`ผ่านด่าน ${i} แล้ว! เหลืออีก ${5 - i} ด่าน`);
    // ข้อความจบด่านอยู่ก่อนข้อความเปิดด่านถัดไป
    if (i > 0) expect(t.indexOf('ผ่านด่าน')).toBeLessThan(t.indexOf('ด่าน ' + (i + 1) + ' ·'));
  });
  // คำสั่งใต้โจทย์และข้อความช่องว่าง
  for (const it of ITEMS) {
    const t = instructionsSeen[it.id] ?? '';
    expect(t, `ข้อ ${it.id}`).toContain(STAGE_INSTRUCTION[it.stage - 1] ?? '?');
    expect(t, `ข้อ ${it.id}`).toContain('แตะตัวเลขด้านล่าง');
    if (it.stage === 1) expect(t).toContain('ซ่อนแล้ว! กี่จุดนะ?');
  }
  // ข้อที่ถามวิธีคิด
  expect(strategyItems).toEqual(['3.3', '3.4', '4.1', '4.2', '4.3', '4.4', '5.3', '5.4']);
  // ack หมุนเวียนตามลำดับ
  expect(acks).toHaveLength(20);
  acks.forEach((a, i) => expect(a).toBe(ACKS[i % 3]));
  expect(w.errors).toEqual([]);
});

/** ตรวจตัวอย่างวิธีคิดว่าเลขถูก และไม่ใช้เลขเดียวกับโจทย์ (LS §5) */
function verifyExample(ex: string): void {
  const problems = ['6+7', '7+8', '8+5', '9+6', '7+4', '4+9', '38+25', '49+26'];
  if (ex.includes('→')) {
    const n = ex.split('→').map((x) => Number(x.trim()));
    expect(n[1]).toBe((n[0] ?? 0) + 10);
    expect(n[2]).toBe((n[1] ?? 0) + 4);
  } else if (ex.includes('…')) {
    const n = ex
      .replace('…', ',')
      .split(',')
      .map((x) => Number(x.trim()));
    n.forEach((v, i) => i > 0 && expect(v).toBe((n[i - 1] ?? 0) + 1));
  } else if (ex.includes('=')) {
    const sides = ex.split('=').map((x) => x.trim());
    const sums = sides.map((side) => side.split('+').reduce((a, b) => a + Number(b), 0));
    expect(new Set(sums).size, `ตัวอย่าง "${ex}" ต้องเท่ากันทั้งสองข้าง`).toBe(1);
    expect(problems, 'ตัวอย่างต้องไม่ตรงกับโจทย์').not.toContain(
      (sides[0] ?? '').replace(/\s/g, ''),
    );
  }
}

test('TC-04 หน้า "หนูคิดยังไง" ชุด A และ B: ข้อความ ตัวอย่าง 2 คอลัมน์ ปุ่มสูง ≥ 64px แตะแล้วไปต่อ (LS §5)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  const check = async (expected: Array<[string, string?]>): Promise<void> => {
    await expect(page.getByText('หนูคิดข้อนี้ยังไง?')).toBeVisible();
    const opts = page.locator('main button:visible');
    await expect(opts).toHaveCount(expected.length);
    const texts = await opts.evaluateAll((els) =>
      els.map((e) =>
        Array.from(e.querySelectorAll('span')).map((s) => (s.textContent ?? '').trim()),
      ),
    );
    expect(texts).toEqual(expected.map(([l, ex]) => (ex ? [l, ex] : [l])));
    for (const [, ex] of expected) if (ex) verifyExample(ex);
    const boxes = await opts.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: r.width, h: r.height };
      }),
    );
    const xs = [...new Set(boxes.map((b) => b.x))];
    const ys = [...new Set(boxes.map((b) => b.y))];
    expect(xs, '2 คอลัมน์').toHaveLength(2);
    expect(ys, '3 แถว').toHaveLength(3);
    for (const b of boxes) expect(b.h).toBeGreaterThanOrEqual(64);
    expect(await noHorizontalScroll(page)).toBe(true);
  };
  const r1 = await runSession(page, {}, { stopAtStrategyOf: '3.3' });
  expect(r1).toBe('3.3');
  await check([
    ['นับนิ้ว'],
    ['นับต่อในใจทีละ 1', '9… 10, 11, 12'],
    ['แยกให้ครบ 10', '9+3 = 9+1+2'],
    ['ใช้เลขคู่', '5+6 = 5+5+1'],
    ['จำได้เลย'],
    ['บอกไม่ถูก'],
  ]);
  // แตะครั้งเดียว = เลือกและไปต่อ (ไม่มีปุ่มยืนยัน ไม่มี ack ซ้ำ)
  await page.locator('main button:visible').filter({ hasText: 'จำได้เลย' }).click();
  await tick(page, 0);
  await expect(page.getByText('หนูคิดข้อนี้ยังไง?')).toHaveCount(0);
  await expect(page.getByText('7 + 8 = ?', { exact: true })).toBeVisible();
  for (const a of ACKS) await expect(page.getByText(a, { exact: true })).toHaveCount(0);
  // ชุด B ที่ด่าน 5 (ด่านก่อนหน้าตอบถูกหมด)
  await page.goto('./');
  await page.getByRole('link', { name: 'ภารกิจสำรวจการบวก' }).click();
  await passParentIntro(page);
  await startMission(page);
  const r2 = await runSession(page, {}, { stopAtStrategyOf: '5.3' });
  expect(r2).toBe('5.3');
  await check([
    ['นับทีละ 1'],
    ['ตั้งบวกในใจ', 'หน่วยบวกหน่วย แล้วทด'],
    ['แยกสิบกับหน่วย', '23+14 = 30+7'],
    ['กระโดดทีละสิบ', '23 → 33 → 37'],
    ['ปัดเลขให้กลม', '29+5 = 30+4'],
    ['บอกไม่ถูก'],
  ]);
});

test('TC-05 ข้อความหลังกดตอบ: หมุนเวียน 3 ข้อความ นาน 1000 ms แล้วไปข้อถัดไปเอง ไม่มีปุ่ม (LS §8.4, D1)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await tick(page, 900);
  await tick(page, 1650);
  await typeAnswer(page, '7', 'tap');
  await submitAnswer(page, 'tap');
  await expect(page.getByText('รับแล้ว!', { exact: true })).toBeVisible();
  await tick(page, 999);
  await expect(page.getByText('รับแล้ว!', { exact: true })).toBeVisible();
  // ระหว่าง ack ไม่มีปุ่มให้กด (นอกจากโลโก้)
  expect(await page.locator('main button:visible').count()).toBe(0);
  await tick(page, 1);
  await expect(page.getByText('รับแล้ว!', { exact: true })).toHaveCount(0);
  await expect(page.getByText('พร้อมนะ...')).toBeVisible();
  // ข้อ 2 ตอบผิด: ข้อความถัดไปในลำดับ ไม่ขึ้นกับผิด/ถูก
  await tick(page, 900);
  await tick(page, 1650);
  await typeAnswer(page, '5', 'tap');
  await submitAnswer(page, 'tap');
  await expect(page.getByText('โอเค ไปต่อ!', { exact: true })).toBeVisible();
});

test('TC-06 แป้นตัวเลข: ผัง ขนาด ลบ จำกัด 3 หลัก เลข 0 นำหน้า ปุ่มตอบ คีย์บอร์ดจริง ไม่ใช้ input (Tech §3.2)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await guardWait(page);
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible();
  const btns = page.locator('main button:visible');
  await expect(btns).toHaveCount(12);
  const names = await btns.evaluateAll((els) =>
    els.map((e) => e.getAttribute('aria-label') ?? (e.textContent ?? '').trim()),
  );
  expect(names).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ลบตัวเลข', '0', 'ตอบ']);
  expect(await btns.nth(9).innerText()).toBe('⌫');
  const boxes = await btns.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: r.width, h: r.height };
    }),
  );
  expect([...new Set(boxes.map((b) => b.x))]).toHaveLength(3);
  expect([...new Set(boxes.map((b) => b.y))]).toHaveLength(4);
  for (const b of boxes) {
    expect(b.h).toBeGreaterThanOrEqual(56);
    expect(b.w).toBeGreaterThanOrEqual(48);
  }
  expect(await page.locator('main input, main textarea, [contenteditable]').count()).toBe(0);
  expect(await page.locator('[aria-live="polite"]').count()).toBeGreaterThan(0);
  await expect(page.getByText('แตะตัวเลขด้านล่าง', { exact: true })).toBeVisible();
  const submit = page.getByRole('button', { name: 'ตอบ', exact: true });
  await expect(submit).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible(); // ไม่ส่งค่าว่าง
  await keyButton(page, '1').click();
  await expect(submit).toBeEnabled();
  for (const d of '234') await keyButton(page, d).click();
  expect(await typed(page), 'สูงสุด 3 หลัก').toBe('123');
  await page.getByRole('button', { name: 'ลบตัวเลข' }).click();
  expect(await typed(page)).toBe('12');
  await page.getByRole('button', { name: 'ลบตัวเลข' }).click();
  await page.getByRole('button', { name: 'ลบตัวเลข' }).click();
  await page.getByRole('button', { name: 'ลบตัวเลข' }).click(); // ลบตอนว่าง ไม่พัง
  expect(await typed(page)).toBe('');
  await expect(submit).toBeDisabled();
  await keyButton(page, '0').click();
  expect(await typed(page)).toBe('0');
  await keyButton(page, '5').click();
  expect(await typed(page), '0 นำหน้าถูกแทนที่').toBe('5');
  // คีย์บอร์ดจริง
  await page.keyboard.press('Backspace');
  await page.keyboard.type('9');
  expect(await typed(page)).toBe('9');
  await page.keyboard.type('87');
  expect(await typed(page)).toBe('987');
  await page.keyboard.type('6');
  expect(await typed(page)).toBe('987');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ลบตัวเลข' }).click();
  await page.keyboard.type('3');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/)).toBeVisible();
  await tick(page, 1000);
  const db = await readDbWhen(page, 6);
  const ans = byType(db.events, 'item.answered').find((e) => e.itemId === '2.1');
  expect(ans?.response).toBe(3);
  expect(ans?.correct).toBe(true);
});

test('TC-06c คีย์บอร์ดจริง: แอปต้อง preventDefault ให้ Backspace/Enter เพื่อไม่ให้เบราว์เซอร์ย้อนกลับหน้า (Tech §3.2)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await guardWait(page);
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible();
  // ตัวฟังของ Tester ลงทะเบียนทีหลังของแอป จึงเห็นค่า defaultPrevented หลังแอปทำงานแล้ว
  await page.evaluate(() => {
    const w = window as unknown as { __kd: Record<string, boolean> };
    w.__kd = {};
    window.addEventListener('keydown', (e) => {
      w.__kd[e.key] = e.defaultPrevented;
    });
  });
  await page.keyboard.press('5');
  await page.keyboard.press('Backspace');
  const kd = await page.evaluate(
    () => (window as unknown as { __kd: Record<string, boolean> }).__kd,
  );
  expect(kd['Backspace'], 'Backspace ต้อง preventDefault (WebKit ใช้เป็นปุ่มย้อนกลับ)').toBe(true);
});

test('TC-06b แป้นตัวเลข: แตะด้วยนิ้ว (touch) พิมพ์และส่งคำตอบได้', async ({ page }) => {
  test.skip(!isTouchProject(), 'เฉพาะ project ที่เป็นอุปกรณ์สัมผัส');
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).tap();
  await guardWait(page);
  await keyButton(page, '3').tap();
  expect(await typed(page)).toBe('3');
  await page.getByRole('button', { name: 'ตอบ', exact: true }).tap();
  await expect(page.getByText(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/)).toBeVisible();
});

// =============================================================== B. แฟลช ten-frame

interface FlashSnap {
  text: string;
  visible: string | null;
  circles: number;
  lines: number;
  fills: string[];
  ys: number[];
  xs: number[];
  keysEnabled: number;
  box: { w: number; h: number };
  opacity: number;
  label: string | null;
}
async function flashSnap(page: Page): Promise<FlashSnap> {
  const frame = page.getByTestId('ten-frame');
  const geo = await frame.evaluate((svg) => {
    const circles = Array.from(svg.querySelectorAll('circle'));
    const r = svg.getBoundingClientRect();
    return {
      circles: circles.length,
      lines: svg.querySelectorAll('line').length,
      fills: circles.map((c) => getComputedStyle(c).fill),
      ys: circles.map((c) => Number(c.getAttribute('cy'))),
      xs: circles.map((c) => Number(c.getAttribute('cx'))),
      box: { w: r.width, h: r.height },
      opacity: parseFloat(getComputedStyle(svg).opacity),
      label: svg.getAttribute('aria-label'),
    };
  });
  const keysEnabled = await page
    .locator('main button:visible')
    .evaluateAll(
      (els) =>
        els.filter(
          (e) => /^\d$/.test((e.textContent ?? '').trim()) && !(e as HTMLButtonElement).disabled,
        ).length,
    );
  return {
    text: await firstLine(page),
    visible: await frame.getAttribute('data-visible'),
    keysEnabled,
    ...geo,
  };
}

/** ตรวจว่าจุดเรียงแถวบนก่อนจากซ้ายไปขวา แล้วแถวล่างจากซ้าย (LS §4 ด่าน 1) */
function expectStandardLayout(s: FlashSnap, n: number): void {
  expect(s.circles).toBe(n);
  const pts = s.xs.map((x, i) => ({ x, y: s.ys[i] ?? 0 }));
  const rowsY = [...new Set(pts.map((p) => p.y))].sort((a, b) => a - b);
  const top = pts.filter((p) => p.y === rowsY[0]);
  const bottom = pts.filter((p) => p.y === rowsY[1]);
  expect(top).toHaveLength(Math.min(n, 5));
  expect(bottom).toHaveLength(Math.max(0, n - 5));
  const cols = [...new Set(top.map((p) => p.x))].sort((a, b) => a - b);
  expect(cols).toHaveLength(5);
  const bottomXs = bottom.map((p) => p.x).sort((a, b) => a - b);
  expect(bottomXs).toEqual(cols.slice(0, bottom.length));
}

for (const reduce of [false, true]) {
  test(`TC-07${reduce ? 'b' : 'a'} แฟลช ten-frame ${reduce ? 'โหมด reduced motion' : 'ปกติ'}: จังหวะ 900/1500 ms จำนวนจุด สีเดียว แป้นล็อก ไม่มีปุ่มดูซ้ำ (AC4)`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
    await installClock(page);
    await beginSession(page);
    await pauseClock(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    const hideAt = reduce ? 2400 : 2550; // ภาพหาย + เปิดแป้น (Tech Spec §3.1)
    for (const it of ITEMS.slice(0, 4)) {
      const n = it.dots ?? 0;
      const ctx = `ข้อ ${it.id}`;
      // t = 0 และ 899: "พร้อมนะ..." การ์ดเปล่า ไม่มีเส้นช่อง ไม่มีจุด
      let s = await flashSnap(page);
      const blankBox = s.box;
      expect(s.text, ctx).toBe('พร้อมนะ...');
      expect([s.visible, s.circles, s.lines], ctx).toEqual(['false', 0, 0]);
      expect(s.keysEnabled, `${ctx} แป้นต้องล็อกระหว่างแฟลช`).toBe(0);
      expect(s.label).toBe('ตาราง 10 ช่อง');
      await tick(page, 899);
      s = await flashSnap(page);
      expect(s.text, `${ctx} t=899`).toBe('พร้อมนะ...');
      expect(s.circles).toBe(0);
      await tick(page, 1);
      // t = 900: เริ่มแฟลช
      s = await flashSnap(page);
      expect(s.text, `${ctx} t=900`).toBe('ดู!');
      expect(s.visible).toBe('true');
      expectStandardLayout(s, n);
      expect(new Set(s.fills).size, 'จุดทุกจุดสีเดียว').toBe(1);
      expect(s.lines).toBeGreaterThan(0);
      expect(s.box.w).toBeCloseTo(blankBox.w, 0);
      expect(s.box.h).toBeCloseTo(blankBox.h, 0);
      expect(s.label, 'aria-label ห้ามบอกจำนวนจุด').toBe('ตาราง 10 ช่อง');
      // ระหว่างแฟลช พิมพ์ไม่ได้
      await page.keyboard.type('5');
      expect(await typed(page)).toBe('');
      // ไม่มีปุ่มดูซ้ำ: ปุ่มที่เห็นมีแต่แป้น
      expect(await page.locator('main button:visible').count()).toBe(12);
      await tick(page, 1499); // t = 2399
      await page.waitForTimeout(250); // CSS transition ของ fade-in วิ่งตามเวลาจริง
      s = await flashSnap(page);
      expect(s.text, `${ctx} t=2399`).toBe('ดู!');
      expectStandardLayout(s, n);
      expect(s.opacity).toBe(1);
      expect(s.keysEnabled).toBe(0);
      await tick(page, 1); // t = 2400
      s = await flashSnap(page);
      if (reduce) {
        // reduced motion: ซ่อนทันทีที่ 1500 ms (เวลาแสดงเท่าเดิม ไม่มี fade)
        expect(s.text, `${ctx} t=2400`).toBe('ซ่อนแล้ว! กี่จุดนะ?');
        expect([s.visible, s.circles, s.lines]).toEqual(['false', 0, 0]);
        expect(s.keysEnabled).toBe(10);
      } else {
        expect(s.text, `${ctx} t=2400 (กำลัง fade-out)`).toBe('ดู!');
        expect(s.keysEnabled).toBe(0);
        await tick(page, 148); // t = 2548
        await page.waitForTimeout(250); // CSS transition วิ่งตามเวลาจริง
        s = await flashSnap(page);
        expect(s.text, `${ctx} t=2548`).toBe('ดู!');
        expect(s.opacity, 'fade-out จบแล้ว').toBeLessThan(0.05);
        expect(s.keysEnabled).toBe(0);
        await tick(page, 2); // t = 2550
        s = await flashSnap(page);
        expect(s.text, `${ctx} t=2550`).toBe('ซ่อนแล้ว! กี่จุดนะ?');
        expect([s.visible, s.circles, s.lines]).toEqual(['false', 0, 0]);
        expect(s.keysEnabled).toBe(10);
      }
      expect(s.box.w).toBeCloseTo(blankBox.w, 0);
      expect(s.box.h).toBeCloseTo(blankBox.h, 0);
      void hideAt;
      // หลังซ่อนไม่แฟลชซ้ำ และพิมพ์ได้
      await tick(page, 3000);
      s = await flashSnap(page);
      expect(s.circles, 'ไม่แฟลชซ้ำ').toBe(0);
      expect(s.text).toBe('ซ่อนแล้ว! กี่จุดนะ?');
      await typeAnswer(page, String(n), 'tap');
      expect(await typed(page)).toBe(String(n));
      await submitAnswer(page, 'tap');
      await tick(page, 1000);
    }
  });
}

test('TC-08 แฟลชในเวลาจริง (วัดจาก DOM): "พร้อมนะ..." ≈ 900 ms, ภาพอยู่ ≈ 1650 ms, จุดครบ (AC4)', async ({
  page,
}) => {
  await beginSession(page); // ไม่ใช้นาฬิกาปลอม
  await page.evaluate(() => {
    const w = window as unknown as { __m: Array<{ t: number; s: string }> };
    w.__m = [];
    const rec = (): void => {
      const main = document.querySelector('main');
      const first = ((main?.innerText ?? '').split('\n')[0] ?? '').trim();
      const tf = document.querySelector('[data-testid="ten-frame"]');
      const dots = document.querySelectorAll('[data-testid="ten-frame"] circle').length;
      w.__m.push({
        t: performance.now(),
        s: `${first}|${tf?.getAttribute('data-visible') ?? ''}|${dots}`,
      });
    };
    new MutationObserver(rec).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    rec();
  });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible({ timeout: 6000 });
  const marks = await page.evaluate(
    () => (window as unknown as { __m: Array<{ t: number; s: string }> }).__m,
  );
  const first = (prefix: string): { t: number; s: string } => {
    const m = marks.find((x) => x.s.startsWith(prefix));
    if (!m) throw new Error(`no mark ${prefix}: ${JSON.stringify(marks)}`);
    return m;
  };
  const ready = first('พร้อมนะ...');
  const show = first('ดู!|true');
  const hidden = first('ซ่อนแล้ว! กี่จุดนะ?');
  expect(show.s).toBe('ดู!|true|7');
  expect(hidden.s).toBe('ซ่อนแล้ว! กี่จุดนะ?|false|0');
  const readyMs = show.t - ready.t;
  const showMs = hidden.t - show.t;
  test.info().annotations.push({
    type: 'measured',
    description: `ready=${readyMs.toFixed(0)}ms show=${showMs.toFixed(0)}ms`,
  });
  expect(readyMs).toBeGreaterThan(850);
  expect(readyMs).toBeLessThan(1100);
  expect(showMs).toBeGreaterThan(1600);
  expect(showMs).toBeLessThan(1850);
});

test('TC-09 หน้าของลูกไม่มีปุ่มดูซ้ำ/ย้อน/แก้ไข และพิมพ์ระหว่าง ack ไม่มีผลกับข้อถัดไป (Tech §9)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await guardWait(page);
  await keyButton(page, '3').click();
  await submitAnswer(page, 'tap');
  await expect(page.getByText(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/)).toBeVisible();
  // ระหว่าง ack: กดเลข/Enter ไม่มีผล ไม่ข้ามข้อ
  await page.keyboard.type('66');
  await page.keyboard.press('Enter');
  await tick(page, 1000);
  await expect(page.getByText('4 + ? = 10', { exact: true })).toBeVisible();
  expect(await typed(page)).toBe('');
  const buttons = await page.locator('main button:visible').allInnerTexts();
  expect(buttons.map((b) => b.trim())).toEqual([
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '⌫',
    '0',
    'ตอบ',
  ]);
  expect(await page.locator('main a:visible').count()).toBe(0);
  const db = await readDbWhen(page, 6);
  expect(byType(db.events, 'item.answered')).toHaveLength(5);
});

// =============================================================== C. ประสบการณ์ของลูก

async function kidObserve(
  label: string,
  page: Page,
  sizes: Array<{ label: string; name: string; w: number; h: number }>,
  scrollFails: string[],
): Promise<void> {
  if (label !== 'kid-intro') await expectNoFeedback(page, label);
  if (!(await noHorizontalScroll(page))) scrollFails.push(label);
  const b = await smallestButton(page);
  if (b) sizes.push({ label, ...b });
}

for (const width of [null, 360] as const) {
  test(`TC-10${width ? 'b' : 'a'} ทั้งภารกิจ${width ? ' ที่ 360px' : ' ที่ขนาดจอของ project'}: ไม่มีเวลา/คะแนน/ถูกผิด/progress, ไม่มี scroll แนวนอน, ปุ่ม ≥ 48px, ไม่มี error, ไม่มี request ภายนอก (AC5, AC13)`, async ({
    page,
  }) => {
    test.skip(width === 360 && projectName() !== 'desktop', DESKTOP_ONLY);
    const w = watch(page);
    // ไม่มีเสียง/การสั่นเลย (Tech §9 ห้ามต่างกันตามถูก/ผิด ตรวจแบบเข้มว่าไม่มีใช้)
    await page.addInitScript(() => {
      const g = window as unknown as { __fx: string[] };
      g.__fx = [];
      navigator.vibrate = () => {
        g.__fx.push('vibrate');
        return true;
      };
      const AC = (window as unknown as { AudioContext?: new () => unknown }).AudioContext;
      if (AC) {
        (window as unknown as { AudioContext: unknown }).AudioContext = function () {
          g.__fx.push('AudioContext');
        };
      }
      HTMLMediaElement.prototype.play = function () {
        g.__fx.push('media.play');
        return Promise.resolve();
      };
    });
    if (width) await page.setViewportSize({ width, height: 740 });
    const sizes: Array<{ label: string; name: string; w: number; h: number }> = [];
    const scrollFails: string[] = [];
    let labels = 0;
    await fullRun(
      page,
      {},
      {
        observe: async (label, pg) => {
          labels++;
          await kidObserve(label, pg, sizes, scrollFails);
        },
      },
    );
    expect(labels).toBe(58); // 5 เปิดด่าน + 4 แฟลช + 20 ข้อ + 20 ack + 8 วิธีคิด + 1 หน้าจบ
    expect(scrollFails, 'หน้าที่มี scroll แนวนอน').toEqual([]);
    // ปุ่มโลโก้ (ทางเข้าของพ่อ) ไม่ใช่ปุ่มของลูก วัดแยกและรายงานเป็นข้อสังเกต
    const logo = await logoSize(page);
    test.info().annotations.push({ type: 'logo-size', description: JSON.stringify(logo) });
    const small = sizes.filter((s) => s.h < 48 || s.w < 48);
    expect(small, 'ปุ่มที่เล็กกว่า 48px').toEqual([]);
    // หน้าผลของพ่อและหน้าเล่นต้องไม่ scroll แนวนอนของทั้งหน้า
    expect(await noHorizontalScroll(page)).toBe(true);
    expect(w.errors).toEqual([]);
    expect(w.external, 'ต้องไม่มี request ออกนอก localhost:4173').toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __fx: string[] }).__fx)).toEqual([]);
    expect(await page.locator('audio, video').count()).toBe(0);
  });
}

test('TC-11 หน้าของลูกหน้าตาเหมือนกันไม่ว่าตอบถูกหรือผิด (สี/คลาส/ข้อความ/ack) (AC6, LS §12 #3)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const collect = async (plan: Plan): Promise<Record<string, { text: string; sig: string }>> => {
    const out: Record<string, { text: string; sig: string }> = {};
    const acks: string[] = [];
    await runSession(page, plan, {
      acks,
      observe: async (label, pg) => {
        out[label] = { text: await mainText(pg), sig: await visualSignature(pg) };
      },
    });
    out['acks'] = { text: acks.slice(0, 16).join('|'), sig: '' };
    return out;
  };
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  const good = await collect({});
  await openResults(page);
  await page.getByRole('button', { name: 'ทำใหม่อีกครั้ง' }).click();
  await passParentIntro(page);
  await startMission(page);
  const bad = await collect(SCENARIOS.find((s) => s.code === 'S15')?.plan ?? {});
  const common = Object.keys(good).filter((l) => l in bad);
  // ด่าน 1–4 (16 ข้อ) + หน้าเปิดด่าน 1–4 + ack + วิธีคิด + หน้าจบ ต้องมีให้เทียบครบ
  expect(common.length).toBeGreaterThan(40);
  for (const l of common) {
    expect(bad[l]?.text, `ข้อความหน้า ${l}`).toBe(good[l]?.text);
    expect(bad[l]?.sig, `สี/คลาสหน้า ${l}`).toBe(good[l]?.sig);
  }
});

test('TC-12 dark mode: ความเปรียบต่างของข้อความ ≥ WCAG AA ทุกหน้าของลูกและหน้าผล (AC13)', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const problems: string[] = [];
  await fullRun(
    page,
    {},
    {
      observe: async (label, pg) => {
        if (
          /^(stage-intro-[1-5]|item-1\.1|item-2\.1|ack-2\.1|strategy-3\.3|strategy-5\.3|kid-end|flash-show-1\.1)$/.test(
            label,
          )
        ) {
          for (const p of await lowContrast(pg)) problems.push(`${label}: ${p}`);
        }
      },
    },
  );
  for (const p of await lowContrast(page)) problems.push(`results: ${p}`);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg, 'พื้นหลังต้องเป็นสีเข้ม').toBe('rgb(18, 26, 22)');
  expect(problems).toEqual([]);
});

test('TC-12b dark mode: จุดใน ten-frame เห็นชัดบนพื้นการ์ด (ความเปรียบต่าง ≥ 3:1)', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await tick(page, 900);
  const ratio = await page.getByTestId('ten-frame').evaluate((svg) => {
    const parse = (c: string): number[] =>
      (/rgba?\(([^)]+)\)/.exec(c)?.[1] ?? '0,0,0').split(/[\s,/]+/).map(Number);
    const lin = (v: number): number => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const lum = (c: number[]): number =>
      0.2126 * lin(c[0] ?? 0) + 0.7152 * lin(c[1] ?? 0) + 0.0722 * lin(c[2] ?? 0);
    const dot = parse(getComputedStyle(svg.querySelector('circle') as Element).fill);
    let bgEl: Element | null = svg;
    let bg = [0, 0, 0, 0];
    while (bgEl) {
      bg = parse(getComputedStyle(bgEl).backgroundColor);
      if ((bg[3] ?? 1) > 0) break;
      bgEl = bgEl.parentElement;
    }
    // การ์ดของ ten-frame (rect เต็มกรอบ ถ้ามี) ไม่มีใน hidden mode จึงเทียบกับพื้นของหน้า
    const l1 = lum(dot);
    const l2 = lum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(3);
});

test('TC-13 หมุนจอ แนวตั้ง/แนวนอน: ภาพแฟลชอยู่ในจอ ไม่มี scroll แนวนอน ค่าที่พิมพ์ค้างอยู่หลังหมุน (AC13, §6.5)', async ({
  page,
}) => {
  test.skip(projectName() === 'desktop', 'เฉพาะอุปกรณ์พกพา/แท็บเล็ต');
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  const vp = page.viewportSize() ?? { width: 800, height: 600 };
  const orient = [
    { width: vp.width, height: vp.height },
    { width: vp.height, height: vp.width },
  ];
  const problems: string[] = [];
  // ภาพแฟลชต้องอยู่ในจอทั้งภาพโดยไม่ต้อง scroll ทั้ง 2 ทิศทาง
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await tick(page, 900);
  for (const o of orient) {
    await page.setViewportSize(o);
    await page.waitForTimeout(150);
    const box = await page.getByTestId('ten-frame').boundingBox();
    const inView =
      !!box &&
      box.y >= 0 &&
      box.y + box.height <= o.height &&
      box.x >= 0 &&
      box.x + box.width <= o.width;
    if (!inView) problems.push(`flash ${o.width}x${o.height} box=${JSON.stringify(box)}`);
    if (!(await noHorizontalScroll(page))) problems.push(`flash ${o.width}x${o.height} h-scroll`);
  }
  await page.setViewportSize(orient[0] as { width: number; height: number });
  // รอบใหม่: ไปถึงหน้าวิธีคิด แล้วหมุน
  await page.goto('./');
  await openDx(page);
  await passParentIntro(page);
  await startMission(page);
  await runSession(page, {}, { stopAtStrategyOf: '3.3' });
  for (const o of [...orient, orient[0] as { width: number; height: number }]) {
    await page.setViewportSize(o);
    await page.waitForTimeout(150);
    if (!(await noHorizontalScroll(page)))
      problems.push(`strategy ${o.width}x${o.height} h-scroll`);
    await expect(page.getByText('หนูคิดข้อนี้ยังไง?')).toBeVisible();
  }
  await page.locator('main button:visible').filter({ hasText: 'จำได้เลย' }).click();
  await expect(page.getByText('7 + 8 = ?', { exact: true })).toBeVisible();
  await guardWait(page);
  await keyButton(page, '1').click();
  for (const o of [...orient, orient[0] as { width: number; height: number }]) {
    await page.setViewportSize(o);
    await page.waitForTimeout(150);
    if (!(await noHorizontalScroll(page))) problems.push(`item ${o.width}x${o.height} h-scroll`);
    if ((await typed(page)) !== '1') problems.push(`item ${o.width}x${o.height} ค่าที่พิมพ์หาย`);
    const box = await page.getByRole('button', { name: 'ตอบ', exact: true }).boundingBox();
    test.info().annotations.push({
      type: `keypad ${o.width}x${o.height}`,
      description: `ปุ่ม "ตอบ" y=${Math.round(box?.y ?? -1)}..${Math.round((box?.y ?? 0) + (box?.height ?? 0))} สูงจอ=${o.height}`,
    });
  }
  expect(problems).toEqual([]);
});

// =============================================================== D. ข้อมูลที่บันทึก

interface Meta {
  skill: string;
  steps: number[];
  setId?: string;
}
function metaOf(id: string): Meta {
  const it = ITEM_BY_ID[id];
  if (!it) throw new Error(id);
  const skill =
    it.stage === 1
      ? 'add.subitize-10'
      : it.stage === 2
        ? 'add.bonds-10'
        : it.stage === 3
          ? 'add.doubles'
          : it.stage === 4
            ? 'add.make-10'
            : it.id === '5.1' || it.id === '5.2'
              ? 'add.tens'
              : 'add.2digit';
  const steps = it.stage <= 4 ? [it.stage] : it.id === '5.3' ? [6, 7] : it.id === '5.4' ? [8] : [5];
  const setId = it.set === 'A' ? 'add.single-digit' : it.set === 'B' ? 'add.two-digit' : undefined;
  return setId ? { skill, steps, setId } : { skill, steps };
}
function problemOf(id: string): Record<string, unknown> {
  const it = ITEM_BY_ID[id];
  if (!it) throw new Error(id);
  if (it.dots) return { kind: 'subitize', count: it.dots, visual: 'ten-frame' };
  const m1 = /^(\d+) \+ (\d+) = \?$/.exec(it.text ?? '');
  if (m1) return { kind: 'arith', op: '+', a: Number(m1[1]), b: Number(m1[2]) };
  const m2 = /^(\d+) \+ \? = (\d+)$/.exec(it.text ?? '');
  if (m2) return { kind: 'missing-part', whole: Number(m2[2]), part: Number(m2[1]) };
  throw new Error(`cannot parse ${it.text}`);
}

test('TC-20 (IndexedDB + export) event ครบ/ไม่ซ้ำ: 1 started + 20 answered + 1 completed, field ตาม Tech §6, ความหน่วงตรงกับที่เดินจริง (AC8, AC11, §6.4)', async ({
  page,
}) => {
  const plan: Plan = {};
  ITEMS.forEach((it, i) => {
    plan[it.id] = { ms: 500 + 137 * i };
  });
  await fullRun(page, plan);
  const db = await readDbWhen(page, 22);
  // นับเป๊ะ (dev = StrictMode ต้องได้เท่ากัน)
  expect(db.events).toHaveLength(22);
  expect(byType(db.events, 'session.started')).toHaveLength(1);
  expect(byType(db.events, 'item.answered')).toHaveLength(20);
  expect(byType(db.events, 'session.completed')).toHaveLength(1);
  expect(byType(db.events, 'session.abandoned')).toHaveLength(0);
  expect(new Set(db.events.map((e) => e.id)).size, 'id ห้ามซ้ำ').toBe(22);
  expect(new Set(db.events.map((e) => e.sessionId)).size).toBe(1);
  expect(db.learners).toHaveLength(1);
  const learnerId = db.learners[0]?.id;
  for (const e of db.events) {
    expect(e.schemaVersion).toBe(1);
    expect(e.learnerId).toBe(learnerId);
    expect(e.activityId).toBe('DX-ADD');
    expect(Number.isNaN(Date.parse(e.at))).toBe(false);
  }
  const started = byType(db.events, 'session.started')[0] as Ev;
  expect(started.activityVersion).toBe('DX-ADD v2');
  expect(started.activityKind).toBe('diagnostic');
  const answered = byType(db.events, 'item.answered');
  expect(answered.map((e) => e.itemId).sort()).toEqual(ITEMS.map((i) => i.id).sort());
  for (const it of ITEMS) {
    const e = answered.find((x) => x.itemId === it.id) as Ev;
    const m = metaOf(it.id);
    const ms = plan[it.id]?.ms ?? 0;
    expect(e.type).toBe('item.answered');
    expect(e.stageId).toBe(`s${it.stage}`);
    expect(e.ladderSteps).toEqual(m.steps);
    expect(e.skillId).toBe(m.skill);
    expect(e.problem).toEqual(problemOf(it.id));
    expect(e.expected).toBe(it.expected);
    expect(e.response).toBe(it.expected);
    expect(e.correct).toBe(true);
    expect(e.misconceptionId ?? null).toBeNull();
    expect(e.attemptNo).toBe(1);
    expect(e.latencyValid).toBe(true);
    expect(Number.isInteger(e.latencyMs)).toBe(true);
    // ความหน่วง = เวลาที่เดินหลังตอบได้ (ข้อแฟลช = หลังภาพหาย)
    expect(Math.abs((e.latencyMs as number) - ms), `latency ข้อ ${it.id}`).toBeLessThanOrEqual(2);
    if (it.fluentMs) {
      expect(e.fluentMs).toBe(it.fluentMs);
      expect(e.fluent).toBe(true);
    } else {
      expect(e.fluentMs ?? null).toBeNull();
      expect(e.fluent).toBeNull();
    }
    if (m.setId) {
      expect(e.strategySetId).toBe(m.setId);
      expect(e.strategyId).toBe(it.id === '5.3' ? 'column' : it.id === '5.4' ? 'round' : 'known');
    } else {
      expect(e.strategyId ?? null).toBeNull();
    }
  }
  const done = byType(db.events, 'session.completed')[0] as Ev;
  expect(done.activityVersion).toBe('DX-ADD v2');
  const summary = done.summary as Record<string, unknown>;
  expect(summary.kind).toBe('diagnostic');
  expect(summary.completion).toBe('complete');
  expect(summary.skippedStageIds).toEqual([]);
  expect((summary.stages as unknown[]).length).toBe(5);
  expect((summary.groups as unknown[]).length).toBe(3);
  expect(summary.misconceptions).toEqual([]);
  expect((summary.recommendation as Record<string, unknown>).kind).toBe('step');
  expect((summary.recommendation as Record<string, unknown>).ladderStep).toBe(9);
  // เวลาเริ่มก่อนเวลาจบ
  expect(Date.parse(started.at)).toBeLessThan(Date.parse(done.at));
  // ไฟล์ export ต้องมีชุดเดียวกับ IndexedDB (AC11)
  const { json } = await doExport(page);
  expect(json.events).toHaveLength(22);
  expect(json.events.map((e) => e.id).sort()).toEqual(db.events.map((e) => e.id).sort());
  expect(byType(json.events, 'item.answered')).toHaveLength(20);
  expect(byType(json.events, 'session.started')).toHaveLength(1);
  expect(byType(json.events, 'session.completed')).toHaveLength(1);
});

test('TC-21 ข้อมูลและหน้าผลยังอยู่หลัง reload และเปิดแท็บใหม่ (AC9, §6.4)', async ({
  page,
  context,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await fullRun(page);
  const url = page.url();
  expect(url).toMatch(/#\/parent\/results\/[0-9a-f-]{36}$/);
  const before = await readDbWhen(page, 22);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
  expect(await recommendedStep(page)).toBe(9);
  expect(await itemRows(page)).toHaveLength(20);
  const after = await readDb(page);
  expect(after.events.map((e) => e.id).sort()).toEqual(before.events.map((e) => e.id).sort());
  // ปิดแล้วเปิดใหม่ (แท็บใหม่ context เดิม)
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
  expect(await recommendedStep(p2)).toBe(9);
  expect(await itemRows(p2)).toHaveLength(20);
  expect((await readDb(p2)).events).toHaveLength(22);
  await p2.close();
});

test('TC-22 export ตรงกับ IndexedDB, ชื่อไฟล์ถูก, import ไฟล์เดิมซ้ำแล้วไม่ซ้ำ (AC11, §6.4)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await fullRun(page);
  const db = await readDbWhen(page, 22);
  const { json, name, path } = await doExport(page);
  expect(name).toMatch(/^math-learning-\d{8}-\d{4}\.export\.json$/);
  expect(json.app).toBe('math-learning');
  expect(json.schemaVersion).toBe(1);
  expect(json.learners).toHaveLength(1);
  expect(json.events).toHaveLength(22);
  expect(json.events.map((e) => e.id).sort()).toEqual(db.events.map((e) => e.id).sort());
  const sid = (byType(json.events, 'session.started')[0] as Ev).sessionId;
  expect(byType(json.events, 'item.answered')).toHaveLength(20);
  expect(byType(json.events, 'session.completed')[0]?.sessionId).toBe(sid);
  expect(byType(json.events, 'session.started')[0]?.activityVersion).toBe('DX-ADD v2');
  for (const e of json.events) expect(e).toEqual(db.events.find((x) => x.id === e.id));
  // import ไฟล์เดิมซ้ำ
  await page.getByRole('link', { name: 'กลับหน้าสำหรับพ่อ' }).click();
  await expect(page.getByRole('heading', { name: 'หน้าสำหรับพ่อ' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(
    page.getByText('นำเข้าแล้ว: ผู้เรียนใหม่ 0 คน, รายการใหม่ 0 รายการ, ซ้ำ 22, เสีย 0'),
  ).toBeVisible();
  expect((await readDb(page)).events).toHaveLength(22);
  // หน้าพ่อมีส่วน "ผลแบบทดสอบ" และแสดงครั้งนี้
  await expect(page.getByRole('heading', { name: 'ผลแบบทดสอบ' })).toBeVisible();
  await expect(page.getByRole('link', { name: /ขั้นที่ 9/ })).toBeVisible();
});

test('TC-23 import ไฟล์ผลเข้าเครื่องใหม่: ข้อมูลครบ เปิดผลย้อนหลังได้ (AC12, §6.4)', async ({
  page,
  browser,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await fullRun(page);
  const { path, json } = await doExport(page);
  const sid = (byType(json.events, 'session.started')[0] as Ev).sessionId;
  const ctx2 = await browser.newContext({
    baseURL: 'http://localhost:4173/Learning-Platform/',
    locale: 'th-TH',
    serviceWorkers: 'block',
  });
  const p2 = await ctx2.newPage();
  await openApp(p2, 'เครื่องสอง');
  await p2.goto('./#/parent');
  await expect(p2.getByRole('heading', { name: 'หน้าสำหรับพ่อ' })).toBeVisible();
  await p2.locator('input[type="file"]').setInputFiles(path);
  await expect(
    p2.getByText(/นำเข้าแล้ว: ผู้เรียนใหม่ 1 คน, รายการใหม่ 22 รายการ, ซ้ำ 0, เสีย 0/),
  ).toBeVisible();
  expect((await readDb(p2)).events).toHaveLength(22);
  await p2.goto(`./#/parent/results/${sid}`);
  await expect(p2.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
  expect(await recommendedStep(p2)).toBe(9);
  expect(await itemRows(p2)).toHaveLength(20);
  await ctx2.close();
});

test('TC-24 ซ่อนแท็บระหว่างตอบ: latencyValid=false, ถูกถือว่าคล่อง, ผิดไม่คล่อง, เวลาไม่นับในค่าเฉลี่ย, มี footnote (AC8, LS §6)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await guardWait(page);
  const submit = async (digits: string): Promise<void> => {
    await typeAnswer(page, digits, 'tap');
    await submitAnswer(page, 'tap');
  };
  // 2.1: ซ่อนระหว่างตอบ นาน 10 วินาที ตอบถูก
  await setVisibility(page, 'hidden');
  await tick(page, 10_000);
  await setVisibility(page, 'visible');
  await submit('3');
  await tick(page, 1000);
  // 2.2: ซ่อนแล้วตอบผิด (5 = M5)
  await tick(page, 100);
  await setVisibility(page, 'hidden');
  await tick(page, 8000);
  await setVisibility(page, 'visible');
  await submit('5');
  // 2.3: หน้าถูกซ่อนอยู่ตั้งแต่ก่อนเริ่มข้อ (ระหว่าง ack)
  await setVisibility(page, 'hidden');
  await tick(page, 1000);
  await tick(page, 6000);
  await setVisibility(page, 'visible');
  await submit('2');
  await tick(page, 1000);
  // 2.4: ปกติ 500 ms
  await tick(page, 500);
  await submit('7');
  await tick(page, 1000);
  const db = await readDbWhen(page, 6);
  const ev = (id: string): Ev =>
    byType(db.events, 'item.answered').find((e) => e.itemId === id) as Ev;
  expect(ev('2.1').latencyValid).toBe(false);
  expect(ev('2.1').correct).toBe(true);
  expect(ev('2.1').fluent, 'ถูกแต่เวลาใช้ไม่ได้ = คล่อง').toBe(true);
  expect(ev('2.2').latencyValid).toBe(false);
  expect(ev('2.2').fluent).toBe(false);
  expect(ev('2.2').misconceptionId).toBe('M5');
  expect(ev('2.3').latencyValid, 'ซ่อนอยู่ก่อนเริ่มข้อ').toBe(false);
  expect(ev('2.3').fluent).toBe(true);
  expect(ev('2.4').latencyValid).toBe(true);
  expect(ev('2.4').fluent).toBe(true);
  // ทำต่อให้จบเพื่อดูหน้าผล
  await runSession(page, {}, { startAt: '3.1' });
  await openResults(page);
  const rows = await itemRows(page);
  const r = (id: string) => rows.find((x) => x.id === id);
  for (const id of ['2.1', '2.2', '2.3'])
    expect(r(id)?.time, `เวลาข้อ ${id}`).toMatch(/^\d+\.\d \*$/);
  expect(r('2.4')?.time).toBe('0.5');
  expect(r('2.1')?.fluent).toBe('ใช่');
  expect(r('2.2')?.fluent).toBe('ไม่');
  await expect(page.getByText('* สลับแอปหรือหยุดระหว่างข้อนี้ ไม่นำเวลามาคิด')).toBeVisible();
  const sr = (await stageRows(page)).find((x) => x.label.startsWith('ด่าน 2'));
  expect(sr?.cells[1], 'เวลาเฉลี่ยรวมเฉพาะข้อที่เวลาใช้ได้').toBe('0.5');
});

test('TC-25 ซ่อนแท็บระหว่างแฟลช: flashInterrupted=true ไม่แฟลชซ้ำ ไม่กระทบเวลา/ผลประเมิน (D8)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await tick(page, 900);
  await tick(page, 100); // อยู่ในช่วงแสดงภาพ
  await setVisibility(page, 'hidden');
  await tick(page, 300);
  await setVisibility(page, 'visible');
  await tick(page, 1250); // t = 2550
  await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible();
  expect((await flashSnap(page)).circles, 'ไม่แฟลชซ้ำ').toBe(0);
  await tick(page, 400);
  await typeAnswer(page, '7', 'tap');
  await submitAnswer(page, 'tap');
  await tick(page, 1000);
  // ข้อ 1.2 ปกติ
  await tick(page, 900);
  await tick(page, 1650);
  await typeAnswer(page, '9', 'tap');
  await submitAnswer(page, 'tap');
  const db = await readDbWhen(page, 3);
  const ev = (id: string): Ev =>
    byType(db.events, 'item.answered').find((e) => e.itemId === id) as Ev;
  expect(ev('1.1').flashInterrupted).toBe(true);
  expect(ev('1.1').latencyValid, 'ซ่อนตอนแฟลช ไม่ใช่ตอนตอบ').toBe(true);
  expect(Math.abs((ev('1.1').latencyMs as number) - 400)).toBeLessThanOrEqual(2);
  expect(ev('1.2').flashInterrupted === true).toBe(false);
});

test('TC-26 ความเป็นส่วนตัว: เก็บเฉพาะชื่อเล่น ไม่มีข้อมูลส่วนตัวอื่นใน DB/export/localStorage/คุกกี้ (§6.6)', async ({
  page,
  context,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await fullRun(page);
  const db = await readDbWhen(page, 22);
  expect(Object.keys(db.learners[0] ?? {}).sort()).toEqual(['createdAt', 'id', 'nickname']);
  expect(db.learners[0]?.nickname).toBe('ทดสอบ');
  expect(JSON.stringify(db.events)).not.toContain('ทดสอบ');
  const { json } = await doExport(page);
  expect(Object.keys(json).sort()).toEqual([
    'app',
    'events',
    'exportedAt',
    'learners',
    'schemaVersion',
  ]);
  const ls = await page.evaluate(() => Object.keys(localStorage));
  expect(ls.filter((k) => k !== 'lp.theme')).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

// =============================================================== E. ความถูกต้องของการตัดสิน

test('TC-30 เฉลยทุกข้อ: แอปนับถูก/โจทย์ตรงกับที่คิดเอง และเฉลยคำนวณจากโจทย์ที่แสดงจริง (AC1, §6.2)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await fullRun(page);
  const rows = await itemRows(page);
  expect(rows).toHaveLength(20);
  for (const it of ITEMS) {
    const r = rows.find((x) => x.id === it.id);
    expect(r, `ข้อ ${it.id}`).toBeTruthy();
    // คิดเฉลยใหม่จากโจทย์ที่แสดงบนหน้า
    let recomputed: number;
    if (it.dots) {
      expect(r?.problem).toBe(`แฟลช ${it.dots} จุด`);
      recomputed = Number(/(\d+)/.exec(r?.problem ?? '')?.[1]);
    } else {
      const a = /^(\d+) \+ (\d+) = \?$/.exec(r?.problem ?? '');
      const b = /^(\d+) \+ \? = (\d+)$/.exec(r?.problem ?? '');
      recomputed = a ? Number(a[1]) + Number(a[2]) : Number(b?.[2]) - Number(b?.[1]);
      expect(r?.problem).toBe(it.text);
    }
    expect(recomputed, `เฉลยข้อ ${it.id} ที่คิดใหม่จากโจทย์`).toBe(it.expected);
    expect(r?.answer).toBe(String(it.expected));
    expect(r?.result).toBe('ถูก');
    expect(r?.misconception).toBe('—');
  }
});

// ตรวจ "คำตอบผิดทุกแบบ x วิธีคิด -> รหัส" — แจกเป็นหลาย session ให้แต่ละ session ตรวจได้ทีละคำตอบต่อข้อ
const probes = probeQueues(WRONG);
const sessionsToRun = [
  ...probes.stage14.map((p, i) => ({ name: `ด่าน 1–4 รอบที่ ${i + 1}`, probes: p })),
  ...probes.stage5.map((p, i) => ({ name: `ด่าน 5 รอบที่ ${i + 1}`, probes: p })),
];
sessionsToRun.forEach((sess, idx) => {
  test(`TC-31.${String(idx + 1).padStart(2, '0')} ${sess.name}: คำตอบผิด ${sess.probes.length} แบบ ได้รหัสตาม LS §4 (AC1, §6.2)`, async ({
    page,
  }) => {
    test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
    const plan: Plan = {};
    for (const p of sess.probes) plan[p.itemId] = { r: p.r, ...(p.s ? { s: p.s } : {}) };
    await fullRun(page, plan, { input: 'keyboard' });
    await verifyRows(page, plan);
  });
});

/** ตรวจตารางรายข้อ + event + รายการความเข้าใจผิด เทียบกับผลที่คิดเองจาก LS */
async function verifyRows(page: Page, plan: Plan): Promise<void> {
  const rows = await itemRows(page);
  const db = await readDbWhen(page, 3);
  const answered = byType(db.events, 'item.answered');
  const found: Record<string, string[]> = {};
  for (const row of rows) {
    const it = ITEM_BY_ID[row.id];
    if (!it) throw new Error(row.id);
    const a = plan[row.id] ?? {};
    const response = a.r ?? it.expected;
    const strategy: StrategyId | undefined = it.set
      ? (a.s ?? (it.set === 'A' ? 'known' : row.id === '5.3' ? 'column' : 'round'))
      : undefined;
    const code = expectedCode(row.id, response, strategy);
    const ctx = `ข้อ ${row.id} ตอบ ${response} วิธี ${strategy ?? '-'}`;
    expect(row.answer, ctx).toBe(String(response));
    expect(row.result, ctx).toBe(response === it.expected ? 'ถูก' : `ผิด · เฉลย ${it.expected}`);
    expect(row.misconception, ctx).toBe(code === '' ? '—' : code);
    expect(row.strategy, ctx).toBe(strategy ? STRATEGY_LABEL[strategy] : '—');
    expect(row.fluent, ctx).toBe(it.stage === 1 ? '—' : response === it.expected ? 'ใช่' : 'ไม่');
    const ev = answered.find((e) => e.itemId === row.id) as Ev;
    expect(ev.correct, ctx).toBe(response === it.expected);
    expect(ev.misconceptionId ?? '', ctx).toBe(code);
    if (code) (found[code] ??= []).push(row.id);
  }
  // ส่วน "ความเข้าใจผิดที่พบ"
  const text = await sectionText(page, 'ความเข้าใจผิดที่พบ');
  const codes = Object.keys(found);
  if (codes.length === 0) {
    expect(text).toContain('ไม่พบรูปแบบความเข้าใจผิด');
    return;
  }
  expect(text).not.toContain('ไม่พบรูปแบบความเข้าใจผิด');
  const lines = text.split('\n').filter((l) => /^M(X|\d+) /.test(l));
  const order = (c: string): number => (c === 'MX' ? 99 : Number(c.slice(1)));
  expect(lines.map((l) => l.split(' ')[0])).toEqual(codes.sort((x, y) => order(x) - order(y)));
  for (const line of lines) {
    const c = line.split(' ')[0] as string;
    if (c !== 'MX') expect(line).toContain(MISCONCEPTION_TEXT[c] ?? '?');
    expect(line.match(/\d\.\d/g) ?? [], `ข้อที่พบ ${c}`).toEqual(found[c]);
  }
}

test('TC-32 คำตอบนอกตาราง = MX และคำตอบ 0; ตอบถูกด้วยวิธีคิดใดก็ไม่มีรหัส (AC1)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const plan: Plan = {
    '1.1': { r: 0 },
    '1.2': { r: 99 },
    '2.1': { r: 5 },
    '3.1': { r: 10 },
    '3.3': { r: 13, s: 'doubles' },
    '3.4': { r: 15, s: 'count-fingers' },
    '4.1': { r: 16, s: 'make-ten' },
    '4.2': { s: 'unsure' },
    '4.3': { s: 'count-on' },
    '4.4': { s: 'doubles' },
    '5.1': { r: 0 },
    '5.3': { s: 'jump-tens' },
    '5.4': { r: 99, s: 'round' },
  };
  await fullRun(page, plan);
  await verifyRows(page, plan);
  const text = await sectionText(page, 'ความเข้าใจผิดที่พบ');
  expect(text).toMatch(/MX/);
});

test('TC-33 ชุดข้อมูลชุดเดียวกัน: ตอบถูกไม่ว่าเลือกวิธีคิดครบทุกแบบ ไม่ได้รหัส (AC1, LS §4 กฎความสำคัญ)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const strategies: StrategyId[] = [
    'count-fingers',
    'count-on',
    'make-ten',
    'doubles',
    'known',
    'unsure',
  ];
  // 3.3 3.4 4.1–4.4 ใช้ 6 วิธีในชุด A (ทั้ง 6 ข้อพอดี)
  const plan: Plan = {};
  ['3.3', '3.4', '4.1', '4.2', '4.3', '4.4'].forEach((id, i) => {
    plan[id] = { s: strategies[i] };
  });
  plan['5.3'] = { s: 'split-place' };
  plan['5.4'] = { s: 'column' };
  await fullRun(page, plan);
  const rows = await itemRows(page);
  expect(rows.map((r) => r.misconception)).toEqual(Array<string>(20).fill('—'));
  await verifyRows(page, plan);
});

async function checkScenario(page: Page, sc: Scenario): Promise<void> {
  const intros: string[] = [];
  await fullRun(page, sc.plan, { intros });
  // การข้ามด่าน 5 (AC3)
  if (sc.skipsStage5) {
    expect(intros, 'ต้องไม่เห็นหน้าเปิดด่าน 5').toHaveLength(4);
  } else {
    expect(intros).toHaveLength(5);
    expect(intros[4]).toContain('ผ่านด่าน 4 แล้ว! เหลืออีก 1 ด่าน');
  }
  const db = await readDbWhen(page, 3);
  const done = byType(db.events, 'session.completed')[0] as Ev;
  const summary = done.summary as Record<string, unknown>;
  expect(summary.skippedStageIds).toEqual(sc.skipsStage5 ? ['s5'] : []);
  expect(byType(db.events, 'item.answered')).toHaveLength(sc.skipsStage5 ? 16 : 20);
  expect((summary.recommendation as Record<string, unknown>).ladderStep).toBe(sc.rec);
  // ระดับรายด่าน
  const rows = await stageRows(page);
  for (let i = 0; i < 4; i++) {
    const r = rows[i];
    expect(r?.label).toBe(`ด่าน ${i + 1} · ${STAGE_TITLE[i]}`);
    expect(r?.cells[0], `ถูก ด่าน ${i + 1}`).toBe(`${sc.correct[i]}/4`);
    expect(r?.cells[3], `ระดับด่าน ${i + 1}`).toBe(LEVEL_TEXT[sc.levels[i] ?? 'low']);
    if (i === 2 || i === 3)
      expect(r?.cells[2], `ใช้การนับ ด่าน ${i + 1}`).toBe(String(sc.counting[i - 2]));
    else expect(r?.cells[2]).toBe('—');
  }
  ['5A', '5B', '5C'].forEach((g, i) => {
    const r = rows.find((x) => x.label === g);
    expect(r, `กลุ่ม ${g}`).toBeTruthy();
    expect(r?.cells.at(-1), `กลุ่ม ${g}`).toBe(GROUP_TEXT[sc.groups[i] ?? 'fail']);
  });
  // ขั้นที่แนะนำ + เหตุผล + หมายเหตุ
  expect(await recommendedStep(page)).toBe(sc.rec);
  const rec = await sectionText(page, 'ขั้นที่แนะนำ');
  expect(rec).toContain(`แนะนำให้เริ่มที่ ขั้นที่ ${sc.rec}: ${LADDER[sc.rec - 1]}`);
  expect(rec).toContain(REASON[sc.rec] ?? '?');
  expect(rec).toContain(PARENT_NOTE);
  // บันได
  const ladder = (await sectionText(page, 'บันไดการบวก'))
    .split('\n')
    .filter((l) => l.startsWith('ขั้นที่'));
  expect(ladder).toHaveLength(9);
  ladder.forEach((l, i) => {
    const k = i + 1;
    expect(l.startsWith(`ขั้นที่ ${k}: ${LADDER[i]}`), l).toBe(true);
    expect(l.includes('ผ่านแล้ว'), `ขั้น ${k} ผ่านแล้ว`).toBe(k < sc.rec);
    expect(l.includes('← เริ่มตรงนี้'), `ขั้น ${k} ไฮไลต์`).toBe(k === sc.rec);
  });
  // Number Talks
  const nt = await sectionText(page, 'คุยกันต่อ (Number Talks)');
  const talk = NUMBER_TALK[sc.rec];
  expect(nt).toContain(talk?.prompt ?? '?');
  for (const q of talk?.questions ?? []) expect(nt).toContain(q);
  for (const r of NUMBER_TALK_RULES) expect(nt).toContain(r);
  for (const [k, other] of Object.entries(NUMBER_TALK)) {
    if (Number(k) !== sc.rec && other.prompt !== talk?.prompt) {
      expect(nt, `ต้องไม่มีโจทย์ของขั้น ${k}`).not.toContain(other.prompt);
    }
  }
  // ความเข้าใจผิด
  const misc = await sectionText(page, 'ความเข้าใจผิดที่พบ');
  const codes = Object.keys(sc.misc);
  if (codes.length === 0) expect(misc).toContain('ไม่พบรูปแบบความเข้าใจผิด');
  for (const c of codes) {
    const line = misc.split('\n').find((l) => l.startsWith(c + ' ')) ?? '';
    expect(line, `บรรทัด ${c}`).toContain(MISCONCEPTION_TEXT[c] ?? '?');
    expect(line.match(/\d\.\d/g)).toEqual(sc.misc[c]);
  }
  expect(misc.split('\n').filter((l) => /^M\d+ /.test(l))).toHaveLength(codes.length);
}
for (const sc of SCENARIOS) {
  test(`TC-34.${sc.code} ${sc.title} (AC3, AC9, LS §6–§7, §10)`, async ({ page }) => {
    test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
    await checkScenario(page, sc);
  });
}

test('TC-35 ข้ามด่าน 5: ด่าน 4 ถูก 1 ข้อ ไม่ต้องบอกลูก ไปหน้าจบทันที และผลกลุ่ม 5A–5C = "ข้าม" (AC3, LS §2, §8.4)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const sc = SCENARIOS.find((s) => s.code === 'S14') as Scenario;
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  let endText = '';
  await runSession(page, sc.plan, {
    observe: (label, pg) =>
      label === 'kid-end' ? mainText(pg).then((t) => void (endText = t)) : Promise.resolve(),
  });
  expect(endText).toContain('ภารกิจสำเร็จ!');
  expect(endText).not.toContain('ผ่านด่าน');
  expect(endText).not.toContain('ด่าน 5');
  await expect(page.getByText('ผ่านด่าน 4')).toHaveCount(0);
  await expect(page.getByText('ขอบคุณที่ช่วยพ่อสำรวจนะ ส่งเครื่องให้พ่อดูผลได้เลย')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ภารกิจสำเร็จ!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ให้พ่อดูผล', exact: true })).toBeVisible();
  await openResults(page);
  const rows = await stageRows(page);
  for (const g of ['5A', '5B', '5C'])
    expect(rows.find((r) => r.label === g)?.cells.at(-1)).toBe('ข้าม');
});

test('TC-35b ด่าน 4 ถูก 2 ข้อ ต้องเห็นด่าน 5 (ขอบเขตของกฎข้าม)', async ({ page }) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const sc = SCENARIOS.find((s) => s.code === 'S13') as Scenario;
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  const intros: string[] = [];
  await runSession(page, sc.plan, { intros });
  expect(intros).toHaveLength(5);
  expect(intros[4]).toContain('ผ่านด่าน 4 แล้ว! เหลืออีก 1 ด่าน');
  expect(intros[4]).toContain(STAGE_INTRO[4] ?? '?');
  // หน้าจบไม่มีข้อความจบด่าน 5
  await expect(page.getByText('ผ่านด่าน 5')).toHaveCount(0);
});

test('TC-40 หน้าผลครบ 8 ส่วนตามลำดับ LS §9 และรูปแบบข้อความ (AC9, AC7)', async ({ page }) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await fullRun(page, SCENARIOS.find((s) => s.code === 'S03')?.plan ?? {});
  const text = await mainText(page);
  const order = [
    'ขั้นที่แนะนำ',
    'ผลรายด่าน',
    'บันไดการบวก',
    'ความเข้าใจผิดที่พบ',
    'รายละเอียดทุกข้อ',
    'คุยกันต่อ (Number Talks)',
    'ทำใหม่อีกครั้ง',
    'ประวัติ',
  ].map((h) => text.indexOf(h));
  expect(
    order.every((i) => i >= 0),
    JSON.stringify(order),
  ).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  await expect(page.getByRole('heading', { name: 'ภารกิจสำรวจการบวก', level: 1 })).toBeVisible();
  const heads = await page.locator('main h2').allInnerTexts();
  expect(heads).toEqual([
    'ขั้นที่แนะนำ',
    'ผลรายด่าน',
    'บันไดการบวก',
    'ความเข้าใจผิดที่พบ',
    'รายละเอียดทุกข้อ',
    'คุยกันต่อ (Number Talks)',
    'ประวัติ',
  ]);
  // หัวตารางรายด่านและรายข้อ
  const th = await page.locator('main table thead').allInnerTexts();
  expect(th[0]?.replace(/\s+/g, ' ').trim()).toBe('ด่าน ถูก เวลาเฉลี่ย (วิ) ใช้การนับ ระดับ');
  expect(th[1]?.replace(/\s+/g, ' ').trim()).toBe(
    'ข้อ โจทย์ คำตอบ ผล เวลา (วิ) คล่อง วิธีคิด ความเข้าใจผิด',
  );
  // ผลรายด่านครบ 4 ด่าน + 5A/5B/5C
  expect((await stageRows(page)).map((r) => r.label)).toEqual([
    'ด่าน 1 · เห็นภาพ 10 ช่อง',
    'ด่าน 2 · คู่รวม 10',
    'ด่าน 3 · เลขคู่',
    'ด่าน 4 · บวกข้ามสิบ',
    '5A',
    '5B',
    '5C',
  ]);
  // รูปแบบเวลาในตารางรายข้อ: ทศนิยม 1 ตำแหน่ง
  for (const r of await itemRows(page)) expect(r.time).toMatch(/^\d+\.\d$/);
  // ปุ่มทำใหม่ และ export
  await expect(page.getByRole('button', { name: 'ทำใหม่อีกครั้ง' })).toBeVisible();
  await expect(page.getByRole('button', { name: /export/ })).toBeVisible();
  // เวลาแสดงเฉพาะหน้านี้: ขั้น 1 ค่าเฉลี่ยด่าน 2 ตรงกับเวลาที่เดิน (300 ms ข้อละ ยกเว้น 2.3, 2.4 = 3001)
  const s2 = (await stageRows(page))[1];
  expect(s2?.cells[1]).toBe(((DEFAULT_MS + DEFAULT_MS + 3001 + 3001) / 4 / 1000).toFixed(1));
});

test('TC-41 ค่าเฉลี่ยเวลารายด่าน คำนวณจากทุกข้อที่เวลาใช้ได้ (รวมข้อผิด) (LS §9, D12)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const plan: Plan = {
    '2.1': { ms: 1000 },
    '2.2': { ms: 2000 },
    '2.3': { ms: 500, r: 1 }, // ผิดแต่นับเวลา
    '2.4': { ms: 3000 },
    '4.1': { ms: 1500 },
    '4.2': { ms: 2500 },
    '4.3': { ms: 3500 },
    '4.4': { ms: 500 },
  };
  await fullRun(page, plan);
  const rows = await stageRows(page);
  expect(rows[1]?.cells[1]).toBe('1.6'); // (1000+2000+500+3000)/4 = 1625
  expect(rows[3]?.cells[1]).toBe('2.0'); // (1500+2500+3500+500)/4 = 2000
  const item = (await itemRows(page)).find((r) => r.id === '2.2');
  expect(item?.time).toBe('2.0');
});

// =============================================================== F. หยุดกลางทาง (พ่อ)

interface StopCase {
  code: string;
  title: string;
  plan?: Plan;
  stop: { stopBefore?: string; stopAtStrategyOf?: string };
  answered: string[];
  rec: number | 'incomplete';
}
const first = (n: number): string[] => ITEMS.slice(0, n).map((i) => i.id);
const STOPS: StopCase[] = [
  {
    code: 'P1',
    title: 'หยุดกลางด่าน 1 (ทำแล้ว 2 ข้อ)',
    stop: { stopBefore: '1.3' },
    answered: first(2),
    rec: 'incomplete',
  },
  {
    code: 'P2',
    title: 'ด่าน 1 ถูก 3 (mid) แล้วหยุดกลางด่าน 2',
    plan: { '1.4': { r: 7 } },
    stop: { stopBefore: '2.2' },
    answered: first(5),
    rec: 1,
  },
  {
    code: 'P3',
    title: 'ด่าน 1–2 good หยุดกลางด่าน 3 -> ยังทำไม่ครบ',
    stop: { stopBefore: '3.3' },
    answered: first(10),
    rec: 'incomplete',
  },
  {
    code: 'P4',
    title: 'ด่าน 1–4 good ด่าน 5 ตอบ 2 ข้อ แล้วหยุด -> ยังทำไม่ครบ (D6)',
    stop: { stopBefore: '5.3' },
    answered: first(18),
    rec: 'incomplete',
  },
  {
    code: 'P5',
    title: 'ด่าน 1 good ด่าน 2 low แล้วหยุดในด่าน 4 -> ขั้น 2',
    plan: { '2.1': { r: 2 }, '2.2': { r: 5 } },
    stop: { stopBefore: '4.2' },
    answered: first(13),
    rec: 2,
  },
  {
    code: 'P6',
    title: 'หยุดตอนค้างที่คำถามวิธีคิด: ข้อนั้นไม่ถูกบันทึก (D5)',
    stop: { stopAtStrategyOf: '3.3' },
    answered: first(10),
    rec: 'incomplete',
  },
  {
    code: 'P7',
    title: 'หยุดระหว่างหน้าเปิดด่าน 2 (ด่าน 1 ครบ mid)',
    plan: { '1.1': { r: 6 } },
    stop: { stopBefore: '2.1' },
    answered: first(4),
    rec: 1,
  },
];
for (const sc of STOPS) {
  test(`TC-50.${sc.code} พ่อกดค้างโลโก้เพื่อหยุด: ${sc.title} (AC10, LS §7)`, async ({ page }) => {
    test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
    await installClock(page);
    await beginSession(page);
    await pauseClock(page);
    const at = await runSession(page, sc.plan ?? {}, sc.stop);
    expect(at).not.toBe('finished');
    await longPressLogo(page, 2000, true);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'หยุดภารกิจนี้?' })).toBeVisible();
    await expect(dialog).toContainText('ผลจะประเมินจากด่านที่ทำครบเท่านั้น');
    await dialog.getByRole('button', { name: 'หยุดและดูผล' }).click();
    await expect(page.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
    await expect(page.locator('main')).toContainText('หยุดกลางทาง');
    expect(await recommendedStep(page)).toBe(sc.rec);
    const rows = await itemRows(page);
    expect(rows.map((r) => r.id)).toEqual(sc.answered);
    const headings = await page.locator('main h2').allInnerTexts();
    if (sc.rec === 'incomplete') {
      const rec = await sectionText(page, 'ขั้นที่แนะนำ');
      expect(rec).toContain('ยังทำไม่ครบ ควรทำต่อให้จบก่อน');
      expect(rec).toContain(PARENT_NOTE);
      expect(headings).not.toContain('บันไดการบวก');
      expect(headings).not.toContain('คุยกันต่อ (Number Talks)');
    } else {
      expect(headings).toContain('บันไดการบวก');
      expect(headings).toContain('คุยกันต่อ (Number Talks)');
      expect(await sectionText(page, 'ขั้นที่แนะนำ')).toContain(REASON[sc.rec] ?? '?');
    }
    // event: started + answered + abandoned เท่านั้น
    const db = await readDbWhen(page, sc.answered.length + 2);
    expect(byType(db.events, 'session.started')).toHaveLength(1);
    expect(
      byType(db.events, 'item.answered')
        .map((e) => e.itemId)
        .sort(),
    ).toEqual([...sc.answered].sort());
    expect(byType(db.events, 'session.completed')).toHaveLength(0);
    const ab = byType(db.events, 'session.abandoned');
    expect(ab).toHaveLength(1);
    const summary = ab[0]?.summary as Record<string, unknown>;
    expect(summary.completion).toBe('partial');
    expect(db.events).toHaveLength(sc.answered.length + 2);
    // ประวัติ
    await expect(page.getByRole('heading', { name: 'ประวัติ' })).toBeVisible();
    const hist = page
      .locator('main section')
      .filter({ has: page.getByRole('heading', { name: 'ประวัติ' }) });
    await expect(hist.getByRole('link')).toHaveCount(1);
    await expect(hist).toContainText(sc.rec === 'incomplete' ? 'ยังทำไม่ครบ' : `ขั้นที่ ${sc.rec}`);
  });
}

test('TC-51 กดค้างโลโก้: 1999 ms ไม่เปิด, แตะสั้นไม่เปิด, 2000 ms เปิด; "ทำต่อ" กลับมาเล่นต่อได้ และข้อนั้นเวลาใช้ไม่ได้ (AC10, D4)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await guardWait(page);
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible();
  await longPressLogo(page, 100, true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await longPressLogo(page, 1999, true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible();
  await longPressLogo(page, 2000, true);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'ทำต่อ' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible();
  await typeAnswer(page, '3', 'tap');
  await submitAnswer(page, 'tap');
  await tick(page, 1000);
  await expect(page.getByText('4 + ? = 10', { exact: true })).toBeVisible();
  const db = await readDbWhen(page, 6);
  const e = byType(db.events, 'item.answered').find((x) => x.itemId === '2.1') as Ev;
  expect(e.latencyValid, 'เปิดกล่องยืนยันระหว่างตอบ = เวลาใช้ไม่ได้ (Tech §5.3)').toBe(false);
  expect(e.correct).toBe(true);
  expect(byType(db.events, 'session.abandoned')).toHaveLength(0);
});

test('TC-52 หยุดก่อนเริ่มภารกิจจริง (หน้าของลูก): ไม่มี event และกลับหน้าหลัก (Tech §5.2)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await openApp(page);
  await openDx(page);
  await passParentIntro(page);
  await pauseClock(page);
  await longPressLogo(page, 2000, true);
  const dialog = page.getByRole('dialog');
  // Tech Spec §5.2: STOP ก่อน started -> กลับหน้าหลัก ไม่มี event; ถ้าแอปไม่เปิดกล่องในหน้านี้ ถือเป็นคำถาม ไม่ใช่บั๊ก
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: 'หยุดและดูผล' }).click();
    await expect(page.getByRole('heading', { name: 'สวัสดี ทดสอบ' })).toBeVisible();
    expect((await readDb(page)).events).toHaveLength(0);
  } else {
    test.info().annotations.push({
      type: 'observation',
      description: 'หน้า kid-intro ไม่เปิดกล่องหยุดเมื่อกดค้างโลโก้',
    });
    expect((await readDb(page)).events).toHaveLength(0);
  }
});

// =============================================================== G. ประวัติ (AC12)

test('TC-60 ประวัติหลายรอบ: complete / stopped / open; เรียงใหม่→เก่า เปิดผลย้อนหลัง ทำใหม่ได้ (AC12, LS §9.8)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  // รอบ A: ครบ ขั้น 1
  await runSession(page, SCENARIOS.find((s) => s.code === 'S03')?.plan ?? {});
  await openResults(page);
  const urlA = page.url();
  expect(await recommendedStep(page)).toBe(1);
  await tick(page, 60_000);
  // รอบ B: ครบ ขั้น 9
  await page.getByRole('button', { name: 'ทำใหม่อีกครั้ง' }).click();
  await expect(page).toHaveURL(/#\/play\/DX-ADD$/);
  await passParentIntro(page);
  await startMission(page);
  await runSession(page, {});
  await openResults(page);
  const urlB = page.url();
  expect(await recommendedStep(page)).toBe(9);
  await tick(page, 60_000);
  // รอบ C: พ่อหยุดกลางทาง
  await page.getByRole('button', { name: 'ทำใหม่อีกครั้ง' }).click();
  await passParentIntro(page);
  await startMission(page);
  await runSession(page, {}, { stopBefore: '1.3' });
  await longPressLogo(page, 2000, true);
  await page.getByRole('dialog').getByRole('button', { name: 'หยุดและดูผล' }).click();
  await expect(page.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
  await tick(page, 60_000);
  // รอบ D: ทิ้งกลางทาง (ออกจากหน้าโดยไม่หยุด = open)
  await page.getByRole('button', { name: 'ทำใหม่อีกครั้ง' }).click();
  await passParentIntro(page);
  await startMission(page);
  await runSession(page, {}, { stopBefore: '2.2' });
  await page.evaluate(() => {
    location.hash = '#/parent';
  });
  await expect(page.getByRole('heading', { name: 'หน้าสำหรับพ่อ' })).toBeVisible();
  const section = page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: 'ผลแบบทดสอบ' }) });
  const links = section.getByRole('link');
  await expect(links).toHaveCount(4);
  const texts = (await links.allInnerTexts()).map((t) => t.trim());
  expect(texts[0]).toContain('ยังทำไม่ครบ'); // D (open) ใหม่สุด
  expect(texts[1]).toContain('ยังทำไม่ครบ'); // C
  expect(texts[2]).toContain('ขั้นที่ 9');
  expect(texts[3]).toContain('ขั้นที่ 1');
  for (const t of texts) expect(t).toMatch(/\d{4}/); // มีวันที่
  // เปิดผลย้อนหลังรอบ A
  await links.nth(3).click();
  await expect(page.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
  expect(page.url()).toBe(urlA);
  expect(await recommendedStep(page)).toBe(1);
  expect(await itemRows(page)).toHaveLength(20);
  const hist = page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: 'ประวัติ' }) });
  await expect(hist.getByRole('link')).toHaveCount(4);
  await expect(hist.getByText('(ครั้งนี้)')).toHaveCount(1);
  await expect(hist.locator('li').filter({ hasText: '(ครั้งนี้)' })).toContainText('ขั้นที่ 1');
  // ไปรอบ B ผ่านประวัติ
  await hist.getByRole('link').nth(2).click();
  await expect(page).toHaveURL(urlB);
  // เนื้อหาโหลดหลัง URL เปลี่ยนเล็กน้อย (ดู BUG/ข้อสังเกตเรื่องเนื้อหาเก่าค้างชั่วคราว)
  await expect.poll(() => recommendedStep(page)).toBe(9);
  // เปิดผลรอบ D (open): มีป้ายหยุดกลางทางและรายข้อ 5 ข้อ
  await page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: 'ประวัติ' }) })
    .getByRole('link')
    .first()
    .click();
  await expect(page.locator('main')).toContainText('หยุดกลางทาง');
  await expect.poll(() => recommendedStep(page)).toBe('incomplete');
  expect((await itemRows(page)).map((r) => r.id)).toEqual(first(5));
  // event รวม: A 22 + B 22 + C (1+2+1) + D (1+5)
  const db = await readDb(page);
  expect(db.events).toHaveLength(22 + 22 + 4 + 6);
  expect(new Set(db.events.map((e) => e.sessionId)).size).toBe(4);
  expect(new Set(db.events.map((e) => e.id)).size).toBe(db.events.length);
});

test('TC-61 กดค้างโลโก้ 2 วินาทีจริง (ไม่ใช้นาฬิกาปลอม) เข้าหน้าพ่อ และหน้าพ่อไม่ออกเมื่อแตะสั้น (§5)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await openApp(page);
  const logo = page.getByRole('button', { name: 'โลโก้', exact: true });
  await logo.click();
  await expect(page.getByRole('heading', { name: /สวัสดี/ })).toBeVisible();
  await longPressLogo(page, 2150, false);
  await expect(page.getByRole('heading', { name: 'หน้าสำหรับพ่อ' })).toBeVisible();
});

test('TC-62 หน้าผลที่ 360px: ตารางเลื่อนแนวนอนภายในกล่องของตาราง หน้าไม่เลื่อน (AC13, Tech §5.7)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fullRun(page);
  expect(await noHorizontalScroll(page)).toBe(true);
  const info = await page
    .locator('main table')
    .last()
    .evaluate((t) => {
      const wrap = t.parentElement as HTMLElement;
      return {
        overflowX: getComputedStyle(wrap).overflowX,
        tableW: (t as HTMLElement).scrollWidth,
        wrapW: wrap.clientWidth,
      };
    });
  expect(['auto', 'scroll']).toContain(info.overflowX);
  expect(info.tableW).toBeGreaterThan(info.wrapW);
  const b = await smallestButton(page);
  test.info().annotations.push({ type: 'smallest-target', description: JSON.stringify(b) });
  expect(b?.h ?? 48).toBeGreaterThanOrEqual(48);
});

// =============================================================== H. การใช้งานผิดปกติ (exploratory ที่ทำเป็นอัตโนมัติ)

test('TC-70 แตะสองครั้งติด: "เริ่มภารกิจ" "ไปเลย" "ตอบ" นับเป็นครั้งเดียว ข้อไม่ถูกข้าม (§6.5)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await openApp(page);
  await openDx(page);
  await passParentIntro(page);
  await page.getByRole('button', { name: 'เริ่มภารกิจ' }).dblclick();
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
  await pauseClock(page);
  await page.getByRole('button', { name: 'ไปเลย' }).dblclick();
  await tick(page, 900);
  expect((await flashSnap(page)).circles, 'ข้อแรกต้องเป็น 7 จุด').toBe(7);
  await tick(page, 1650);
  await keyButton(page, '7').click();
  await page.getByRole('button', { name: 'ตอบ', exact: true }).dblclick();
  await expect(page.getByText(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/)).toBeVisible();
  await tick(page, 1000);
  await tick(page, 900);
  expect((await flashSnap(page)).circles, 'ข้อที่สองต้องเป็น 9 จุด').toBe(9);
  expect(await typed(page)).toBe('');
  const db = await readDbWhen(page, 2);
  expect(byType(db.events, 'session.started')).toHaveLength(1);
  const ans = byType(db.events, 'item.answered');
  expect(ans.map((e) => e.itemId)).toEqual(['1.1']);
});

test('TC-70b แตะสองครั้งที่ตัวเลือก "หนูคิดยังไง": ได้ event เดียว ไม่ทะลุไปกดแป้นของข้อถัดไป (D3)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopAtStrategyOf: '3.3' });
  await page.locator('main button:visible').filter({ hasText: 'จำได้เลย' }).dblclick();
  await tick(page, 0);
  await expect(page.getByText('7 + 8 = ?', { exact: true })).toBeVisible();
  expect(await typed(page), 'แตะซ้ำต้องไม่ไปกดแป้นข้อถัดไป').toBe('');
  const db = await readDbWhen(page, 12);
  const ans = byType(db.events, 'item.answered');
  expect(ans.filter((e) => e.itemId === '3.3')).toHaveLength(1);
  expect(ans.filter((e) => e.itemId === '3.4')).toHaveLength(0);
});

/** คลิกที่พิกัด (จำลองการแตะครั้งที่สองของเด็ก) */
async function tapAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y);
}

// Tech Spec §3.3.1: หลังแตะที่เปลี่ยนหน้า หน้าใหม่ไม่รับ pointer/คีย์บอร์ดที่เริ่มภายใน 400 ms ไม่ว่าตำแหน่งใด
// ใช้นาฬิกาปลอมที่หยุดไว้ (performance.now เดินเฉพาะตอน tick) จึงกำหนดระยะห่างได้เป๊ะ
test('TC-70d tap-guard ที่ตัวเลือกวิธีคิด: แตะซ้ำที่ 150/350 ms (ตำแหน่งเดิม และเยื้อง 40 px) ถูกทิ้ง แตะที่ 450 ms รับ (§3.3.1)', async ({
  page,
}) => {
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  const cases: Array<{ gap: number; dx: number; stopAt: string; startAt: string }> = [
    { gap: 150, dx: 0, startAt: '1.1', stopAt: '3.3' },
    { gap: 150, dx: 40, startAt: '3.4', stopAt: '4.1' },
    { gap: 350, dx: 0, startAt: '4.2', stopAt: '4.2' },
    { gap: 350, dx: 40, startAt: '4.3', stopAt: '4.3' },
  ];
  for (const c of cases) {
    await runSession(page, {}, { startAt: c.startAt, stopAtStrategyOf: c.stopAt });
    const opt = page.locator('main button:visible').filter({ hasText: 'จำได้เลย' });
    const box = await opt.boundingBox();
    if (!box) throw new Error('option not visible');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const vw = page.viewportSize()?.width ?? 800;
    await tapAt(page, x, y);
    await tick(page, c.gap);
    await tapAt(page, x + c.dx > vw - 4 ? x - c.dx : x + c.dx, y);
    await expect(page.locator('main button', { hasText: /^5$/ })).toBeVisible();
    expect(await typed(page), `แตะซ้ำที่ ${c.gap} ms เยื้อง ${c.dx}px ต้องถูกทิ้ง`).toBe('');
    // ตรงๆ ที่ปุ่ม 5 ภายใน 400 ms ก็ถูกทิ้ง
    await keyButton(page, '5').click();
    expect(await typed(page), 'แตะปุ่มโดยตรงภายใน 400 ms ต้องถูกทิ้ง').toBe('');
    await tick(page, 450 - c.gap + 10);
    await keyButton(page, '5').click();
    expect(await typed(page), 'หลัง 450 ms ต้องรับ').toBe('5');
    await page.getByRole('button', { name: 'ลบตัวเลข' }).click();
    expect(await typed(page)).toBe('');
  }
});

test('TC-70e tap-guard ที่ "ไปเลย", "ตอบ", "เริ่มภารกิจ", "ต่อไป" และคีย์บอร์ด (§3.3.1)', async ({
  page,
}) => {
  await installClock(page);
  await openApp(page);
  await openDx(page);
  // ต่อไป: หน้าของลูก -> แตะซ้ำที่ 150 ms ต้องไม่ไปกด "เริ่มภารกิจ"
  const next = page.getByRole('button', { name: 'ต่อไป: หน้าของลูก' });
  const nb = await next.boundingBox();
  await pauseClock(page);
  await next.click();
  await tick(page, 150);
  if (nb) await tapAt(page, nb.x + nb.width / 2, nb.y + nb.height / 2);
  await tick(page, 0);
  await expect(page.getByRole('button', { name: 'เริ่มภารกิจ' })).toBeVisible();
  expect((await readDb(page)).events).toHaveLength(0);
  await tick(page, 400);
  // เริ่มภารกิจ: ครั้งที่สองที่ 150 ms ถูกทิ้ง (ยังอยู่หน้าเปิดด่าน 1)
  const start = page.getByRole('button', { name: 'เริ่มภารกิจ' });
  const sb = await start.boundingBox();
  await start.click();
  await tick(page, 150);
  if (sb) await tapAt(page, sb.x + sb.width / 2, sb.y + sb.height / 2);
  await tick(page, 0);
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
  await tick(page, 400);
  // ทำด่าน 1 จนถึงหน้าเปิดด่าน 2 แล้วทดสอบ "ไปเลย" + คีย์บอร์ด
  await runSession(page, {}, { stopBefore: '2.1' });
  const go = page.getByRole('button', { name: 'ไปเลย' });
  const gb = await go.boundingBox();
  await go.click();
  await tick(page, 350);
  if (gb) await tapAt(page, gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  expect(await typed(page), 'คีย์บอร์ด/แตะภายใน 400 ms ต้องถูกทิ้ง').toBe('');
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible();
  await tick(page, 100); // รวม 450 ms
  await page.keyboard.type('3');
  expect(await typed(page), 'คีย์บอร์ดหลัง 450 ms ต้องรับ').toBe('3');
  // ตอบ: แตะซ้ำที่ 150 ms ไม่ทำให้ event ซ้ำ
  const sub = page.getByRole('button', { name: 'ตอบ', exact: true });
  const bb = await sub.boundingBox();
  await sub.click();
  await tick(page, 150);
  if (bb) await tapAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2);
  await tick(page, 1000);
  await expect(page.getByText('4 + ? = 10', { exact: true })).toBeVisible();
  expect(await typed(page)).toBe('');
  const db = await readDbWhen(page, 6);
  expect(byType(db.events, 'session.started')).toHaveLength(1);
  expect(byType(db.events, 'item.answered').filter((e) => e.itemId === '2.1')).toHaveLength(1);
});

test('TC-70c แตะ "ให้พ่อดูผล" สองครั้ง: ไม่ทำให้พัง', async ({ page }) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const w = watch(page);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {});
  await page.getByRole('button', { name: 'ให้พ่อดูผล' }).dblclick();
  await expect(page.getByRole('heading', { name: 'ขั้นที่แนะนำ' })).toBeVisible();
  expect(await itemRows(page)).toHaveLength(20);
  expect(w.errors).toEqual([]);
});

test('TC-71 แตะรัวที่แป้น: ไม่เกิน 3 หลัก และกดตอบรัวได้ event เดียว (§6.5)', async ({ page }) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await guardWait(page);
  const k = keyButton(page, '4');
  for (let i = 0; i < 8; i++) await k.click({ delay: 0 });
  expect(await typed(page)).toBe('444');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ลบตัวเลข' }).click();
  await keyButton(page, '3').click();
  const submit = page.getByRole('button', { name: 'ตอบ', exact: true });
  await submit.dblclick();
  await submit.click({ force: true, timeout: 500 }).catch(() => undefined);
  await tick(page, 1000);
  await expect(page.getByText('4 + ? = 10', { exact: true })).toBeVisible();
  expect(await typed(page)).toBe('');
  const db = await readDbWhen(page, 6);
  expect(byType(db.events, 'item.answered').filter((e) => e.itemId === '2.1')).toHaveLength(1);
  expect(byType(db.events, 'item.answered').filter((e) => e.itemId === '2.2')).toHaveLength(0);
});

test('TC-72 ปุ่ม back ของเบราว์เซอร์กลางกิจกรรม: ไม่พัง ไม่มี event ซ้ำ/หาย ทำรอบใหม่ต่อได้ (§6.5)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const w = watch(page);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.2' });
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'สวัสดี ทดสอบ' })).toBeVisible();
  let db = await readDbWhen(page, 6);
  expect(byType(db.events, 'session.started')).toHaveLength(1);
  expect(byType(db.events, 'item.answered')).toHaveLength(5);
  // เวลาเดินต่อหลังออกจากหน้า ต้องไม่มี event โผล่เพิ่ม
  await tick(page, 10_000);
  db = await readDb(page);
  expect(db.events).toHaveLength(6);
  await page.goForward();
  await tick(page, 0);
  // รอบใหม่เริ่มใหม่และจบได้ครบ
  await expect(page.getByRole('heading', { name: 'ภารกิจสำรวจการบวก' })).toBeVisible();
  await passParentIntro(page);
  await startMission(page);
  await runSession(page, {});
  await openResults(page);
  expect(await recommendedStep(page)).toBe(9);
  db = await readDbWhen(page, 6 + 22);
  expect(db.events).toHaveLength(28);
  expect(new Set(db.events.map((e) => e.sessionId)).size).toBe(2);
  expect(w.errors).toEqual([]);
});

test('TC-73 reload กลางกิจกรรม: ข้อมูลที่ตอบแล้วยังอยู่ ไม่มี event ซ้ำ รอบใหม่เริ่มได้ และรอบเก่าเป็น "ยังทำไม่ครบ" (§6.5)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await beginSession(page); // เวลาจริง
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible({ timeout: 6000 });
  await page.keyboard.type('7');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/)).toBeVisible();
  await expect(page.getByText('พร้อมนะ...')).toBeVisible({ timeout: 3000 });
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  let db = await readDbWhen(page, 2);
  expect(byType(db.events, 'session.started')).toHaveLength(1);
  expect(byType(db.events, 'item.answered')).toHaveLength(1);
  expect(db.events).toHaveLength(2);
  // เริ่มรอบใหม่จากหน้าแรกได้
  await page.goto('./');
  await openDx(page);
  await passParentIntro(page);
  await startMission(page);
  db = await readDbWhen(page, 3);
  expect(byType(db.events, 'session.started')).toHaveLength(2);
  // เปิดหน้าพ่อ: ประวัติมีรอบเก่า (open) และรอบใหม่
  await page.goto('./#/parent');
  const section = page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: 'ผลแบบทดสอบ' }) });
  await expect(section.getByRole('link')).toHaveCount(2);
  await section.getByRole('link').last().click();
  await expect(page.locator('main')).toContainText('หยุดกลางทาง');
  expect((await itemRows(page)).map((r) => r.id)).toEqual(['1.1']);
});

test('TC-74 ใช้แบบ offline หลังโหลดแล้ว (production build เท่านั้น) (§6.5, ADR-0001)', async ({
  browser,
}) => {
  test.skip(isDev, 'service worker ปิดใน dev server');
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const ctx = await browser.newContext({
    baseURL: 'http://localhost:4173/Learning-Platform/',
    locale: 'th-TH',
    serviceWorkers: 'allow',
  });
  const page = await ctx.newPage();
  await openApp(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // รอให้ precache เสร็จ
  await expect
    .poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 15_000 })
    .toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  await page.reload(); // ให้ SW คุมหน้า
  await ctx.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'สวัสดี ทดสอบ' })).toBeVisible();
  await openDx(page);
  await passParentIntro(page);
  await startMission(page);
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
  await ctx.close();
});

test('TC-75 ทำซ้ำ 3 รอบติด: event ต่อรอบครบ ไม่ปนกัน (§6.5)', async ({ page }) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  for (let round = 1; round <= 3; round++) {
    await runSession(page, {});
    await openResults(page);
    if (round < 3) {
      await tick(page, 30_000);
      await page.getByRole('button', { name: 'ทำใหม่อีกครั้ง' }).click();
      await passParentIntro(page);
      await startMission(page);
    }
  }
  const db = await readDbWhen(page, 66);
  expect(db.events).toHaveLength(66);
  const bySession = new Map<string, Ev[]>();
  for (const e of db.events) bySession.set(e.sessionId, [...(bySession.get(e.sessionId) ?? []), e]);
  expect(bySession.size).toBe(3);
  for (const evs of bySession.values()) {
    expect(byType(evs, 'session.started')).toHaveLength(1);
    expect(byType(evs, 'item.answered')).toHaveLength(20);
    expect(byType(evs, 'session.completed')).toHaveLength(1);
  }
  const hist = page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: 'ประวัติ' }) });
  await expect(hist.getByRole('link')).toHaveCount(3);
});

test('TC-80 ทำครบ 20 ข้อด้วยเวลาจริง (ไม่ใช้นาฬิกาปลอม): ไหลลื่น event ครบ ไม่มี error (§6.4)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  test.setTimeout(240_000);
  const w = watch(page);
  await beginSession(page);
  let lastStage = 0;
  for (const it of ITEMS) {
    if (it.stage !== lastStage) {
      await page.getByRole('button', { name: 'ไปเลย' }).click();
      lastStage = it.stage;
      if (it.stage > 1) await guardWait(page);
    }
    if (it.stage === 1) {
      await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible({ timeout: 8000 });
    } else {
      await expect(page.getByText(it.text ?? '', { exact: true })).toBeVisible({ timeout: 4000 });
    }
    await page.keyboard.type(String(it.expected));
    await page.keyboard.press('Enter');
    await expect(page.getByText(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/)).toBeVisible();
    if (it.set) {
      await expect(page.getByText('หนูคิดข้อนี้ยังไง?')).toBeVisible({ timeout: 3000 });
      await pickStrategy(page, it.set === 'A' ? 'known' : it.id === '5.3' ? 'column' : 'round');
      await guardWait(page);
    }
  }
  await expect(page.getByText('ภารกิจสำเร็จ!')).toBeVisible({ timeout: 4000 });
  await openResults(page);
  expect(await recommendedStep(page)).toBe(9);
  const db = await readDbWhen(page, 22);
  expect(db.events).toHaveLength(22);
  const answered = byType(db.events, 'item.answered');
  for (const e of answered) {
    expect(e.latencyValid).toBe(true);
    expect(e.latencyMs as number).toBeGreaterThanOrEqual(0);
    expect(e.latencyMs as number, `ข้อ ${String(e.itemId)}`).toBeLessThan(3000);
  }
  expect(w.errors).toEqual([]);
});

test('TC-81 route: เปิดหน้าเล่นโดยยังไม่มีผู้เรียน กลับหน้าหลัก; หน้าผลของ session ที่ไม่มีไม่พัง (Tech §5.1)', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  const w = watch(page);
  await page.goto('./#/play/DX-ADD');
  await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับ' })).toBeVisible();
  await openApp(page);
  await page.goto('./#/parent/results/00000000-0000-0000-0000-000000000000');
  await page.waitForTimeout(500);
  const text = (await mainText(page)).trim();
  test.info().annotations.push({
    type: 'observation',
    description: `หน้าผลของ session ที่ไม่มี: "${text.slice(0, 120)}"`,
  });
  expect(text.length, 'หน้าต้องไม่ว่างเปล่า').toBeGreaterThan(0);
  await page.goto('./#/parent');
  await expect(page.getByRole('heading', { name: 'หน้าสำหรับพ่อ' })).toBeVisible();
  const parentText = await mainText(page);
  test.info().annotations.push({
    type: 'observation',
    description: `หน้าพ่อเมื่อยังไม่มีผลแบบทดสอบ: ${parentText.includes('ผลแบบทดสอบ') ? 'มีส่วนผลแบบทดสอบ' : 'ไม่มีส่วนผลแบบทดสอบ'}`,
  });
  expect(w.errors).toEqual([]);
});

// ---------------------------------------------------------------- ตรวจซ้ำ Suggestion รอบ 1 (S1–S3)

test('TC-82 S1: เปิดผลอีกครั้งจากประวัติ ห้ามเห็นผลของครั้งก่อนค้างใต้ URL ใหม่; S3: ไม่มีปุ่มซ้อนในลิงก์', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, SCENARIOS.find((s) => s.code === 'S03')?.plan ?? {}); // ขั้น 1
  await openResults(page);
  await page.getByRole('button', { name: 'ทำใหม่อีกครั้ง' }).click();
  await passParentIntro(page);
  await startMission(page);
  await runSession(page, {}); // ขั้น 9
  await openResults(page);
  expect(await recommendedStep(page)).toBe(9);
  expect(await page.locator('main a button, main button a').count(), 'S3').toBe(0);
  const hist = page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: 'ประวัติ' }) });
  const urlB = page.url();
  await hist.getByRole('link').nth(1).click(); // เปิดครั้งแรก (ขั้น 1)
  await expect(page).not.toHaveURL(urlB);
  const seen: string[] = [];
  for (let i = 0; i < 20; i++) {
    seen.push(
      await page
        .locator('main')
        .evaluate(
          (m) => (/แนะนำให้เริ่มที่ ขั้นที่ (\d)/.exec(m.textContent ?? '') ?? [])[1] ?? '-',
        ),
    );
    await page.waitForTimeout(30);
  }
  // รอบ 1 ค้างนาน 100–300 ms; ยอมให้เหลือได้ไม่เกิน 1 เฟรม (ตัวอย่างแรกทันทีหลัง URL เปลี่ยน)
  expect(seen.slice(2), 'ต้องไม่เห็นขั้น 9 (ผลครั้งก่อน) ค้างเกิน ~60 ms').not.toContain('9');
  await expect.poll(() => recommendedStep(page)).toBe(1);
});

test('TC-83 S2: ขณะกล่อง "หยุดภารกิจนี้?" เปิด กดคีย์บอร์ดไม่ทำให้ค่าหรือคำตอบด้านหลังเปลี่ยน', async ({
  page,
}) => {
  test.skip(projectName() !== 'desktop', DESKTOP_ONLY);
  await installClock(page);
  await beginSession(page);
  await pauseClock(page);
  await runSession(page, {}, { stopBefore: '2.1' });
  await page.getByRole('button', { name: 'ไปเลย' }).click();
  await guardWait(page);
  await keyButton(page, '3').click();
  await longPressLogo(page, 2000, true);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.type('55');
  await page.keyboard.press('Backspace');
  await page.getByRole('dialog').getByRole('button', { name: 'ทำต่อ' }).click();
  expect(await typed(page)).toBe('3');
  await expect(page.getByText('7 + ? = 10', { exact: true })).toBeVisible();
  const db = await readDb(page);
  expect(byType(db.events, 'item.answered').filter((e) => e.itemId === '2.1')).toHaveLength(0);
});
