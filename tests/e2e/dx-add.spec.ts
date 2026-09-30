import { readFileSync } from 'node:fs';
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

function trackErrors(page: Page): { pageErrors: Error[]; consoleErrors: ConsoleMessage[] } {
  const pageErrors: Error[] = [];
  const consoleErrors: ConsoleMessage[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg);
  });
  return { pageErrors, consoleErrors };
}

function assertNoErrors(tracked: { pageErrors: Error[]; consoleErrors: ConsoleMessage[] }): void {
  expect(tracked.pageErrors, tracked.pageErrors.map(String).join('\n')).toHaveLength(0);
  expect(tracked.consoleErrors, tracked.consoleErrors.map((m) => m.text()).join('\n')).toHaveLength(
    0,
  );
}

// §3.3.1: หน้าใหม่ไม่รับ input ภายใน 400 ms หลังการแตะที่เปลี่ยนหน้า (คนจริงไม่แตะเร็วขนาดนั้น)
async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(450);
}

const ACK_RE = /^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/;
const FORBIDDEN_RE = /ถูก|ผิด|คะแนน|เฉลย|วินาที|นาที|\d+:\d{2}/;

// คำตอบถูกและวิธีคิดตาม Lesson Spec §4 (ข้อที่มี strategy ระบุชื่อปุ่ม)
const STAGES: { answers: number[]; strategies: (string | undefined)[] }[] = [
  { answers: [7, 9, 6, 8], strategies: [] },
  { answers: [3, 6, 2, 7], strategies: [] },
  { answers: [12, 16, 13, 15], strategies: [undefined, undefined, 'จำได้เลย', 'จำได้เลย'] },
  { answers: [13, 15, 11, 13], strategies: ['จำได้เลย', 'จำได้เลย', 'จำได้เลย', 'จำได้เลย'] },
  { answers: [57, 70, 63, 75], strategies: [undefined, undefined, 'ตั้งบวกในใจ', 'ปัดเลขให้กลม'] },
];

async function createLearner(page: Page): Promise<void> {
  await page.goto('./#/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();
}

async function assertKidSafe(page: Page, allowWrongWord = false): Promise<void> {
  const text = await page.locator('main').innerText();
  const re = allowWrongWord ? /ผิด|คะแนน|เฉลย|วินาที|นาที|\d+:\d{2}/ : FORBIDDEN_RE;
  expect(text, `ข้อความหน้าลูกต้องไม่บอกผล/เวลา: ${text}`).not.toMatch(re);
  await expect(page.locator('[role=timer], [role=progressbar], progress, time')).toHaveCount(0);
}

async function assertNoHScroll(page: Page): Promise<void> {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(ok).toBe(true);
}

async function answer(page: Page, digits: string): Promise<void> {
  for (const d of digits) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await page.getByRole('button', { name: 'ตอบ', exact: true }).click();
}

async function readAck(page: Page): Promise<string> {
  const ack = page.getByText(ACK_RE);
  await expect(ack).toBeVisible();
  const text = (await ack.textContent()) ?? '';
  await assertKidSafe(page);
  return text;
}

async function pick(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  await settle(page);
}

const EXAMPLE_DEMO = 'ตัวอย่าง: ดูจุดทั้งหมดในกล่อง มีกี่จุด พิมพ์ตัวเลขแล้วกด ตอบ';
const EXAMPLE_TRY = 'ลองดูอีกที คราวนี้ภาพจะหายไป พิมพ์ว่าเห็นกี่จุด';
const EXAMPLE_REVEAL = 'มี 2 จุด ต่อไปเป็นข้อจริงแล้ว';

// หน้าตัวอย่างและข้อลองเอง (Lesson Spec §8.2.1) หลังกด "ไปเลย" ของด่าน 1 จนถึงข้อ 1.1 (ไม่บันทึก event)
async function passExample(page: Page): Promise<void> {
  const frame = page.locator('[data-testid=ten-frame]');
  await settle(page);
  // ตัวอย่าง: 3 จุดค้างไว้ พิมพ์ผิดแล้วช่องถูกล้าง ไม่ไปต่อ ไม่มีข้อความบอกผล
  await expect(page.getByText(EXAMPLE_DEMO)).toBeVisible();
  await expect(frame.locator('circle')).toHaveCount(3);
  await assertKidSafe(page);
  await assertNoHScroll(page);
  await answer(page, '2');
  await expect(page.getByText('แตะตัวเลขด้านล่าง')).toBeVisible();
  await expect(page.getByText(EXAMPLE_DEMO)).toBeVisible();
  await expect(frame.locator('circle')).toHaveCount(3);
  await assertKidSafe(page);
  await answer(page, '3');
  // ลองเอง: พร้อมนะ -> ดู (2 จุด) -> ซ่อน
  await expect(page.getByText('พร้อมนะ...')).toBeVisible();
  await expect(page.getByText(EXAMPLE_TRY)).toBeVisible();
  await expect(frame.locator('circle')).toHaveCount(0);
  await expect(page.getByText('ดู!', { exact: true })).toBeVisible();
  await expect(frame.locator('circle')).toHaveCount(2);
  await expect(page.getByText(EXAMPLE_TRY)).toBeVisible();
  await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible();
  await expect(frame.locator('circle')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();
  await assertKidSafe(page);
  await answer(page, '5');
  // เฉลยภาพ 2 จุด แล้วเข้าข้อ 1.1 เอง
  await expect(page.getByText(EXAMPLE_REVEAL)).toBeVisible();
  await expect(frame.locator('circle')).toHaveCount(2);
  await assertKidSafe(page);
  await expect(page.getByText(EXAMPLE_REVEAL)).toBeHidden();
  await expect(page.getByText('พร้อมนะ...')).toBeVisible();
  await expect(frame.locator('circle')).toHaveCount(0);
}

interface PlayOptions {
  wrong?: boolean; // ตอบ 99 ทุกข้อ (ถามวิธีคิดเลือก "นับนิ้ว" / ชุด B "นับทีละ 1")
  throughStage?: number; // หยุดหลังจบด่านนี้ (1-5) ก่อนกด "ไปเลย" ของด่านถัดไป
}

// เล่นตั้งแต่หน้าพ่อจนถึงหน้าจบ คืนข้อความ ack ตามลำดับ
async function play(page: Page, opts: PlayOptions = {}): Promise<{ acks: string[] }> {
  const acks: string[] = [];
  await page.getByRole('link', { name: 'ภารกิจสำรวจการบวก' }).click();
  await page.getByRole('button', { name: 'ต่อไป: หน้าของลูก' }).click();
  await settle(page);
  await page.getByRole('button', { name: 'เริ่มภารกิจ' }).click();
  await settle(page);

  for (let s = 0; s < STAGES.length; s += 1) {
    const stage = STAGES[s]!;
    const goButton = page.getByRole('button', { name: 'ไปเลย' });
    if (s === 4 && opts.wrong) {
      // ข้ามด่าน 5 → ต้องไปหน้าจบ ไม่เห็นข้อความ "ผ่านด่าน 4"
      await expect(page.getByText('ภารกิจสำเร็จ!')).toBeVisible();
      await expect(page.getByText(/ผ่านด่าน/)).toHaveCount(0);
      return { acks };
    }
    await expect(goButton).toBeVisible();
    await assertKidSafe(page);
    await goButton.click();
    if (s === 0) await passExample(page);
    await settle(page);
    for (let i = 0; i < 4; i += 1) {
      await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();
      await assertKidSafe(page);
      if (s > 0 || i > 0) await assertNoHScroll(page);
      await answer(page, String(opts.wrong ? 99 : stage.answers[i]));
      acks.push(await readAck(page));
      const strategy = stage.strategies[i];
      const asks = s === 3 || ((s === 2 || s === 4) && i >= 2);
      if (asks) {
        await expect(page.getByText('หนูคิดข้อนี้ยังไง?')).toBeVisible();
        await assertKidSafe(page, true);
        await assertNoHScroll(page);
        const label = opts.wrong ? (s === 4 ? 'นับทีละ 1' : 'นับนิ้ว') : (strategy ?? 'บอกไม่ถูก');
        await pick(page, label);
      }
    }
    if (opts.throughStage === s + 1) return { acks };
  }
  await expect(page.getByText('ภารกิจสำเร็จ!')).toBeVisible();
  await assertKidSafe(page);
  return { acks };
}

test.describe('DX-ADD', () => {
  test.setTimeout(180_000);

  test('1. ทำครบ 20 ข้อ ผลอยู่หลัง reload และ export ครบ (ทุก project)', async ({ page }) => {
    const tracked = trackErrors(page);
    await page.setViewportSize({ width: 360, height: page.viewportSize()?.height ?? 740 });
    await createLearner(page);
    await play(page);

    await page.getByRole('button', { name: 'ให้พ่อดูผล' }).click();
    await expect(page.getByText(/แนะนำให้เริ่มที่ ขั้นที่ 9:/)).toBeVisible();
    await assertNoHScroll(page);
    const back = await page.getByRole('link', { name: 'กลับหน้าสำหรับพ่อ' }).boundingBox();
    expect(back!.height).toBeGreaterThanOrEqual(48);

    await page.reload();
    await expect(page.getByText(/แนะนำให้เริ่มที่ ขั้นที่ 9:/)).toBeVisible();
    const detail = page.locator('section', {
      has: page.getByRole('heading', { name: 'รายละเอียดทุกข้อ' }),
    });
    await expect(detail.locator('tbody tr')).toHaveCount(20);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /ดาวน์โหลดไฟล์สำรอง/ }).click(),
    ]);
    const path = await download.path();
    const json = JSON.parse(readFileSync(path, 'utf8')) as {
      events: {
        type: string;
        at: string;
        sessionId: string;
        itemId?: string;
        answeredAt?: string;
        strategyLatencyMs?: number;
        activityVersion?: string;
      }[];
    };
    const started = json.events.filter((e) => e.type === 'session.started');
    expect(started).toHaveLength(1);
    expect(started[0]!.activityVersion).toBe('DX-ADD v2');
    const sessionId = started[0]!.sessionId;
    // ทุก event ต้องเป็นของ session นี้และไม่ซ้ำ: 1 started + 20 answered + 1 completed
    expect(json.events).toHaveLength(22);
    expect(json.events.every((e) => e.sessionId === sessionId)).toBe(true);
    expect(json.events.filter((e) => e.type === 'item.answered')).toHaveLength(20);
    expect(
      json.events.filter((e) => e.type === 'session.completed' && e.sessionId === sessionId),
    ).toHaveLength(1);
    // หน้าตัวอย่างไม่ทิ้ง event: ตัวแรกคือ session.started ตัวถัดไปคือข้อ 1.1
    expect(json.events[0]!.type).toBe('session.started');
    expect(json.events[1]).toMatchObject({ type: 'item.answered', itemId: '1.1' });
    // ลำดับ (§14.2): at เพิ่มขึ้นเคร่งครัด และ session.completed เป็นตัวสุดท้าย (5.4 อยู่ก่อน)
    for (let i = 1; i < json.events.length; i += 1) {
      expect(json.events[i]!.at > json.events[i - 1]!.at).toBe(true);
    }
    expect(json.events.at(-1)!.type).toBe('session.completed');
    expect(json.events.at(-2)).toMatchObject({ type: 'item.answered', itemId: '5.4' });
    // เวลา (§14.3): ทุกข้อมี answeredAt ≤ at, ข้อที่ถามวิธีคิดเท่านั้นที่มี strategyLatencyMs
    const askIds = new Set(['3.3', '3.4', '4.1', '4.2', '4.3', '4.4', '5.3', '5.4']);
    for (const e of json.events.filter((x) => x.type === 'item.answered')) {
      expect(typeof e.answeredAt).toBe('string');
      expect(e.answeredAt! <= e.at).toBe(true);
      if (askIds.has(e.itemId!)) {
        expect(e.strategyLatencyMs, e.itemId).toBeGreaterThanOrEqual(0);
      } else {
        expect(e.strategyLatencyMs, e.itemId).toBeUndefined();
      }
    }
    assertNoErrors(tracked);
  });

  test('2. ไม่บอกผล (ack เท่ากันถูก/ผิด) และกฎข้ามด่าน 5', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop เท่านั้น');
    const tracked = trackErrors(page);
    await createLearner(page);

    const a = await play(page, { throughStage: 4 });
    expect(a.acks).toHaveLength(16);
    await expect(page.getByText('ผ่านด่าน 4 แล้ว! เหลืออีก 1 ด่าน')).toBeVisible();

    await page.goto('./#/');
    const b = await play(page, { wrong: true });
    expect(b.acks).toHaveLength(16);
    expect(b.acks).toEqual(a.acks);

    await page.getByRole('button', { name: 'ให้พ่อดูผล' }).click();
    await expect(page.getByRole('row', { name: /5A/ })).toContainText('ข้าม');
    await expect(page.getByText(/แนะนำให้เริ่มที่ ขั้นที่ 1:/)).toBeVisible();
    assertNoErrors(tracked);
  });

  test('3. หยุดกลางทางโดยพ่อ (กดค้างโลโก้)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop เท่านั้น');
    const tracked = trackErrors(page);
    await createLearner(page);
    await play(page, { throughStage: 1 });
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await settle(page);
    await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();
    await answer(page, '3');
    await readAck(page);
    await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();

    const box = (await page.getByRole('button', { name: 'โลโก้' }).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2100);
    await page.mouse.up();
    await page.getByRole('button', { name: 'หยุดและดูผล' }).click();

    await expect(page.getByText('ยังทำไม่ครบ ควรทำต่อให้จบก่อน').first()).toBeVisible();
    await expect(page.getByText('หยุดกลางทาง')).toBeVisible();
    await expect(page.locator('a', { hasText: '(ครั้งนี้)' })).toBeVisible();
    assertNoErrors(tracked);
  });

  test('4. dark mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'phone เท่านั้น');
    const tracked = trackErrors(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await createLearner(page);
    await page.getByRole('link', { name: 'ภารกิจสำรวจการบวก' }).click();
    await page.getByRole('button', { name: 'ต่อไป: หน้าของลูก' }).click();
    await settle(page);
    await page.getByRole('button', { name: 'เริ่มภารกิจ' }).click();
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await passExample(page);
    await settle(page);
    await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();
    await answer(page, '7');
    await readAck(page);

    await page.goto('./#/parent');
    await page.locator('a', { hasText: '—' }).first().click();
    await expect(page.getByText('หยุดกลางทาง')).toBeVisible();
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(18, 26, 22)');
    assertNoErrors(tracked);
  });

  async function checkFlashDots(page: Page): Promise<void> {
    await createLearner(page);
    await page.getByRole('link', { name: 'ภารกิจสำรวจการบวก' }).click();
    await page.getByRole('button', { name: 'ต่อไป: หน้าของลูก' }).click();
    await settle(page);
    await page.getByRole('button', { name: 'เริ่มภารกิจ' }).click();
    await settle(page);
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await passExample(page);
    const frame = page.locator('[data-testid=ten-frame]');
    for (const n of STAGES[0]!.answers) {
      await expect(page.getByText('พร้อมนะ...')).toBeVisible();
      await expect(frame).toHaveAttribute('data-visible', 'false');
      await expect(frame.locator('circle')).toHaveCount(0);
      await expect(page.getByText('ดู!', { exact: true })).toBeVisible();
      await expect(frame).toHaveAttribute('data-visible', 'true');
      await expect(frame.locator('circle')).toHaveCount(n);
      await expect(page.getByText('ซ่อนแล้ว! กี่จุดนะ?')).toBeVisible();
      await expect(frame).toHaveAttribute('data-visible', 'false');
      await expect(frame.locator('circle')).toHaveCount(0);
      await answer(page, String(n));
      await readAck(page);
    }
  }

  test('5. ten-frame แสดงจุดครบตามข้อระหว่าง "ดู!" (ทุก project)', async ({ page }) => {
    const tracked = trackErrors(page);
    await checkFlashDots(page);
    assertNoErrors(tracked);
  });

  test('6. ten-frame แสดงจุดครบเมื่อเปิด reduced motion', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop เท่านั้น');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await checkFlashDots(page);
  });

  test('7. แตะซ้ำหลังเปลี่ยนหน้า (§3.3.1): ภายใน 400 ms ถูกทิ้งไม่ว่าตำแหน่ง แล้วรับปกติ', async ({
    page,
  }) => {
    const tracked = trackErrors(page);
    await createLearner(page);
    await play(page, { throughStage: 2 });
    await page.getByRole('button', { name: 'ไปเลย' }).click();
    await settle(page);
    for (const digits of ['12', '16', '13']) {
      await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();
      await answer(page, digits);
      await readAck(page);
    }
    const option = page.getByRole('button', { name: /^จำได้เลย/ });
    await expect(option).toBeVisible();
    const box = (await option.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
    // ตกที่ตำแหน่งใดก็ได้ภายใน 400 ms: จุดเดิม (~120 ms) แล้วจุดอื่น 60 px (~250 ms) ต้องถูกทิ้ง
    await page.waitForTimeout(100);
    await page.mouse.click(x, y);
    await page.waitForTimeout(100);
    await page.mouse.click(x + 60, y);
    await page.keyboard.press('5');
    await expect(page.getByText('แตะตัวเลขด้านล่าง')).toBeVisible();
    // หลังพ้น 400 ms รับปกติ
    await settle(page);
    await answer(page, '15');
    await readAck(page);
    assertNoErrors(tracked);
  });
});
