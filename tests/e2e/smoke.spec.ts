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

test('1. เปิดแอป → เห็นฟอร์มตั้งชื่อเล่น', async ({ page }) => {
  const tracked = trackErrors(page);
  await page.goto('/');
  await expect(page.getByLabel('ชื่อเล่นของลูก')).toBeVisible();
  assertNoErrors(tracked);
});

test('2. สร้างผู้เรียนแล้วเห็นคำทักทาย และยังอยู่หลัง reload', async ({ page }) => {
  const tracked = trackErrors(page);
  await page.goto('/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();

  await page.reload();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();
  assertNoErrors(tracked);
});

test('3. ขนาด 360px ไม่มี scroll แนวนอน ที่ Home และ Parent', async ({ page }) => {
  const tracked = trackErrors(page);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();

  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(homeOverflow).toBe(true);

  await page.goto('/#/parent');
  await expect(page.getByText('หน้าสำหรับพ่อ')).toBeVisible();
  const parentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(parentOverflow).toBe(true);
  assertNoErrors(tracked);
});

test('4. dark mode และเปลี่ยนธีมที่หน้าพ่อ ยังอยู่หลัง reload', async ({ page }) => {
  const tracked = trackErrors(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();

  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBg).toBe('rgb(18, 26, 22)');

  await page.goto('/#/parent');
  await page.getByRole('radio', { name: 'สว่าง' }).check();
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).toBe('rgb(242, 247, 243)');

  await page.reload();
  const lightBgAfterReload = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(lightBgAfterReload).toBe('rgb(242, 247, 243)');
  assertNoErrors(tracked);
});

test('5. แตะโลโก้สั้นๆ ไม่มีผล, กดค้าง 2.1 วินาที ไปหน้าพ่อ', async ({ page }) => {
  const tracked = trackErrors(page);
  await page.goto('/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();

  const logo = page.getByRole('button', { name: 'โลโก้' });
  const box = await logo.boundingBox();
  if (!box) throw new Error('ไม่พบตำแหน่งโลโก้');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();
  expect(page.url()).not.toContain('#/parent');

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(2100);
  await page.mouse.up();
  await expect(page).toHaveURL(/#\/parent$/);
  assertNoErrors(tracked);
});

test('6. export ได้ไฟล์ .export.json ที่ถูกต้อง', async ({ page }) => {
  const tracked = trackErrors(page);
  await page.goto('/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await expect(page.getByText('สวัสดี ทดสอบ')).toBeVisible();
  await page.goto('/#/parent');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'ดาวน์โหลดไฟล์สำรอง (export)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.export\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const content = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
    app: string;
    learners: { nickname: string }[];
  };
  expect(content.app).toBe('math-learning');
  expect(content.learners.some((l) => l.nickname === 'ทดสอบ')).toBe(true);
  assertNoErrors(tracked);
});

test('7. manifest และ icon โหลดได้ภายใต้ base path', async ({ page, request, baseURL }) => {
  const manifestUrl = new URL('manifest.webmanifest', baseURL).toString();
  const manifestRes = await request.get(manifestUrl);
  expect(manifestRes.ok()).toBe(true);
  const manifest = (await manifestRes.json()) as { lang: string; icons: { sizes: string }[] };
  expect(manifest.lang).toBe('th');
  expect(manifest.icons.some((i) => i.sizes === '192x192')).toBe(true);
  expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true);

  const faviconRes = await request.get(new URL('favicon.ico', baseURL).toString());
  expect(faviconRes.status()).toBe(200);
  const appleTouchRes = await request.get(
    new URL('apple-touch-icon-180x180.png', baseURL).toString(),
  );
  expect(appleTouchRes.status()).toBe(200);

  await page.goto('/');
});

test('8. ทุก request มี host เป็น localhost:4173 เท่านั้น', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', (req) => {
    hosts.add(new URL(req.url()).host);
  });
  await page.goto('/');
  await page.getByLabel('ชื่อเล่นของลูก').fill('ทดสอบ');
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await page.goto('/#/parent');

  for (const host of hosts) {
    expect(host).toBe('localhost:4173');
  }
});
