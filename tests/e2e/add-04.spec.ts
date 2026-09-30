import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

// e2e ของ Developer สำหรับ ADD-04 รอบที่ 1 (Tech Spec §8.3 เทสต์ 1, 5, 7, 8, 9, 12, 13 ส่วนที่เกี่ยวกับเช็คก่อนและส่วน A)
// เวลาจริงทั้งหมด (ไม่ใช้นาฬิกาปลอม) ตัวเลขเวลาตามสเปก: c1–c3 ถูกและ ≤ 5 วินาที จึงข้าม A1/A2
// E2E_DEV=1 รันกับ dev server (React StrictMode) ต้องได้จำนวน event เท่ากัน (เทสต์ 12 = เทสต์ 1 บน dev)

const TITLE = 'ช่องว่างและเติมให้เต็มสิบ';
const ACK_RE = /^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/;
const SILENT_FORBIDDEN = /ถูก|ผิด|คะแนน|เฉลย|วินาที|นาที|ช้า|เร็ว|\d+:\d{2}/;

interface Tracked {
  pageErrors: Error[];
  consoleErrors: ConsoleMessage[];
}

function trackErrors(page: Page): Tracked {
  const t: Tracked = { pageErrors: [], consoleErrors: [] };
  page.on('pageerror', (e) => t.pageErrors.push(e));
  page.on('console', (m) => {
    if (m.type() === 'error') t.consoleErrors.push(m);
  });
  return t;
}

function assertNoErrors(t: Tracked): void {
  expect(t.pageErrors, t.pageErrors.map(String).join('\n')).toHaveLength(0);
  expect(t.consoleErrors, t.consoleErrors.map((m) => m.text()).join('\n')).toHaveLength(0);
}

// tap guard (§3.4): หน้าใหม่ไม่รับ input ภายใน 400 ms หลังแตะที่เปลี่ยนหน้า
const settle = (page: Page): Promise<void> => page.waitForTimeout(450);

async function createLearner(page: Page): Promise<void> {
  await page.goto('./#/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();
}

const main = (page: Page) => page.locator('main');
const dots = (page: Page): Promise<number> => page.locator('main [data-dot]').count();
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function typeAnswer(page: Page, n: number): Promise<void> {
  for (const d of String(n)) await button(page, d).click();
  await button(page, 'ตอบ').click();
}

async function assertSilent(page: Page): Promise<void> {
  const text = await main(page).innerText();
  expect(text, `หน้าเงียบต้องไม่บอกผล/เวลา: ${text}`).not.toMatch(SILENT_FORBIDDEN);
  await expect(
    page.locator('[role=timer], [role=progressbar], [role=status], progress, time'),
  ).toHaveCount(0);
}

async function assertNoHScroll(page: Page): Promise<void> {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(ok).toBe(true);
}

async function openLesson(page: Page): Promise<void> {
  await page.getByRole('link', { name: new RegExp(TITLE) }).click();
  await page.getByRole('button', { name: 'เริ่ม', exact: true }).click();
  await settle(page);
  await expect(page.getByText(/^เช็คก่อน/)).toBeVisible();
  await assertSilent(page);
  await page.getByRole('button', { name: 'ไปเลย' }).click();
}

// ข้อแฟลช (c1–c3, A2): คืนจำนวนจุดที่เห็นตอน "ดู!" ; waitMs = เวลาที่นั่งคิดหลังภาพซ่อนก่อนตอบ
async function flashItem(
  page: Page,
  answer: (n: number) => number,
  opts: { waitMs?: number; silent?: boolean } = {},
): Promise<number> {
  await expect(page.getByText('พร้อมนะ...')).toBeVisible();
  expect(await dots(page)).toBe(0);
  await expect(page.getByText('ดู!', { exact: true })).toBeVisible();
  await page.waitForTimeout(250);
  const n = await dots(page);
  await expect(page.getByText('ซ่อนแล้ว! ว่างกี่ช่องนะ?')).toBeVisible();
  expect(await dots(page)).toBe(0);
  if (opts.silent) await assertSilent(page);
  await page.waitForTimeout(opts.waitMs ?? 450);
  await typeAnswer(page, answer(n));
  return n;
}

async function readAck(page: Page): Promise<string> {
  const ack = page.getByText(ACK_RE);
  await expect(ack).toBeVisible();
  await assertSilent(page);
  return (await ack.textContent()) ?? '';
}

async function playCheck(
  page: Page,
  o: { wrongC1?: boolean; slowC3?: boolean } = {},
): Promise<string[]> {
  const acks: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    await flashItem(page, (n) => (i === 0 && o.wrongC1 ? n : 10 - n), {
      waitMs: i === 2 && o.slowC3 ? 5300 : 450,
      silent: true,
    });
    acks.push(await readAck(page));
    await expect(page.getByText(ACK_RE)).toBeHidden();
  }
  for (const a of [13, 16, 11]) {
    await expect(page.getByText(/^\d \+ \d = \?$/)).toBeVisible();
    await settle(page);
    await assertSilent(page);
    expect(await dots(page)).toBe(0);
    await typeAnswer(page, a);
    acks.push(await readAck(page));
    await expect(page.getByText(ACK_RE)).toBeHidden();
  }
  return acks;
}

const okText = (x: number, n: number): string => `ใช่ ช่องว่าง ${x} ช่อง ${n} กับ ${x} ได้ 10`;

async function nextPage(page: Page, name = 'ต่อไป'): Promise<void> {
  await settle(page);
  await button(page, name).click();
}

async function playA1(page: Page): Promise<void> {
  for (const [n, e] of [
    [8, 2],
    [6, 4],
    [3, 7],
  ] as const) {
    await expect(page.getByText('เติมอีกกี่ช่องถึงจะเต็ม')).toBeVisible();
    await settle(page);
    expect(await dots(page)).toBe(n);
    await typeAnswer(page, e);
    await expect(page.getByText(okText(e, n))).toBeVisible();
    await nextPage(page);
  }
}

async function playA2(page: Page): Promise<number[]> {
  const seen: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const n = await flashItem(page, (k) => 10 - k);
    seen.push(n);
    await expect(button(page, 'ต่อไป')).toBeVisible();
    await nextPage(page);
  }
  return seen;
}

// A3: ตอบตามฟังก์ชัน (ค่าเริ่มต้น = เฉลย) แล้วเลือก "เห็นกล่อง 10 ช่อง" (เลือกไม่นับ)
async function playA3(
  page: Page,
  answer?: (index: number, n: number) => number,
): Promise<number[]> {
  const seen: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const problem = main(page).getByText(/^(\d+ \+ \? = 10|\? \+ \d+ = 10)$/);
    await expect(problem).toBeVisible();
    const n = Number(/\d+/.exec((await problem.textContent()) ?? '')![0]);
    seen.push(n);
    await settle(page);
    await typeAnswer(page, answer ? answer(i, n) : 10 - n);
    await expect(page.getByText('ในหัวเห็นอะไร')).toBeVisible();
    await settle(page);
    await page.getByRole('button', { name: /^เห็นกล่อง 10 ช่อง/ }).click();
    await expect(button(page, 'ต่อไป')).toBeVisible();
    await nextPage(page);
  }
  return seen;
}

interface StoredEvent {
  id: string;
  type: string;
  at: string;
  sessionId: string;
  itemId?: string;
  blockKind?: string;
  section?: string;
  blockId?: string;
  outcome?: string;
  skipped?: { itemIds: string[]; reason: string };
  flags?: string[];
  resolvedFlag?: string;
  attemptNo?: number;
  [key: string]: unknown;
}

async function readEvents(page: Page): Promise<StoredEvent[]> {
  const events = await page.evaluate(async (): Promise<StoredEvent[]> => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const rq = indexedDB.open('learning-platform');
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(new Error('open failed'));
    });
    const all = await new Promise<StoredEvent[]>((resolve, reject) => {
      const rq = db.transaction('events').objectStore('events').getAll();
      rq.onsuccess = () => resolve(rq.result as StoredEvent[]);
      rq.onerror = () => reject(new Error('read failed'));
    });
    db.close();
    return all;
  });
  return events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

// รอให้ outbox เขียนครบอย่างน้อย n event แล้วรออีกครู่ให้เห็นว่าไม่มีตัวเกิน (ไม่ซ้ำ)
async function settledEvents(page: Page, n: number): Promise<StoredEvent[]> {
  await expect
    .poll(async () => (await readEvents(page)).length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(n);
  await page.waitForTimeout(500);
  return readEvents(page);
}

async function handoverToNote(page: Page): Promise<void> {
  await expect(page.getByText('วันนี้พอแค่นี้ ส่งเครื่องให้พ่อได้เลย')).toBeVisible();
  await nextPage(page);
  await expect(page.getByRole('heading', { name: 'บันทึกสำหรับพ่อ' })).toBeVisible();
}

test.describe('ADD-04 ครั้งที่ 1', () => {
  test.setTimeout(240_000);

  // เทสต์ 1 (และ 12 เมื่อรันด้วย E2E_DEV=1): ครั้งที่ 1 ทั้งครั้ง 360px นับจุดแฟลช บันทึกของพ่อ event 28 ตัวไม่ซ้ำ
  test('1/12. ทำครบครั้งที่ 1 ที่ 360px: จุดแฟลช ไม่บอกผล บันทึกของพ่อ event 28 ตัวไม่ซ้ำ', async ({
    page,
  }) => {
    const tracked = trackErrors(page);
    await page.setViewportSize({ width: 360, height: page.viewportSize()?.height ?? 740 });
    await createLearner(page);
    await openLesson(page);

    const acks = await playCheck(page, { slowC3: true });
    expect(acks).toHaveLength(6);
    expect(acks.slice(0, 3)).toEqual(['รับแล้ว!', 'โอเค ไปต่อ!', 'เยี่ยม ขอบคุณ!']);

    // c3 ช้ากว่า 5 วินาที จึงไม่ข้าม A1/A2 → หน้าเปิดส่วน A
    await expect(page.getByText(/^ส่วน A: ช่องว่างคือคำตอบ/)).toBeVisible();
    await assertNoHScroll(page);
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();

    await playA1(page);
    const seen = await playA2(page);
    expect(seen).toEqual([6, 2, 8, 3, 1, 7]);
    await playA3(page);
    await expect(
      page.getByText('ช่องที่เต็ม + ช่องที่ว่าง = 10 เสมอ ดูช่องว่างก็รู้คำตอบ'),
    ).toBeVisible();
    await assertNoHScroll(page);
    await nextPage(page);
    await handoverToNote(page);

    // บันทึกของพ่อ 1 ครั้ง (ไม่นับเป็นส่วนของลูก)
    await page
      .getByRole('radiogroup', { name: 'ใช้นิ้ว' })
      .getByRole('radio', { name: 'บางข้อ' })
      .click();
    await page
      .getByRole('radiogroup', { name: 'ขยับปากนับ' })
      .getByRole('radio', { name: 'ไม่ใช้' })
      .click();
    await page.getByRole('textbox', { name: /โน้ต/ }).fill('ใช้นิ้วบางข้อ');
    await button(page, 'บันทึก').click();

    // started 1 + block.started 2 + answered 21 (c 6 + A1 3 + A2 6 + A3 6) + block.completed 2 + noted 1 + completed 1
    const events = await settledEvents(page, 28);
    expect(events, 'จำนวน event').toHaveLength(28);
    expect(new Set(events.map((e) => e.id)).size, 'id ไม่ซ้ำ').toBe(28);
    expect(new Set(events.map((e) => e.sessionId)).size).toBe(1);
    expect(events[0]?.type).toBe('session.started');
    expect(events.at(-1)?.type).toBe('session.completed');
    expect(events.at(-2)?.type).toBe('parent.noted');
    for (let i = 1; i < events.length; i += 1) expect(events[i]!.at > events[i - 1]!.at).toBe(true);
    const answered = events.filter((e) => e.type === 'item.answered');
    expect(answered).toHaveLength(21);
    for (const e of answered) {
      expect(e.correct, e.itemId).toBe(true);
      expect(e.attemptNo, e.itemId).toBe(1);
      expect(typeof e.blockId).toBe('string');
      expect(typeof e.answeredAt).toBe('string');
    }
    expect(
      answered.filter((e) => e.section === 'A3').every((e) => e.strategySetId === 'add.mind-view'),
    ).toBe(true);
    expect(
      answered.filter((e) => e.section !== 'A3').every((e) => e.strategyId === undefined),
    ).toBe(true);
    expect(events.filter((e) => e.type === 'block.completed').map((e) => e.outcome)).toEqual([
      'done',
      'passed',
    ]);

    // กลับหน้าหลัก: การ์ดเป็นครั้งที่ 2
    await expect(page.getByRole('link', { name: new RegExp(TITLE) })).toContainText('ครั้งที่ 2');
    assertNoErrors(tracked);
  });

  // เทสต์ 5: ขนาดแตะ ≥ 48px ที่ 360px (ช่องกล่อง ปุ่มแป้น ปุ่มทั่วไป ตัวเลือกวิธีคิด)
  test('5. ขนาดแตะ ≥ 48px ที่ 360px ของช่องกล่อง แป้น ปุ่ม และตัวเลือกวิธีคิด', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'ระบบสัมผัสเท่านั้น (android-tablet, phone)');
    await page.setViewportSize({ width: 360, height: 740 });
    await createLearner(page);
    await openLesson(page);
    await playCheck(page, { wrongC1: true });
    await expect(page.getByText(/^ส่วน A:/)).toBeVisible();
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await expect(page.getByText('เติมอีกกี่ช่องถึงจะเต็ม')).toBeVisible();
    await settle(page);

    const small = await page.evaluate(() => {
      const bad: string[] = [];
      for (const el of Array.from(
        document.querySelectorAll('main button, main a, main [role=button]'),
      )) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.width < 47.5 || r.height < 47.5)
          bad.push(`${el.textContent ?? el.getAttribute('aria-label')} ${r.width}x${r.height}`);
      }
      return bad;
    });
    expect(small, 'ปุ่ม/ช่องที่เล็กกว่า 48px').toEqual([]);
    const frame = await page.getByTestId('ten-frame').boundingBox();
    expect(frame!.width).toBeGreaterThanOrEqual(264);
    const key = await button(page, '5').boundingBox();
    expect(key!.height).toBeGreaterThanOrEqual(55.5);
    // แตะช่องด้วยสัมผัส (tap) ได้จริง
    await page.locator('[data-cell-index="8"]').tap();
    await expect(page.locator('[data-cell-index="8"]')).toHaveAttribute('data-cell-state', 'added');
    await assertNoHScroll(page);
  });

  // เทสต์ 7: dark mode ที่หน้า A1 และหน้าเฉลย ไม่มี error
  test('7. dark mode: หน้า A1 และหน้าผลตอบอ่านได้ พื้นหลังเข้ม ตัวหนังสือสว่าง ไม่มี error', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'phone เท่านั้น');
    const tracked = trackErrors(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await createLearner(page);
    await openLesson(page);
    await playCheck(page, { wrongC1: true });
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await expect(page.getByText('เติมอีกกี่ช่องถึงจะเต็ม')).toBeVisible();
    await settle(page);

    const check = async (label: string): Promise<void> => {
      const res = await page.evaluate(() => {
        const parse = (c: string): number[] =>
          (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
        const l = (c: number[]): number => {
          const f = (v: number): number => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
        };
        const bg = parse(getComputedStyle(document.body).backgroundColor);
        const problems: string[] = [];
        const nodes = Array.from(
          document.querySelectorAll('main p, main h1, main button, main span'),
        );
        for (const el of nodes) {
          if (!(el.textContent ?? '').trim() || (el as HTMLElement).offsetParent === null) continue;
          const fg = parse(getComputedStyle(el).color);
          const ratio = (Math.max(l(fg), l(bg)) + 0.05) / (Math.min(l(fg), l(bg)) + 0.05);
          // ตัวอักษรบนปุ่มมีพื้นหลังของตัวเอง ข้ามปุ่ม (ตรวจแยกใน acceptance)
          if (el.tagName !== 'BUTTON' && ratio < 4.5)
            problems.push(`${el.textContent?.slice(0, 20)} ${ratio.toFixed(2)}`);
        }
        return { bg: getComputedStyle(document.body).backgroundColor, problems };
      });
      expect(res.bg, label).toBe('rgb(18, 26, 22)');
      expect(res.problems, `${label} ความเปรียบต่างต่ำ`).toEqual([]);
    };
    await check('A1 ก่อนตอบ');
    await page.locator('[data-cell-index="8"]').click();
    await typeAnswer(page, 8); // L1 → ไฮไลต์ช่องว่าง
    await expect(page.getByText('นั่นคือจุดที่มีอยู่ ลองดูช่องที่ยังว่าง')).toBeVisible();
    await check('A1 หลังตอบผิด');
    assertNoErrors(tracked);
  });

  // เทสต์ 8: กฎข้าม เช็คก่อนถูกและเร็วทั้ง 6 ข้อ → ไม่เห็น A1/A2 เห็น A3 เลย และ block.started บันทึกข้อที่ข้าม
  test('8. กฎข้าม: c1–c3 ถูกและเร็ว → ข้าม A1/A2 (ข้อแรกของ A คือ 7 + ? = 10) และบันทึกใน block.started', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop เท่านั้น');
    await createLearner(page);
    await openLesson(page);
    await playCheck(page);
    await expect(page.getByText(/^ส่วน A:/)).toBeVisible();
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await expect(main(page).getByText('7 + ? = 10', { exact: true })).toBeVisible();
    expect(await dots(page)).toBe(0);
    await expect(page.getByText('เติมอีกกี่ช่องถึงจะเต็ม')).toHaveCount(0);
    // started 1 + block.started/completed ของเช็คก่อน 2 + answered 6 + block.started ของ A 1
    const events = await settledEvents(page, 10);
    const aStarted = events.find((e) => e.type === 'block.started' && e.blockKind === 'A');
    expect(aStarted?.skipped?.reason).toBe('check');
    expect([...(aStarted?.skipped?.itemIds ?? [])].sort()).toEqual(
      ['A1.1', 'A1.2', 'A1.3', 'A2.1', 'A2.2', 'A2.3', 'A2.4', 'A2.5', 'A2.6'].sort(),
    );
  });

  // เทสต์ 9: A3 ไม่ผ่าน → A2 ซ้ำ 6 ข้อชุดใหม่ (มี 4 และ 9) → หน้าพ่อ → ธง talk-A ที่หน้าพ่อของบท → ครั้งถัดไปเริ่มด้วย A3 ชุดใหม่
  test('9. A3 ไม่ผ่าน → A2 ซ้ำชุดใหม่ → หน้าพ่อ Number Talks → ธง talk-A → ครั้งที่ 2 เริ่มด้วย A3 ชุดใหม่', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop เท่านั้น');
    await createLearner(page);
    await openLesson(page);
    await playCheck(page);
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    // ตอบผิด 3 ข้อ (ถูก 3/6) → ไม่ผ่าน
    await playA3(page, (i, n) => (i >= 3 ? 99 : 10 - n));
    await nextPage(page); // ข้อสรุปกฎ A
    // หน้าเปิด → A2 ซ้ำ 6 ข้อชุดใหม่
    await expect(page.getByText(/^ส่วน A:/)).toBeVisible();
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    const ns = await playA2(page);
    expect(new Set(ns).size).toBe(6);
    expect(ns.every((n) => n >= 1 && n <= 9 && n !== 5)).toBe(true);
    expect(ns).toEqual(expect.arrayContaining([4, 9]));
    expect(ns).not.toEqual([6, 2, 8, 3, 1, 7]);
    // หน้าพ่อแนะนำ Number Talks (ยังไม่ปิดธง) → ส่งเครื่อง → ข้ามบันทึก
    await expect(page.getByText('ให้พ่อทำ Number Talks ด้วยถาดไข่จริง')).toBeVisible();
    await nextPage(page);
    await handoverToNote(page);
    await button(page, 'ข้าม').click();

    // หน้าพ่อของบท: ธง talk-A มีปุ่ม "ทำแล้ว" 1 ปุ่ม และ Number Talks ตรง LS
    await page.goto('./#/parent/lesson/ADD-04');
    await expect(page.getByRole('heading', { name: 'คุยกัน (Number Talks)' })).toBeVisible();
    await expect(page.getByText('ถามด้วยความอยากรู้ ไม่ใช่จับผิด', { exact: false })).toBeVisible();
    const done = page.getByRole('button', { name: 'ทำแล้ว' });
    await expect(done).toHaveCount(1);
    await done.click();
    await expect(done).toHaveCount(0);
    const events = await readEvents(page);
    expect(
      events.filter((e) => e.type === 'parent.noted' && e.resolvedFlag === 'talk-A'),
    ).toHaveLength(1);
    expect(
      events
        .filter((e) => e.type === 'block.completed' && e.blockKind === 'A')
        .flatMap((e) => e.flags ?? []),
    ).toContain('talk-A');

    // ครั้งที่ 2 เริ่มด้วย A3 ชุดใหม่ (มี 1 และ 2 ไม่มี 5)
    await page.goto('./#/');
    await expect(page.getByRole('link', { name: new RegExp(TITLE) })).toContainText('ครั้งที่ 2');
    await openSecondSitting(page);
    const seen = await playA3(page);
    expect(new Set(seen).size).toBe(6);
    expect(seen).toEqual(expect.arrayContaining([1, 2]));
    expect(seen).not.toContain(5);
    await expect(
      page.getByText('ช่องที่เต็ม + ช่องที่ว่าง = 10 เสมอ ดูช่องว่างก็รู้คำตอบ'),
    ).toBeVisible();
  });

  // เทสต์ 13: reload กลางส่วน A → event เดิมอยู่ครบไม่ซ้ำ ไม่ทำเช็คก่อนซ้ำ ส่วน A เริ่มใหม่ทั้งส่วน
  test('13. reload กลางส่วน A: event เดิมไม่หายไม่ซ้ำ ไม่เช็คก่อนซ้ำ ส่วน A เริ่มใหม่ทั้งส่วน', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop เท่านั้น');
    await createLearner(page);
    await openLesson(page);
    await playCheck(page, { wrongC1: true });
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await expect(page.getByText('เติมอีกกี่ช่องถึงจะเต็ม')).toBeVisible();
    await settle(page);
    await typeAnswer(page, 2);
    await expect(page.getByText(okText(2, 8))).toBeVisible();
    // started 1 + เช็คก่อน (started/completed) 2 + c 6 + block.started ของ A 1 + A1.1 1 = 11 แล้ว reload
    const before = await settledEvents(page, 11);
    expect(before).toHaveLength(11);
    const beforeIds = before.map((e) => e.id);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('button', { name: 'เริ่ม', exact: true })).toBeVisible();
    const mid = await readEvents(page);
    expect(mid.map((e) => e.id)).toEqual(beforeIds);

    // เริ่มใหม่: ไม่ทำเช็คก่อนซ้ำ (ขึ้นหน้าเปิดส่วน A) และส่วน A เริ่มใหม่ทั้งส่วน (A1.1 กล่อง 8 จุด)
    await settle(page);
    await page.getByRole('button', { name: 'เริ่ม', exact: true }).click();
    await settle(page);
    await expect(page.getByText(/^ส่วน A:/)).toBeVisible();
    await expect(page.getByText(/^เช็คก่อน/)).toHaveCount(0);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await expect(page.getByText('เติมอีกกี่ช่องถึงจะเต็ม')).toBeVisible();
    await settle(page);
    expect(await dots(page)).toBe(8);
    await playA1(page);
    await playA2(page);
    await playA3(page);
    await nextPage(page);
    await handoverToNote(page);
    await button(page, 'ข้าม').click();
    const after = await settledEvents(page, before.length + 1);
    for (const id of beforeIds) expect(after.some((e) => e.id === id)).toBe(true);
    expect(new Set(after.map((e) => e.id)).size, 'id ไม่ซ้ำ').toBe(after.length);
    expect(after.filter((e) => e.type === 'block.started' && e.blockKind === 'A')).toHaveLength(2);
    const aDone = after.filter((e) => e.type === 'block.completed' && e.blockKind === 'A');
    expect(aDone, 'block.completed มีแค่ของส่วนที่จบ').toHaveLength(1);
    expect(after.filter((e) => e.type === 'block.started' && e.blockKind === 'check')).toHaveLength(
      1,
    );
    expect(after.filter((e) => e.type === 'item.answered' && e.itemId === 'A1.1')).toHaveLength(2);
    expect(after.filter((e) => e.type === 'session.completed')).toHaveLength(1);
    expect((aDone[0]!.metrics as { total: number }).total).toBe(6);
  });
});

async function openSecondSitting(page: Page): Promise<void> {
  await page.getByRole('link', { name: new RegExp(TITLE) }).click();
  await page.getByRole('button', { name: 'เริ่ม', exact: true }).click();
  await settle(page);
  await expect(page.getByText(/^ส่วน A:/)).toBeVisible();
  await page.getByRole('button', { name: 'ไปเลย' }).click();
}
