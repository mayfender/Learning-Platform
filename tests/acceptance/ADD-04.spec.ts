// Acceptance test ADD-04 ส่งมอบรอบที่ 1 (เช็คก่อน + ส่วน A + ส่งเครื่อง/บันทึกของพ่อ + หน้าพ่อ + การ์ดหน้าหลัก)
// โดย Tester ออกแบบจาก Lesson Spec และ Tech Spec (ไม่รวมหัวข้อรายงานการพัฒนา) เท่านั้น
// ห้ามอ่านหรือ import จาก src/ (roles/tester.md §2) ดูแผนที่ docs/test-plans/ADD-04.md
// ชื่อเทสต์ขึ้นต้นด้วยรหัส TC ตรงกับ Test Plan
import { expect, test, type Page } from '@playwright/test';
import {
  A2_EXPECTED,
  A2_ITEMS,
  A3_EXPECTED,
  A3_ITEMS,
  CHALLENGE_EXTENSION,
  CHECK_GAP,
  CHECK_NO_SKIP,
  CHECK_SUM,
  INTRO,
  MATERIALS,
  MIND_LABEL,
  MIND_ORDER,
  MSG,
  NUMBER_TALKS,
  adv,
  advanceToParentNote,
  answeredOf,
  blocksOf,
  bondState,
  cellStates,
  cells,
  clickGo,
  clickNext,
  dotCount,
  dotCountDom,
  dotLayout,
  dotStyles,
  enterLesson,
  expectKidPage,
  expectPageHas,
  expectedStates,
  frameOpacity,
  gapCode,
  gapMessage,
  gotoHash,
  guard,
  imagine,
  keysEnabled,
  mainText,
  norm,
  ofType,
  okA,
  pageHas,
  pageNorm,
  passA1,
  passRuleA,
  playA2,
  playA3,
  playCheck,
  range,
  readDb,
  readDbWhen,
  readGapProblem,
  ringedCells,
  saveParentNote,
  skipParentNote,
  startLesson,
  startNextSitting,
  submitEnabled,
  sumCode,
  sumRegex,
  tapCell,
  toA1,
  toA2,
  toA3,
  tokenContrast,
  typeSubmit,
  type Ans,
  type DbDump,
  type Ev,
  type MindId,
  type Obs,
  type Plan,
} from './helpers/add04';
import {
  ACKS,
  doExport,
  expectSessionOrder,
  ISO_MS,
  keyButton,
  longPressLogo,
  lowContrast,
  noHorizontalScroll,
  openApp,
  smallestButton,
  tick,
  visualSignature,
} from './helpers/dx';

test.describe.configure({ timeout: 180_000 });

const isDev = Boolean(process.env.E2E_DEV);
/** ลดขอบเขต: เคสตรรกะยาวที่ไม่ขึ้นกับอุปกรณ์รันเฉพาะ desktop (Tech Spec §8.3, ขอบเขตเดิมที่พ่ออนุมัติ) */
const DESKTOP_ONLY = 'ตรรกะที่ไม่ขึ้นกับอุปกรณ์ รันเฉพาะ desktop (Tech Spec §8.3)';
const projectName = (): string => test.info().project.name;
const isTouch = (): boolean => projectName() !== 'desktop';
const desktopOnly = (): void => test.skip(projectName() !== 'desktop', DESKTOP_ONLY);

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

const asObj = (v: unknown): Record<string, unknown> => (v ?? {}) as Record<string, unknown>;
const one = (db: DbDump, type: string): Ev => {
  const list = ofType(db, type);
  expect(list, `ต้องมี ${type} พอดี 1`).toHaveLength(1);
  return list[0] as Ev;
};
/** รอจนข้อมูลใน IndexedDB มี event อย่างน้อย n ตัว แล้วรออีกครู่เพื่อตรวจว่าไม่มีตัวเกิน (ไม่ซ้ำ) */
async function settledDb(page: Page, n: number): Promise<DbDump> {
  await readDbWhen(page, n);
  await page.waitForTimeout(400);
  return readDb(page);
}
async function waitBlock(page: Page, kind: string, type: 'started' | 'completed', count = 1) {
  await expect
    .poll(
      async () => {
        const b = blocksOf(await readDb(page), kind);
        return type === 'started' ? b.started.length : b.completed.length;
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(count);
  return blocksOf(await readDb(page), kind);
}

// ---------------------------------------------------------------- ตรวจแฟลช (ใช้ร่วม เช็คก่อนและ A2)

async function phase(page: Page): Promise<'ready' | 'show' | 'hidden' | 'other'> {
  if ((await page.getByText(MSG.hiddenGap).count()) > 0) return 'hidden';
  if ((await page.getByText(MSG.show, { exact: true }).count()) > 0) return 'show';
  if ((await page.getByText(MSG.ready).count()) > 0) return 'ready';
  return 'other';
}

/**
 * จังหวะแฟลชของข้อหนึ่ง เริ่มที่ t = 0 คือวินาทีที่ "พร้อมนะ..." ขึ้น (นาฬิกาปลอมที่หยุดอยู่)
 * ready 900 → ดู! 1500 (fade-out เริ่มที่ 2400) → ซ่อน 2550 (reduced motion: ซ่อนที่ 2400 ไม่มี fade)
 */
async function assertFlashTimeline(page: Page, n: number, reduce: boolean, ctx: string) {
  const frame = page.getByTestId('ten-frame').first();
  expect(await phase(page), `${ctx} t=0`).toBe('ready');
  expect(await frame.getAttribute('data-visible'), `${ctx} t=0 data-visible`).toBe('false');
  expect(await dotCountDom(page), `${ctx} t=0 ไม่มีจุด`).toBe(0);
  expect(await keysEnabled(page), `${ctx} แป้นต้องล็อกระหว่างแฟลช`).toBe(0);
  await tick(page, 899);
  expect(await phase(page), `${ctx} t=899`).toBe('ready');
  expect(await dotCountDom(page), `${ctx} t=899`).toBe(0);
  await tick(page, 1);
  expect(await phase(page), `${ctx} t=900`).toBe('show');
  expect(await frame.getAttribute('data-visible')).toBe('true');
  expect(await dotCountDom(page), `${ctx} จำนวนจุดตอนแฟลช`).toBe(n);
  const lay = await dotLayout(page);
  expect(lay, `${ctx} แถวบนเต็ม 5 ก่อนแล้วแถวล่าง`).toEqual({
    top: Math.min(n, 5),
    bottom: Math.max(0, n - 5),
  });
  expect(await keysEnabled(page)).toBe(0);
  await page.keyboard.type('5');
  expect(await submitEnabled(page), `${ctx} พิมพ์ระหว่างแฟลชไม่ได้`).toBe(false);
  await tick(page, 1499); // t = 2399
  await page.waitForTimeout(250); // CSS fade วิ่งตามเวลาจริง
  expect(await phase(page), `${ctx} t=2399`).toBe('show');
  expect(await dotCount(page, true), `${ctx} t=2399 เห็นจุดครบในจอ`).toBe(n);
  expect(await frameOpacity(page)).toBe(1);
  await tick(page, 1); // t = 2400
  if (reduce) {
    expect(await phase(page), `${ctx} reduced t=2400 ซ่อนทันที`).toBe('hidden');
    expect(await dotCountDom(page)).toBe(0);
    expect(await frame.getAttribute('data-visible')).toBe('false');
    expect(await keysEnabled(page)).toBe(10);
  } else {
    expect(await phase(page), `${ctx} t=2400 กำลัง fade-out`).toBe('show');
    expect(await keysEnabled(page)).toBe(0);
    await tick(page, 148); // t = 2548
    await page.waitForTimeout(250);
    expect(await phase(page), `${ctx} t=2548`).toBe('show');
    expect(await frameOpacity(page), `${ctx} fade-out จบแล้ว`).toBeLessThan(0.05);
    await tick(page, 2); // t = 2550
    expect(await phase(page), `${ctx} t=2550`).toBe('hidden');
    expect(await dotCountDom(page)).toBe(0);
    expect(await frame.getAttribute('data-visible')).toBe('false');
    expect(await keysEnabled(page)).toBe(10);
  }
  await tick(page, 3000);
  expect(await dotCountDom(page), `${ctx} ไม่แฟลชซ้ำ`).toBe(0);
  expect(await phase(page)).toBe('hidden');
}

// =============================================================== C. เช็คก่อน

for (const reduce of [false, true]) {
  test(`TC-C01${reduce ? 'b' : 'a'} เช็คก่อน c1–c3 แฟลชกล่อง 7, 9, 4 จุด จังหวะ 900/1500 ms ${
    reduce ? 'โหมด reduced motion' : 'ปกติ'
  } แป้นล็อก ไม่แฟลชซ้ำ (AC2, AC20)`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
    await startLesson(page);
    await clickGo(page);
    for (const it of CHECK_GAP) {
      await assertFlashTimeline(page, it.n, reduce, it.id);
      await typeSubmit(page, it.e);
      await tick(page, 1000);
    }
    // c4 เป็นโจทย์ตัวเลข ไม่มีภาพกล่อง
    await expect(page.getByText(sumRegex(8, 5))).toBeVisible();
    expect(await dotCountDom(page)).toBe(0);
  });
}

test('TC-C02 เช็คก่อน 6 ข้อตามลำดับ c1–c6: ข้อความเปิดส่วน ไม่บอกถูกผิด ไม่ถามวิธีคิด event ครบ (AC2, AC17, LS §3, §11)', async ({
  page,
}) => {
  desktopOnly();
  const w = watch(page);
  await startLesson(page);
  const seen: Array<{ label: string; text: string }> = [];
  await playCheck(page, {}, async (label, pg) => {
    seen.push({ label, text: await mainText(pg) });
    await expectKidPage(pg, label, true);
  });
  // หน้าเปิดส่วนตรง LS §11
  const intro = seen.find((s) => s.label === 'intro-check');
  expect(norm(intro?.text ?? '')).toContain(norm(INTRO.check));
  // ลำดับ: แฟลช c1, c2, c3 แล้วโจทย์ c4–c6
  expect(seen.map((s) => s.label)).toEqual([
    'intro-check',
    ...['c1', 'c2', 'c3'].flatMap((id) => [`flash-show-${id}`, `item-${id}`, `ack-${id}`]),
    ...['c4', 'c5', 'c6'].flatMap((id) => [`item-${id}`, `ack-${id}`]),
  ]);
  // ไม่ถามวิธีคิดตลอดส่วนเช็คก่อน และ ack หมุนเวียน (สมมติว่าใช้ข้อความ ack ชุดเดียวกับ DX-ADD ดู Q-T3)
  for (const s of seen) expect(s.text).not.toContain(MSG.mindQuestion);
  const acks = seen.filter((s) => s.label.startsWith('ack-')).map((s) => s.text.trim());
  for (const a of acks)
    expect.soft(a, 'ข้อความ ack').toMatch(/^(รับแล้ว!|โอเค ไปต่อ!|เยี่ยม ขอบคุณ!)$/);
  expect.soft(acks.slice(0, 3)).toEqual(ACKS);
  // หลังเช็คก่อน (c1–c3 ถูกและเร็ว) ขึ้นส่วน A
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
  expect(norm(await mainText(page))).toContain(norm(INTRO.A));
  // event: session.started + block.started(check) + 6 answered + block.completed(check) = 9
  const db = await settledDb(page, 9);
  expect(db.events).toHaveLength(9);
  expect(db.learners).toHaveLength(1);
  const started = one(db, 'session.started');
  expect(started.activityId).toBe('ADD-04');
  expect(started.activityKind).toBe('lesson');
  expect(started.sitting).toBe(1);
  const bs = blocksOf(db, 'check');
  expect(bs.started).toHaveLength(1);
  expect(bs.completed).toHaveLength(1);
  const blockId = bs.started[0]?.blockId;
  expect(typeof blockId).toBe('string');
  const answered = ofType(db, 'item.answered');
  expect(answered.map((e) => e.itemId)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
  const problems: Array<Record<string, unknown>> = [
    { kind: 'missing-part', whole: 10, part: 7 },
    { kind: 'missing-part', whole: 10, part: 9 },
    { kind: 'missing-part', whole: 10, part: 4 },
    { kind: 'arith', a: 8, b: 5 },
    { kind: 'arith', a: 9, b: 7 },
    { kind: 'arith', a: 4, b: 7 },
  ];
  const expected = [3, 1, 6, 13, 16, 11];
  answered.forEach((e, i) => {
    const id = e.itemId as string;
    expect(e.blockId, id).toBe(blockId);
    expect(e.section, id).toBe('c');
    expect(e.skillId, id).toBe(i < 3 ? 'add.bonds-10' : 'add.make-10');
    expect(e.problem, id).toEqual(expect.objectContaining(problems[i] ?? {}));
    expect(e.expected, id).toBe(expected[i]);
    expect(e.response, id).toBe(expected[i]);
    expect(e.correct, id).toBe(true);
    expect(e.misconceptionId ?? null, id).toBeNull();
    expect(e.attemptNo ?? 1, id).toBe(1);
    expect(e.latencyValid, id).toBe(true);
    expect(Math.abs((e.latencyMs as number) - 1000), `${id} latencyMs`).toBeLessThanOrEqual(5);
    expect(e.strategyId ?? null, `${id} ไม่ถามวิธีคิด`).toBeNull();
    expect(typeof e.answeredAt, id).toBe('string');
    expect(e.answeredAt as string).toMatch(ISO_MS);
    expect(Date.parse(e.answeredAt as string), id).toBeLessThanOrEqual(Date.parse(e.at));
    if (e.mode !== undefined) expect(['see', 'fade', 'mind']).toContain(e.mode);
  });
  // at เพิ่มขึ้นเคร่งครัดและเป็น ISO ตามลำดับที่เขียน (ADR-0008)
  expect(db.events[0]?.type).toBe('session.started');
  for (let i = 0; i < db.events.length; i++) {
    const e = db.events[i] as Ev;
    expect(e.at).toMatch(ISO_MS);
    if (i > 0) {
      expect(Date.parse(e.at), `at ของ ${e.type} ต้องเพิ่มขึ้นเคร่งครัด`).toBeGreaterThan(
        Date.parse((db.events[i - 1] as Ev).at),
      );
    }
  }
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('TC-C03 เช็คก่อนหน้าตาเหมือนกันไม่ว่าตอบถูกหรือผิด: ข้อความ คลาส สี ack (AC2, LS §3, Tech §9)', async ({
  browser,
  baseURL,
}) => {
  desktopOnly();
  const collect = async (plan: Plan): Promise<Record<string, { text: string; sig: string }>> => {
    const ctx = await browser.newContext({
      baseURL: baseURL ?? undefined,
      locale: 'th-TH',
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    try {
      await startLesson(page);
      const out: Record<string, { text: string; sig: string }> = {};
      await playCheck(page, plan, async (label, pg) => {
        out[label] = { text: await mainText(pg), sig: await visualSignature(pg) };
      });
      return out;
    } finally {
      await ctx.close();
    }
  };
  const good = await collect({});
  const bad = await collect({
    c1: { r: 5 },
    c2: { r: 5 },
    c3: { r: 5 },
    c4: { r: 3 },
    c5: { r: 6 },
    c6: { r: 1 },
  });
  const labels = Object.keys(good);
  expect(labels.length).toBeGreaterThan(15);
  expect(Object.keys(bad)).toEqual(labels);
  for (const l of labels) {
    expect(bad[l]?.text, `ข้อความหน้า ${l}`).toBe(good[l]?.text);
    expect(bad[l]?.sig, `สี/คลาสหน้า ${l}`).toBe(good[l]?.sig);
  }
});

const SKIP_CASES: Array<{ code: string; title: string; plan: Plan; skipsA: boolean }> = [
  {
    code: 'a',
    title: 'c1–c3 ถูกและใช้เวลา 5000 ms พอดี → ข้าม A1 และ A2 เห็น A3',
    plan: { c1: { ms: 5000 }, c2: { ms: 5000 }, c3: { ms: 5000 } },
    skipsA: true,
  },
  {
    code: 'b',
    title: 'c3 ช้า 5001 ms (ข้ออื่นเร็ว) → เห็น A1',
    plan: { c3: { ms: 5001 } },
    skipsA: false,
  },
  {
    code: 'c',
    title: 'c2 ตอบผิด (เร็ว) → เห็น A1',
    plan: { c2: { r: 2 } },
    skipsA: false,
  },
  {
    code: 'd',
    title: 'c1 ช้า 6000 ms ที่เหลือเร็ว → เห็น A1',
    plan: { c1: { ms: 6000 } },
    skipsA: false,
  },
];
const A1_IDS = ['A1.1', 'A1.2', 'A1.3'];
const A2_IDS = ['A2.1', 'A2.2', 'A2.3', 'A2.4', 'A2.5', 'A2.6'];
for (const sc of SKIP_CASES) {
  test(`TC-C04.${sc.code} กฎข้าม A1/A2: ${sc.title} (AC3, LS §3)`, async ({ page }) => {
    desktopOnly();
    await startLesson(page);
    await playCheck(page, sc.plan);
    await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
    expect(norm(await mainText(page))).toContain(norm(INTRO.A));
    await clickGo(page);
    await guard(page);
    if (sc.skipsA) {
      const p = await readGapProblem(page);
      expect(p.text, 'ข้อแรกของ A ต้องเป็น A3.1').toBe('7 + ? = 10');
      expect(await pageHas(page, MSG.askFill)).toBe(false);
      expect(await dotCountDom(page)).toBe(0);
    } else {
      await expectPageHas(page, MSG.askFill, 'A1.1');
      expect(await dotCount(page)).toBe(8);
    }
    const b = await waitBlock(page, 'A', 'started');
    const skipped = asObj(b.started[0]?.skipped);
    if (sc.skipsA) {
      expect(skipped.reason).toBe('check');
      expect([...(skipped.itemIds as string[])].sort()).toEqual([...A1_IDS, ...A2_IDS].sort());
    } else {
      expect((skipped.itemIds as string[] | undefined) ?? []).toEqual([]);
    }
  });
}

const CHECK_WRONG: Array<{ code: string; plan: Plan; codes: string[] }> = [
  {
    code: '1',
    plan: { c1: { r: 7 }, c2: { r: 0 }, c3: { r: 14 }, c4: { r: 15 }, c5: { r: 6 }, c6: { r: 12 } },
    codes: ['L1', 'M5', 'M4', 'M7', 'M6', 'M5'],
  },
  {
    // c5 ตอบ 17 = s+1 และ = 10+7 ชนกัน: ในเช็คก่อนไม่มีคำถามวิธีคิด → M5 (Designer Q1)
    code: '2',
    plan: {
      c1: { r: 2 },
      c2: { r: 9 },
      c3: { r: 99 },
      c4: { r: 12 },
      c5: { r: 17 },
      c6: { r: 14 },
    },
    codes: ['M5', 'L1', 'MX', 'M5', 'M5', 'M7'],
  },
];
for (const sc of CHECK_WRONG) {
  test(`TC-C05.${sc.code} เช็คก่อนตอบผิดหลายแบบ: รหัสความเข้าใจผิดใน event ตรง LS §2 (AC1, AC17)`, async ({
    page,
  }) => {
    desktopOnly();
    await startLesson(page);
    await playCheck(page, sc.plan);
    const db = await settledDb(page, 9);
    const answered = ofType(db, 'item.answered');
    expect(answered).toHaveLength(6);
    const items = [...CHECK_GAP, ...CHECK_SUM];
    answered.forEach((e, i) => {
      const it = items[i];
      const r = sc.plan[e.itemId as string]?.r as number;
      const id = e.itemId as string;
      const expectCode =
        it && 'n' in it ? gapCode(it.n, r) : it ? sumCode(it.a, it.b, r) : 'ไม่รู้จักข้อ';
      // คำนวณจากกฎใน LS เองสองทาง: ค่าที่พิมพ์ไว้ในตารางกับฟังก์ชัน
      expect(expectCode, `${id} ตารางเทสต์`).toBe(sc.codes[i]);
      expect(e.response, id).toBe(r);
      expect(e.correct, id).toBe(false);
      expect(e.misconceptionId, `${id} รหัสความเข้าใจผิด`).toBe(sc.codes[i]);
    });
  });
}

// =============================================================== A1 เห็น (guided-fill)

test('TC-A1-01 A1.1: กล่อง 8 จุด (แถวบน 5 สี A แถวล่าง 3 สี B) แตะช่องว่าง → สีเติมเพิ่ม แยกเลขนับขึ้น แตะช่องที่มีจุดไม่มีผล (AC4, AC8)', async ({
  page,
}) => {
  await toA1(page);
  await expectKidPage(page, 'A1.1', false);
  expect(await dotCount(page)).toBe(8);
  expect(await cellStates(page)).toEqual(expectedStates(8));
  expect(await dotLayout(page)).toEqual({ top: 5, bottom: 3 });
  // สีจุดตั้งต้น: แถวบน 5 จุดสี A แถวล่าง 3 จุดสี B ต่างกัน
  const s0 = await dotStyles(page);
  const fills0 = s0.map((s) => s?.fill ?? null);
  expect(new Set(fills0.slice(0, 5)).size, 'แถวบนสีเดียว').toBe(1);
  expect(new Set(fills0.slice(5, 8)).size, 'แถวล่างสีเดียว').toBe(1);
  expect(fills0[0]).not.toBe(fills0[5]);
  expect(fills0[8]).toBeNull();
  // คำถาม และ แยกเลข 10 | 8 | ?
  await expectPageHas(page, MSG.askFill, 'A1.1');
  expect(await bondState(page)).toEqual({ whole: '10', a: '8', b: 'ยังไม่รู้' });
  // ช่องแตะได้: role=button ป้ายตามสถานะ
  const cs0 = await cells(page);
  expect(cs0).toHaveLength(10);
  cs0.forEach((c, i) => {
    expect(c.role, `ช่อง ${i}`).toBe('button');
    expect(c.label, `ช่อง ${i}`).toBe(`ช่องที่ ${i + 1} ${i < 8 ? 'มีจุด' : 'ว่าง'}`);
  });
  // แตะช่องว่างช่องแรก
  await tapCell(page, 8, isTouch());
  expect(await cellStates(page)).toEqual(expectedStates(8, [8]));
  expect(await dotCount(page)).toBe(9);
  expect(await bondState(page)).toEqual({ whole: '10', a: '8', b: '1' });
  const s1 = await dotStyles(page);
  const added = s1[8];
  expect(added, 'ช่อง 8 ต้องมีจุด').not.toBeNull();
  expect(added?.fill, 'สีเติมเพิ่มต่างจากสี A').not.toBe(fills0[0]);
  expect(added?.fill, 'สีเติมเพิ่มต่างจากสี B').not.toBe(fills0[5]);
  expect(added?.stroke, 'มีเส้นขอบ ไม่พึ่งสีอย่างเดียว').not.toBe('none');
  expect(added?.strokeWidth).toBeGreaterThanOrEqual(2);
  // แตะช่องที่มีจุดแล้ว และช่องที่เติมแล้ว: ไม่มีผล
  await tapCell(page, 0, isTouch());
  await tapCell(page, 8, isTouch());
  expect(await cellStates(page)).toEqual(expectedStates(8, [8]));
  expect(await bondState(page)).toEqual({ whole: '10', a: '8', b: '1' });
  // ช่องที่สอง
  await tapCell(page, 9, isTouch());
  expect(await cellStates(page)).toEqual(expectedStates(8, [8, 9]));
  expect(await dotCount(page)).toBe(10);
  expect(await bondState(page)).toEqual({ whole: '10', a: '8', b: '2' });
  expect((await dotStyles(page))[9]?.fill).toBe(added?.fill);
  // ยังไม่ได้ตอบ: ไม่มีข้อความตอบถูก
  expect(await pageHas(page, okA(2, 8))).toBe(false);
});

test('TC-A1-02 A1: ตอบผิด L1/M4/M5/MX ได้ข้อความและวงแหวนไฮไลต์ตรง แก้ใหม่ได้ ตอบถูกได้ข้อความถูก ผิดครบ 3 ครั้งเฉลยให้ event ครบ (AC4, AC17)', async ({
  page,
}) => {
  desktopOnly();
  const ALL = [MSG.L1, MSG.M5A, MSG.M4A, MSG.MXA];
  const expectMsg = async (code: string, ctx: string): Promise<void> => {
    const want = gapMessage(code);
    await expectPageHas(page, want, ctx);
    const body = await pageNorm(page);
    for (const m of ALL) {
      if (m !== want && !norm(want).includes(norm(m))) {
        expect(body.includes(norm(m)), `${ctx}: ต้องไม่มีข้อความของรหัสอื่น "${m}"`).toBe(false);
      }
    }
    expect(body.includes(norm('ใช่ ช่องว่าง')), `${ctx}: ตอบผิดต้องไม่ขึ้นข้อความตอบถูก`).toBe(
      false,
    );
  };
  const retry = async (r: number): Promise<void> => {
    await guard(page);
    for (let i = 0; i < 4 && (await submitEnabled(page)); i++)
      await page.keyboard.press('Backspace');
    await typeSubmit(page, r);
  };
  await toA1(page);
  // ---- A1.1 (n=8 เฉลย 2): แตะช่อง 8 ก่อน แล้วตอบ 8 (L1) → วงแหวนยังครอบทั้ง 2 ช่องที่ว่างตอนเริ่ม
  await tapCell(page, 8);
  await typeSubmit(page, 8);
  await expectMsg('L1', 'A1.1 ตอบ 8');
  expect(await ringedCells(page), 'L1: ไฮไลต์พอดี 2 ช่อง (8, 9)').toEqual([8, 9]);
  expect(await cellStates(page), 'ตอบผิดไม่เปลี่ยนช่อง').toEqual(expectedStates(8, [8]));
  await retry(18);
  await expectMsg('M4', 'A1.1 ตอบ 18');
  expect(await ringedCells(page)).toEqual([8, 9]);
  await retry(2);
  await expectPageHas(page, okA(2, 8), 'A1.1 ตอบถูก');
  expect(await cellStates(page)).toEqual(expectedStates(8, [8, 9]));
  expect(await dotCount(page)).toBe(10);
  expect(await bondState(page)).toEqual({ whole: '10', a: '8', b: '2' });
  await clickNext(page);
  // ---- A1.2 (n=6 เฉลย 4): ผิด 3 ครั้ง (M5, MX, L1) → เฉลยให้
  await expectPageHas(page, MSG.askFill, 'A1.2');
  expect(await dotCount(page)).toBe(6);
  await guard(page);
  await typeSubmit(page, 5);
  await expectMsg('M5', 'A1.2 ตอบ 5');
  expect(await ringedCells(page), 'M5: ไฮไลต์ช่องว่าง 4 ช่อง').toEqual(range(6, 9));
  await retry(9);
  await expectMsg('MX', 'A1.2 ตอบ 9');
  expect(await ringedCells(page)).toEqual(range(6, 9));
  await retry(6);
  await expectPageHas(page, okA(4, 6), 'A1.2 เฉลย');
  await expectPageHas(page, MSG.reveal, 'A1.2 ข้อความเชื่อม');
  expect(await cellStates(page), 'เฉลย: เติมช่องที่เหลือให้').toEqual(
    expectedStates(6, range(6, 9)),
  );
  expect(await bondState(page)).toEqual({ whole: '10', a: '6', b: '4' });
  await clickNext(page);
  // ---- A1.3 (n=3 เฉลย 7): แตะเติมทั้ง 7 ช่องแล้วตอบ
  await expectPageHas(page, MSG.askFill, 'A1.3');
  await guard(page);
  for (const i of range(3, 9)) await tapCell(page, i);
  expect(await bondState(page)).toEqual({ whole: '10', a: '3', b: '7' });
  await typeSubmit(page, 7);
  await expectPageHas(page, okA(7, 3), 'A1.3 ตอบถูก');
  await clickNext(page);
  await expect(page.getByText(MSG.ready)).toBeVisible(); // ต่อด้วย A2
  // ---- event
  const db = await settledDb(page, 12);
  const a11 = answeredOf(db, 'A1.1');
  expect(a11.map((e) => [e.response, e.correct, e.misconceptionId ?? null, e.attemptNo])).toEqual([
    [8, false, 'L1', 1],
    [18, false, 'M4', 2],
    [2, true, null, 3],
  ]);
  expect(asObj(a11[0]?.manip).taps as number, 'A1.1 แตะช่อง 1 ครั้งก่อนตอบ').toBeGreaterThanOrEqual(
    1,
  );
  const a12 = answeredOf(db, 'A1.2');
  expect(a12.map((e) => [e.response, e.correct, e.misconceptionId ?? null, e.attemptNo])).toEqual([
    [5, false, 'M5', 1],
    [9, false, 'MX', 2],
    [6, false, 'L1', 3],
  ]);
  expect(
    a12.some((e) => e.revealed === true),
    'ผิดครบ 3 ครั้ง → revealed: true',
  ).toBe(true);
  expect(answeredOf(db, 'A1.1').some((e) => e.revealed === true)).toBe(false);
  const a13 = answeredOf(db, 'A1.3');
  expect(a13).toHaveLength(1);
  expect(asObj(a13[0]?.manip).taps as number).toBeGreaterThanOrEqual(7);
  for (const e of [...a11, ...a12, ...a13]) {
    expect(e.section).toBe('A1');
    expect(e.mode).toBe('see');
    expect(e.skillId).toBe('add.bonds-10');
    expect(e.strategyId ?? null, 'A1 ไม่ถามวิธีคิด').toBeNull();
  }
});

test('TC-A1-03 A1 ที่ 360px: หน้าไม่เลื่อนแนวนอน ช่อง/ปุ่ม ≥ 48px แป้น ≥ 56px กล่องกว้าง ≥ 264px (AC19)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await toA1(page);
  expect(await noHorizontalScroll(page)).toBe(true);
  const cs = await cells(page);
  expect(cs).toHaveLength(10);
  for (const c of cs) {
    expect(c.w, `ช่อง ${c.index} กว้าง`).toBeGreaterThanOrEqual(47.5);
    expect(c.h, `ช่อง ${c.index} สูง`).toBeGreaterThanOrEqual(47.5);
  }
  const frame = await page.getByTestId('ten-frame').first().boundingBox();
  expect(frame?.width ?? 0).toBeGreaterThanOrEqual(264);
  const small = await smallestButton(page);
  expect(small?.h ?? 99, `ปุ่มที่เล็กสุด "${small?.name}"`).toBeGreaterThanOrEqual(47.5);
  const key = await keyButton(page, '5').boundingBox();
  expect(key?.height ?? 0).toBeGreaterThanOrEqual(55.5);
  // เติมช่องด้วยการแตะ (อุปกรณ์สัมผัสใช้ tap จริง)
  await tapCell(page, 8, isTouch());
  expect(await cellStates(page)).toEqual(expectedStates(8, [8]));
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('TC-A1-04 หมุนจอระหว่าง A1: ช่องที่แตะแล้วและตัวเลขที่พิมพ์ยังอยู่ ไม่เลื่อนแนวนอน (§6.5)', async ({
  page,
}) => {
  test.skip(!isTouch(), 'เฉพาะ project ที่เป็นอุปกรณ์สัมผัส');
  await toA1(page);
  await tapCell(page, 8, true);
  await keyButton(page, '2').tap();
  const vp = page.viewportSize();
  expect(vp).not.toBeNull();
  await page.setViewportSize({ width: vp?.height ?? 900, height: vp?.width ?? 600 });
  await page.waitForTimeout(200);
  expect(await cellStates(page)).toEqual(expectedStates(8, [8]));
  expect(await submitEnabled(page), 'ตัวเลขที่พิมพ์ค้างอยู่').toBe(true);
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.setViewportSize({ width: vp?.width ?? 600, height: vp?.height ?? 900 });
  await page.waitForTimeout(200);
  expect(await cellStates(page)).toEqual(expectedStates(8, [8]));
  expect(await noHorizontalScroll(page)).toBe(true);
});

// =============================================================== A2 ภาพจาง (teach-flash-gap)

for (const reduce of [false, true]) {
  test(`TC-A2-01${reduce ? 'b' : 'a'} A2: แฟลชกล่อง 6, 2, 8, 3, 1, 7 จุด จังหวะ 900/1500 ms ${
    reduce ? 'reduced motion' : 'ปกติ'
  } (AC5, AC20)`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
    await toA2(page);
    // ตรวจจังหวะ 2 ข้อแรก (6 จุด และ 2 จุด) ที่ตอบถูก
    for (const it of A2_ITEMS.slice(0, 2)) {
      await assertFlashTimeline(page, it.n, reduce, it.id);
      await typeSubmit(page, it.e);
      await expect(page.getByRole('button', { name: 'ต่อไป', exact: true })).toBeVisible();
      await clickNext(page);
    }
  });
}

test('TC-A2-02 A2 6 ข้อ: ตอบแล้วเห็นหน้าเฉลยกล่องเดิม ช่องว่างไฮไลต์ตามจำนวน ข้อความตามรหัส ไม่ให้แก้ event ตรง (AC5, AC17)', async ({
  page,
}) => {
  desktopOnly();
  await toA2(page);
  const script: Array<{ r: number; code: string }> = [
    { r: 6, code: 'L1' },
    { r: 8, code: '' },
    { r: 3, code: 'M5' },
    { r: 13, code: 'M4' },
    { r: 5, code: 'MX' },
    { r: 3, code: '' },
  ];
  const plan: Plan = {};
  script.forEach((s, i) => {
    plan[`A2.${i + 1}`] = { r: s.r };
  });
  const seen = await playA2(page, plan, async (label, pg) => {
    const m = /^reveal-A2\.(\d)$/.exec(label);
    if (!m) return;
    const k = Number(m[1]) - 1;
    const it = A2_ITEMS[k];
    const sc = script[k];
    if (!it || !sc) return;
    await expectKidPage(pg, label, false);
    expect(await dotCount(pg), `${label} กล่องเดิม ${it.n} จุด`).toBe(it.n);
    expect(await ringedCells(pg), `${label} ไฮไลต์ช่องว่างพอดี ${it.e} ช่อง`).toEqual(
      range(it.n, 9),
    );
    expect(await bondState(pg), `${label} แยกเลข`).toEqual({
      whole: '10',
      a: String(it.n),
      b: String(it.e),
    });
    const want = sc.code === '' ? okA(it.e, it.n) : gapMessage(sc.code);
    await expectPageHas(pg, want, label);
    const body = await pageNorm(pg);
    for (const other of [MSG.L1, MSG.M5A, MSG.M4A, MSG.MXA]) {
      if (other !== want && !norm(want).includes(norm(other))) {
        expect(body.includes(norm(other)), `${label} ต้องไม่มีข้อความของรหัสอื่น`).toBe(false);
      }
    }
    if (sc.code !== '') expect(body.includes(norm('ใช่ ช่องว่าง'))).toBe(false);
    // ไม่ให้แก้คำตอบ: ไม่มีปุ่ม "ตอบ" ที่กดได้
    expect(await submitEnabled(pg), `${label} ไม่ให้แก้`).toBe(false);
    expect(await keysEnabled(pg), `${label} ไม่ให้พิมพ์ใหม่`).toBe(0);
  });
  expect(seen).toEqual(A2_ITEMS.map((i) => i.n));
  await expect(page.getByText(/^(\d+\s*\+\s*\?\s*=\s*10|\?\s*\+\s*\d+\s*=\s*10)$/)).toBeVisible(); // A3.1
  const db = await settledDb(page, 1 + 2 + 6 + 3 + 6 + 1 + 1);
  A2_ITEMS.forEach((it, i) => {
    const es = answeredOf(db, it.id);
    expect(es, it.id).toHaveLength(1);
    const e = es[0] as Ev;
    expect(e.section).toBe('A2');
    expect(e.mode).toBe('fade');
    expect(e.skillId).toBe('add.bonds-10');
    expect(e.problem).toEqual(
      expect.objectContaining({ kind: 'missing-part', whole: 10, part: it.n }),
    );
    expect(e.expected).toBe(A2_EXPECTED[i]);
    expect(e.response).toBe(script[i]?.r);
    expect(e.correct).toBe(script[i]?.code === '');
    expect(e.misconceptionId ?? '').toBe(script[i]?.code);
    expect(e.attemptNo ?? 1).toBe(1);
    expect(e.strategyId ?? null, 'A2 ไม่ถามวิธีคิด').toBeNull();
  });
});

// =============================================================== A3 นึกเอง (mind-gap)

async function expectMindOptions(page: Page): Promise<void> {
  const texts = await page
    .locator('main button:visible')
    .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
  const labels = MIND_ORDER.map((id) => MIND_LABEL[id]);
  const found = texts.filter((t) => labels.some((l) => t.startsWith(l)));
  expect(found, 'ตัวเลือก "ในหัวเห็นอะไร" ครบ 5 ตัวตามลำดับ').toHaveLength(5);
  expect(found.map((t) => labels.find((l) => t.startsWith(l)))).toEqual(labels);
}

test('TC-A3-01 A3: โจทย์ 6 ข้อตามลำดับ ตัวเลือก "ในหัวเห็นอะไร" 5 ตัว ข้อความนับนิ้ว ภาพเมื่อตอบผิด event มี strategy/answeredAt (AC6, AC17)', async ({
  page,
}) => {
  desktopOnly();
  await toA3(page);
  const script: Array<{ r: number; s: MindId; sm: number; code: string }> = [
    { r: 3, s: 'see-box', sm: 700, code: '' },
    { r: 6, s: 'count-fingers', sm: 900, code: '' },
    { r: 8, s: 'see-number', sm: 1100, code: 'L1' },
    { r: 6, s: 'count-in-head', sm: 1300, code: 'M5' },
    { r: 4, s: 'unsure', sm: 500, code: '' },
    { r: 19, s: 'count-fingers', sm: 800, code: 'M4' },
  ];
  const plan: Plan = {};
  script.forEach((s, i) => {
    plan[`A3.${i + 1}`] = { r: s.r, s: s.s, sm: s.sm };
  });
  const seen = await playA3(page, plan, async (label, pg) => {
    const m = /^(item|mind|after-mind)-A3\.(\d)$/.exec(label);
    if (!m) return;
    const k = Number(m[2]) - 1;
    const it = A3_ITEMS[k];
    const sc = script[k];
    if (!it || !sc) return;
    await expectKidPage(pg, label, false);
    if (m[1] === 'item') {
      expect(await dotCountDom(pg), `${label} A3 ไม่มีภาพกล่องก่อนตอบ`).toBe(0);
    } else if (m[1] === 'mind') {
      await expectMindOptions(pg);
      expect(await dotCountDom(pg), `${label} ยังไม่เห็นกล่อง`).toBe(0);
    } else {
      const body = await pageNorm(pg);
      const wrong = sc.code !== '';
      const fingers = sc.s === 'count-fingers';
      expect(body.includes(norm(MSG.fingers)), `${label} ข้อความนับนิ้ว`).toBe(fingers);
      if (wrong) {
        expect(body.includes(norm(imagine(it.n))), `${label} ลองนึกกล่อง`).toBe(true);
        expect(await dotCount(pg), `${label} กล่อง ${it.n} จุด`).toBe(it.n);
        expect(await ringedCells(pg), `${label} ไฮไลต์ ${it.e} ช่อง`).toEqual(range(it.n, 9));
      } else {
        expect(body.includes(norm(imagine(it.n))), `${label} ตอบถูกไม่มีภาพนึก`).toBe(false);
        if (!fingers) {
          expect(body.includes(norm(okA(it.e, it.n))), `${label} ข้อความตอบถูก`).toBe(true);
        }
      }
    }
  });
  expect(seen.map((s) => s.text)).toEqual(A3_ITEMS.map((i) => i.text));
  expect(seen.map((s) => s.missing)).toEqual(A3_ITEMS.map((i) => i.missing));
  await passRuleA(page);
  await waitBlock(page, 'A', 'completed');
  const db = await readDb(page);
  const sid = new Set(ofType(db, 'block.started').map((b) => b.blockId));
  expect(sid.size).toBe(2);
  const block = blocksOf(db, 'A').started[0] as Ev;
  A3_ITEMS.forEach((it, i) => {
    const sc = script[i];
    const es = answeredOf(db, it.id);
    expect(es, it.id).toHaveLength(1);
    const e = es[0] as Ev;
    expect(e.blockId).toBe(block.blockId);
    expect(e.section).toBe('A3');
    expect(e.mode).toBe('mind');
    expect(e.skillId).toBe('add.bonds-10');
    expect(e.problem).toEqual(
      expect.objectContaining({ kind: 'missing-part', whole: 10, part: it.n, missing: it.missing }),
    );
    expect(e.expected).toBe(A3_EXPECTED[i]);
    expect(e.response).toBe(sc?.r);
    expect(e.correct).toBe(sc?.code === '');
    expect(e.misconceptionId ?? '').toBe(sc?.code);
    expect(e.strategySetId).toBe('add.mind-view');
    expect(e.strategyId).toBe(sc?.s);
    expect(Math.abs((e.latencyMs as number) - 1000), `${it.id} latencyMs`).toBeLessThanOrEqual(5);
    expect(
      Math.abs((e.strategyLatencyMs as number) - (sc?.sm ?? 0)),
      `${it.id} strategyLatencyMs`,
    ).toBeLessThanOrEqual(80);
    expect(e.strategyLatencyMs as number).toBeGreaterThanOrEqual(400);
    // answeredAt = เวลากด "ตอบ" ก่อน at (เวลาเลือกวิธีคิดเสร็จ) อย่างน้อยเท่าเวลาที่เลือก
    expect(e.answeredAt as string).toMatch(ISO_MS);
    const gap = Date.parse(e.at) - Date.parse(e.answeredAt as string);
    expect(gap, `${it.id} at − answeredAt`).toBeGreaterThanOrEqual((sc?.sm ?? 0) - 80);
    expect(gap).toBeLessThan((sc?.sm ?? 0) + 400);
  });
  // ผลของส่วน A: ถูก 3 ข้อ → ไม่ผ่าน และบันทึก metrics + รหัสที่พบ
  const done = blocksOf(db, 'A').completed[0] as Ev;
  expect(done.outcome).toBe('not-passed');
  const metrics = asObj(done.metrics);
  expect(metrics.total).toBe(6);
  expect(metrics.correct).toBe(3);
  expect(metrics.fastCount).toBe(3);
  const found = Object.fromEntries(
    (metrics.misconceptions as Array<{ id: string; itemIds: string[] }>).map((m) => [
      m.id,
      m.itemIds,
    ]),
  );
  expect(found).toEqual({ L1: ['A3.3'], M5: ['A3.4'], M4: ['A3.6'] });
});

const OUTCOMES: Array<{
  code: string;
  title: string;
  plan: Plan;
  outcome: 'passed' | 'not-passed';
  correct: number;
  fast: number;
}> = [
  {
    code: 'a',
    title: 'ถูก 5 เร็ว 4 (A3.1 ใช้ 5000 ms พอดีนับเร็ว, A3.5 ช้า 5001, A3.6 ผิด)',
    plan: { 'A3.1': { ms: 5000 }, 'A3.5': { ms: 5001 }, 'A3.6': { r: 0 } },
    outcome: 'passed',
    correct: 5,
    fast: 4,
  },
  {
    code: 'b',
    title: 'ถูก 5 เร็ว 3 (A3.4, A3.5 ช้า 5001, A3.6 ผิด)',
    plan: { 'A3.4': { ms: 5001 }, 'A3.5': { ms: 5001 }, 'A3.6': { r: 0 } },
    outcome: 'not-passed',
    correct: 5,
    fast: 3,
  },
  {
    code: 'c',
    title: 'ถูก 4 เร็ว 4 (ผิด 2 ข้อ)',
    plan: { 'A3.5': { r: 0 }, 'A3.6': { r: 0 } },
    outcome: 'not-passed',
    correct: 4,
    fast: 4,
  },
  {
    code: 'd',
    title: 'ถูกครบ 6 แต่ช้าทุกข้อ (5001 ms)',
    plan: Object.fromEntries(A3_ITEMS.map((i) => [i.id, { ms: 5001 }])),
    outcome: 'not-passed',
    correct: 6,
    fast: 0,
  },
  {
    code: 'e',
    title: 'ถูกครบ 6 ช้า แต่ 4 ข้อสลับแท็บระหว่างตอบ (เวลาใช้ไม่ได้ + ถูก = เร็ว)',
    plan: Object.fromEntries(
      A3_ITEMS.map((i, k): [string, Ans] => [
        i.id,
        k < 4 ? { ms: 9000, hidden: true } : { ms: 5001 },
      ]),
    ),
    outcome: 'passed',
    correct: 6,
    fast: 4,
  },
  {
    code: 'f',
    title: 'ถูกครบ 6 เร็วพอดีขอบ 5000 ms ทุกข้อ',
    plan: Object.fromEntries(A3_ITEMS.map((i) => [i.id, { ms: 5000 }])),
    outcome: 'passed',
    correct: 6,
    fast: 6,
  },
];
for (const sc of OUTCOMES) {
  test(`TC-A3-02.${sc.code} เกณฑ์ผ่านส่วน A: ${sc.title} → ${sc.outcome} (AC12, LS §9)`, async ({
    page,
  }) => {
    desktopOnly();
    await toA3(page);
    await playA3(page, sc.plan);
    await passRuleA(page);
    const b = await waitBlock(page, 'A', 'completed');
    const done = b.completed[0] as Ev;
    expect(done.outcome).toBe(sc.outcome);
    const metrics = asObj(done.metrics);
    expect(metrics.total).toBe(6);
    expect(metrics.correct).toBe(sc.correct);
    expect(metrics.fastCount).toBe(sc.fast);
    if (sc.outcome === 'passed') {
      const texts = await advanceToParentNote(page);
      expect(norm(texts.join('\n'))).toContain(norm(MSG.handover));
    } else {
      // ไม่ผ่านส่วน A → ทำ A2 ซ้ำ (แฟลช) ด้วยชุดตัวเลขใหม่
      for (let i = 0; i < 3 && !(await pageHas(page, MSG.ready)); i++) {
        const go = page.getByRole('button', { name: 'ไปเลย' });
        if (await go.isVisible()) await go.click();
        await page.waitForTimeout(100);
      }
      await expect(page.getByText(MSG.ready)).toBeVisible();
    }
  });
}

test('TC-A3-03 ไม่ผ่านส่วน A: A2 ซ้ำ 6 ข้อชุดใหม่ (มี 4 และ 9) → หน้าพ่อ Number Talks ถาดไข่ → บันทึกพ่อ → หน้าพ่อมีธงและปุ่ม "ทำแล้ว" → ครั้งถัดไปเริ่มด้วย A3 ชุดใหม่ (มี 1 และ 2) (AC12, AC18, LS §9)', async ({
  page,
}) => {
  desktopOnly();
  await toA3(page);
  await playA3(page, {
    'A3.4': { r: 99 },
    'A3.5': { r: 99 },
    'A3.6': { r: 99 },
  });
  await passRuleA(page);
  await waitBlock(page, 'A', 'completed');
  // ---- A2 ซ้ำ
  for (let i = 0; i < 3 && !(await pageHas(page, MSG.ready)); i++) {
    const go = page.getByRole('button', { name: 'ไปเลย' });
    if (await go.isVisible()) await go.click();
    await page.waitForTimeout(100);
  }
  const ns = await playA2(page);
  expect(ns, 'A2 ซ้ำ 6 ข้อ').toHaveLength(6);
  expect(new Set(ns).size, 'ไม่ซ้ำกัน').toBe(6);
  expect(
    ns.every((n) => n >= 1 && n <= 9 && n !== 5),
    'n ∈ 1..9 ยกเว้น 5',
  ).toBe(true);
  expect(ns, 'ต้องมี n ที่ไม่เคยอยู่ในชุดเดิม (4 และ 9)').toEqual(expect.arrayContaining([4, 9]));
  expect(ns, 'ลำดับต่างจากชุดเดิม').not.toEqual([6, 2, 8, 3, 1, 7]);
  // ---- หน้าพ่อ → บันทึกของพ่อ
  const texts = await advanceToParentNote(page);
  const all = norm(texts.join('\n'));
  expect(all, 'หน้าพ่อแนะนำ Number Talks ด้วยถาดไข่จริง (LS §9)').toContain(norm('Number Talks'));
  expect(all).toContain(norm('ถาดไข่'));
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeVisible();
  await saveParentNote(page, { fingers: 'most', mouth: 'some', note: 'ใช้นิ้วเกือบทุกข้อ' });
  await expect
    .poll(async () => ofType(await readDb(page), 'session.completed').length, { timeout: 10_000 })
    .toBe(1);
  let db = await readDb(page);
  const noted = ofType(db, 'parent.noted');
  expect(noted).toHaveLength(1);
  expect(noted[0]?.blockKind).toBe('A');
  expect(noted[0]?.fingers).toBe('most');
  expect(noted[0]?.mouth).toBe('some');
  expect(noted[0]?.note).toBe('ใช้นิ้วเกือบทุกข้อ');
  const firstA = blocksOf(db, 'A').completed[0] as Ev;
  expect(firstA.outcome).toBe('not-passed');
  const flags = ofType(db, 'block.completed').flatMap(
    (e) => (e.flags as string[] | undefined) ?? [],
  );
  expect(flags, 'ธง talk-A').toContain('talk-A');
  expect(ofType(db, 'item.answered').filter((e) => e.section === 'A2')).toHaveLength(6);
  expectSessionOrder(
    db.events.filter((e) => e.sessionId === (ofType(db, 'session.started')[0] as Ev).sessionId),
    'ครั้งที่ 1 (ไม่ผ่าน A)',
  );
  // ---- หน้าพ่อ /parent/lesson/ADD-04: ธงและปุ่ม "ทำแล้ว"
  await gotoHash(page, '#/parent/lesson/ADD-04');
  await expectPageHas(page, 'Number Talks', 'หน้าพ่อของบท');
  await expectPageHas(page, 'ถาดไข่', 'หน้าพ่อของบท');
  const done = page.getByRole('button', { name: 'ทำแล้ว' });
  await expect(done).toHaveCount(1);
  await done.click();
  await expect
    .poll(
      async () =>
        ofType(await readDb(page), 'parent.noted').filter((e) => e.resolvedFlag === 'talk-A')
          .length,
      { timeout: 10_000 },
    )
    .toBe(1);
  await expect(page.getByRole('button', { name: 'ทำแล้ว' })).toHaveCount(0);
  // ---- ครั้งที่ 2: การ์ดหน้าหลักแสดงครั้งที่ 2 และเริ่มด้วย A3 ชุดใหม่
  await gotoHash(page, '#/');
  await expect(page.getByRole('link', { name: /ช่องว่างและเติมให้เต็มสิบ/ })).toContainText(
    'ครั้งที่ 2',
  );
  await startNextSitting(page);
  await clickGo(page);
  const seen = await playA3(page);
  const ns3 = seen.map((s) => s.n);
  expect(new Set(ns3).size, 'ไม่ซ้ำกัน').toBe(6);
  expect(ns3.every((n) => n >= 1 && n <= 9 && n !== 5)).toBe(true);
  expect(ns3, 'ต้องมี n ที่ไม่เคยอยู่ในชุด A3 เดิม (1 และ 2)').toEqual(
    expect.arrayContaining([1, 2]),
  );
  expect(ns3, 'ลำดับต่างจากชุดเดิม').not.toEqual([7, 4, 8, 3, 6, 9]);
  expect(seen.filter((s) => s.missing === 'first')).toHaveLength(3);
  expect(seen.filter((s) => s.missing === 'second')).toHaveLength(3);
  await passRuleA(page);
  db = await readDb(page);
  const aStarts = blocksOf(db, 'A').started;
  expect(
    aStarts.length,
    'block.started ของ A: รอบแรก + A2 ซ้ำ + A3 ชุดใหม่',
  ).toBeGreaterThanOrEqual(2);
  expect(new Set(aStarts.map((b) => b.blockId)).size).toBe(aStarts.length);
  const last = aStarts[aStarts.length - 1] as Ev;
  expect(typeof last.seed, 'ชุดสุ่มบันทึก seed ใน block.started').toBe('number');
});

// =============================================================== E. ทั้งครั้งที่ 1 และข้อมูล

/** เดินครั้งที่ 1 ทั้งหมดแบบไม่ข้าม ตอบถูกครั้งแรกทุกข้อ (c1–c3 ช้ากว่า 5 วินาทีเพื่อไม่ให้ข้าม A1/A2) ไปจนถึงหน้าบันทึกของพ่อ */
async function fullSitting1(page: Page, obs?: Obs): Promise<string[]> {
  await startLesson(page);
  await playCheck(page, CHECK_NO_SKIP, obs);
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
  if (obs) await obs('intro-A', page);
  await clickGo(page);
  await passA1(page, obs);
  await playA2(page, {}, obs);
  await playA3(page, {}, obs);
  await passRuleA(page, obs);
  return advanceToParentNote(page);
}

/** ตรวจหน้าของลูก + layout ทุกหน้า */
function kidAudit(minCell: boolean): Obs {
  return async (label, pg) => {
    const silent = /^(intro-check|flash-show-c\d|item-c\d|ack-c\d)$/.test(label);
    await expectKidPage(pg, label, silent);
    expect(await noHorizontalScroll(pg), `${label} ไม่มี scroll แนวนอน`).toBe(true);
    const small = await smallestButton(pg);
    if (small) {
      expect(small.h, `${label} ปุ่ม "${small.name}" สูง`).toBeGreaterThanOrEqual(47.5);
    }
    if (minCell && label.startsWith('a1-')) {
      for (const c of await cells(pg)) {
        expect(c.w, `${label} ช่อง ${c.index}`).toBeGreaterThanOrEqual(47.5);
        expect(c.h, `${label} ช่อง ${c.index}`).toBeGreaterThanOrEqual(47.5);
      }
    }
  };
}

async function assertSitting1Events(page: Page, total: number, noted: boolean): Promise<DbDump> {
  const db = await settledDb(page, total);
  expect(db.events, `event ทั้งหมด (${isDev ? 'dev/StrictMode' : 'production'})`).toHaveLength(
    total,
  );
  expect(new Set(db.events.map((e) => e.id)).size, 'id ห้ามซ้ำ').toBe(total);
  expect(new Set(db.events.map((e) => e.sessionId)).size).toBe(1);
  expect(ofType(db, 'session.started')).toHaveLength(1);
  expect(ofType(db, 'session.completed')).toHaveLength(1);
  expect(ofType(db, 'session.abandoned')).toHaveLength(0);
  expect(ofType(db, 'parent.noted')).toHaveLength(noted ? 1 : 0);
  const learnerId = db.learners[0]?.id;
  for (const e of db.events) {
    expect(e.schemaVersion).toBe(1);
    expect(e.learnerId).toBe(learnerId);
    expect(e.activityId).toBe('ADD-04');
    expect(e.at).toMatch(ISO_MS);
  }
  expectSessionOrder(db.events, 'ครั้งที่ 1');
  const started = one(db, 'session.started');
  expect(started.activityKind).toBe('lesson');
  expect(started.sitting).toBe(1);
  expect(typeof started.activityVersion).toBe('string');
  const done = one(db, 'session.completed');
  expect(done.activityVersion).toBe(started.activityVersion);
  const summary = asObj(done.summary);
  expect(summary.kind).toBe('lesson');
  expect(summary.sitting).toBe(1);
  return db;
}

test('TC-E01 ครั้งที่ 1 ทั้งครั้ง (ไม่ข้าม ตอบถูกครั้งแรกทุกข้อ ไม่กรอกบันทึกพ่อ): event 27 ตัวพอดี ไม่ซ้ำ ลำดับถูก ตรวจทุกหน้าของลูก ไม่มี error/request ภายนอก (AC17, AC19, AC22)', async ({
  page,
}) => {
  const w = watch(page);
  const texts = await fullSitting1(page, kidAudit(false));
  expect(norm(texts.join('\n')), 'หน้าส่งเครื่อง (Tech §4.7 P8)').toContain(norm(MSG.handover));
  // หน้าบันทึกของพ่อมีฟอร์มตาม P8
  const form = await pageNorm(page);
  for (const s of [
    MSG.parentNote,
    'ใช้นิ้ว',
    'ขยับปากนับ',
    'ไม่ใช้',
    'บางข้อ',
    'เกือบทุกข้อ',
    'โน้ต (ไม่บังคับ)',
  ]) {
    expect(form, `ฟอร์มพ่อต้องมี "${s}"`).toContain(norm(s));
  }
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ข้าม', exact: true })).toBeVisible();
  await skipParentNote(page);
  // 27 = started 1 + block.started 2 + answered 21 + block.completed 2 + completed 1
  const db = await assertSitting1Events(page, 27, false);
  expect(ofType(db, 'block.started')).toHaveLength(2);
  expect(ofType(db, 'block.completed')).toHaveLength(2);
  const answered = ofType(db, 'item.answered');
  expect(answered).toHaveLength(21);
  const per = (s: string): number => answered.filter((e) => e.section === s).length;
  expect([per('c'), per('A1'), per('A2'), per('A3')]).toEqual([6, 3, 6, 6]);
  const modeOf: Record<string, string> = { A1: 'see', A2: 'fade', A3: 'mind' };
  const blockIds = new Map<string, unknown>(
    ofType(db, 'block.started').map((b): [string, unknown] => [b.blockKind as string, b.blockId]),
  );
  for (const e of answered) {
    const sec = e.section as string;
    const iid = String(e.itemId);
    expect(typeof e.blockId, `${iid} blockId`).toBe('string');
    expect(e.blockId, `${iid}`).toBe(blockIds.get(sec === 'c' ? 'check' : 'A'));
    expect(e.correct, `${iid} ตอบถูกครั้งแรก`).toBe(true);
    expect(e.attemptNo ?? 1).toBe(1);
    expect(e.answeredAt as string, `${iid} answeredAt`).toMatch(ISO_MS);
    expect(Date.parse(e.answeredAt as string)).toBeLessThanOrEqual(Date.parse(e.at));
    if (sec in modeOf) expect(e.mode, `${iid} mode`).toBe(modeOf[sec]);
    if (sec === 'A3') {
      expect(e.strategySetId).toBe('add.mind-view');
      expect(MIND_ORDER).toContain(e.strategyId);
      expect(typeof e.strategyLatencyMs).toBe('number');
    } else {
      expect(e.strategyId ?? null, `${iid} ไม่ถามวิธีคิด`).toBeNull();
      expect(e.strategyLatencyMs ?? null).toBeNull();
    }
  }
  const aDone = blocksOf(db, 'A').completed[0] as Ev;
  expect(aDone.outcome).toBe('passed');
  expect(asObj(aDone.metrics)).toEqual(
    expect.objectContaining({ total: 6, correct: 6, fastCount: 6 }),
  );
  const cDone = blocksOf(db, 'check').completed[0] as Ev;
  expect(typeof cDone.outcome).toBe('string');
  expect(asObj(asObj(one(db, 'session.completed').summary)).flags ?? []).toEqual([]);
  // ไฟล์ export ต้องมีชุดเดียวกันและลำดับเดียวกัน
  await gotoHash(page, '#/parent');
  const { json } = await doExport(page);
  expect(json.events.map((e) => e.id)).toEqual(db.events.map((e) => e.id));
  expectSessionOrder(json.events, 'export');
  expect(w.errors).toEqual([]);
  expect(w.external, 'ไม่มี request ไปโดเมนภายนอก').toEqual([]);
});

test('TC-E02 ครั้งที่ 1 ที่ 360px: ทุกหน้าของบทไม่เลื่อนแนวนอน ปุ่ม/ช่อง ≥ 48px (AC19)', async ({
  page,
}) => {
  desktopOnly();
  await page.setViewportSize({ width: 360, height: 740 });
  await fullSitting1(page, kidAudit(true));
  await gotoHash(page, '#/parent/lesson/ADD-04');
  await expectPageHas(page, 'Number Talks', 'หน้าพ่อ');
  expect(await noHorizontalScroll(page), 'หน้าพ่อไม่ scroll แนวนอน').toBe(true);
});

test('TC-E03 บันทึกของพ่อ: บันทึก → parent.noted 1 ตัวก่อน session.completed, การ์ดหน้าหลักเป็น "ครั้งที่ 2", แก้ภายหลัง → event ใหม่และหน้าแสดงค่าล่าสุด (AC14, AC18, P8, P12)', async ({
  page,
}) => {
  desktopOnly();
  await toA3(page);
  await playA3(page);
  await passRuleA(page);
  await advanceToParentNote(page);
  await saveParentNote(page, { fingers: 'some', mouth: 'none', note: 'ใช้นิ้วบางข้อ' });
  // 19 = started 1 + block.started 2 + answered 12 + block.completed 2 + parent.noted 1 + completed 1
  const db = await assertSitting1Events(page, 19, true);
  const n = one(db, 'parent.noted');
  expect(n.blockKind).toBe('A');
  expect(n.fingers).toBe('some');
  expect(n.mouth).toBe('none');
  expect(n.note).toBe('ใช้นิ้วบางข้อ');
  expect(Date.parse(n.at)).toBeLessThan(Date.parse(one(db, 'session.completed').at));
  // การ์ดหน้าหลัก
  await gotoHash(page, '#/');
  const card = page.getByRole('link', { name: /ช่องว่างและเติมให้เต็มสิบ/ });
  await expect(card).toContainText('ครั้งที่ 2');
  const links = await page.locator('main a').allInnerTexts();
  expect(links[0], 'การ์ดของบทมาก่อน DX-ADD').toContain('ช่องว่างและเติมให้เต็มสิบ');
  expect(links.some((t) => t.includes('ภารกิจสำรวจการบวก'))).toBe(true);
  const home = await pageNorm(page);
  expect(home).not.toContain(norm('ทบทวนวันนี้'));
  expect(home).not.toContain(norm('ท่องซ้ำ 2 นาที'));
  // แก้ภายหลังที่หน้าพ่อของบท
  await gotoHash(page, '#/parent/lesson/ADD-04');
  await expectPageHas(page, 'ใช้นิ้วบางข้อ', 'บันทึกเดิม');
  await saveParentNote(page, { fingers: 'most', mouth: 'some', note: 'แก้ไขแล้ว' });
  await expect
    .poll(async () => ofType(await readDb(page), 'parent.noted').length, { timeout: 10_000 })
    .toBe(2);
  await expectPageHas(page, 'แก้ไขแล้ว', 'ค่าล่าสุด');
  expect(await pageHas(page, 'ใช้นิ้วบางข้อ'), 'แสดงเฉพาะค่าล่าสุด').toBe(false);
  const after = await readDb(page);
  expect(after.events, 'log เพิ่มอย่างเดียว').toHaveLength(20);
  expect(ofType(after, 'session.completed')).toHaveLength(1);
});

test('TC-E04 บันทึกของพ่อ: กด "ข้าม" ไม่มี parent.noted (event 18 ตัว) และโน้ตยาวเกิน 200 ตัวอักษรไม่ถูกเก็บเกิน (AC18)', async ({
  page,
}) => {
  desktopOnly();
  await toA3(page);
  await playA3(page);
  await passRuleA(page);
  await advanceToParentNote(page);
  const noteBox = page.getByRole('textbox', { name: /โน้ต/ }).first();
  await noteBox.fill('ก'.repeat(250));
  expect((await noteBox.inputValue()).length, 'โน้ต ≤ 200 ตัวอักษร').toBeLessThanOrEqual(200);
  await skipParentNote(page);
  // 18 = 19 − parent.noted
  await assertSitting1Events(page, 18, false);
});

// =============================================================== P. หน้าพ่อของบท

async function detailTable(page: Page): Promise<{ heads: string[]; rows: string[][] }> {
  return page.evaluate(() => {
    for (const t of Array.from(document.querySelectorAll('table'))) {
      const headRow = t.querySelector('thead tr') ?? t.querySelector('tr');
      const heads = Array.from(headRow?.querySelectorAll('th,td') ?? []).map((th) =>
        (th.textContent ?? '').trim(),
      );
      if (!heads.some((h) => h.includes('โจทย์'))) continue;
      const rows = Array.from(t.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th,td')).map((td) => (td.textContent ?? '').trim()),
      );
      return { heads, rows };
    }
    return { heads: [], rows: [] };
  });
}

test('TC-P01 หน้าพ่อ /parent/lesson/ADD-04: ผลรายส่วน ของจริงที่ต้องเตรียม Number Talks และคำถามต่อยอดตรง LS ตัวอักษร ตารางรายข้อ (AC1, AC17, LS §4, §5, §7, §10)', async ({
  page,
}) => {
  desktopOnly();
  await toA3(page);
  await playA3(page, {
    'A3.2': { ms: 1500, s: 'see-number' },
    'A3.6': { r: 19, s: 'count-fingers' },
  });
  await passRuleA(page);
  await advanceToParentNote(page);
  await skipParentNote(page);
  await settledDb(page, 18);
  await gotoHash(page, '#/parent/lesson/ADD-04');
  await expectPageHas(page, 'Number Talks', 'หน้าพ่อของบท');
  const body = await pageNorm(page);
  // ของจริงที่ต้องเตรียม (LS §4)
  for (const s of MATERIALS) expect(body, `ของจริง: ${s}`).toContain(norm(s));
  // Number Talks (LS §5) ตรงตัวอักษร
  for (const s of [
    ...NUMBER_TALKS.problems,
    'ถ้าเหลือเวลา 7 + 4',
    ...NUMBER_TALKS.openQuestions,
    NUMBER_TALKS.curious,
    ...NUMBER_TALKS.heard,
    ...NUMBER_TALKS.dontSay,
  ]) {
    expect(body, `Number Talks: ${s}`).toContain(norm(s));
  }
  // คำถามต่อยอดปริศนา (LS §7)
  for (const s of CHALLENGE_EXTENSION) expect(body, `ต่อยอด: ${s}`).toContain(norm(s));
  // ผลรายส่วน: A ผ่าน
  expect(body, 'ผลของส่วน A').toContain(norm('ผ่าน'));
  // ตารางรายข้อ (เหมือน DX-ADD §5.7): เช็คก่อน 6 ข้อ + A3 6 ข้อ
  const { heads, rows } = await detailTable(page);
  expect(rows, 'ตารางรายข้อ 12 แถว').toHaveLength(12);
  const col = (re: RegExp): number => heads.findIndex((h) => re.test(h));
  const cId = col(/^ข้อ/);
  const cRes = col(/ถูก/);
  const cTime = col(/เวลา/);
  const cMind = col(/ในหัว/);
  const cMis = col(/เข้าใจผิด/);
  for (const c of [cId, cRes, cTime, cMind, cMis])
    expect(c, `หัวตาราง ${heads.join('|')}`).toBeGreaterThanOrEqual(0);
  const row = (id: string): string[] => {
    const r = rows.find((x) => x[cId] === id);
    expect(r, `ไม่พบแถว ${id}`).toBeDefined();
    return r as string[];
  };
  expect(row('A3.1')[cRes]).toContain('ถูก');
  expect(row('A3.1')[cTime]).toMatch(/^1\.0/);
  expect(row('A3.1')[cMind]).toContain('เห็นกล่อง 10 ช่อง');
  expect(row('A3.2')[cTime], 'เวลาทศนิยม 1 ตำแหน่ง').toMatch(/^1\.5/);
  expect(row('A3.2')[cMind]).toContain('นึกเป็นตัวเลข');
  expect(row('A3.6')[cRes]).toContain('ผิด');
  expect(row('A3.6')[cMis]).toContain('M4');
  expect(row('A3.6')[cMind]).toContain('นับนิ้ว');
  // 360px: หน้าไม่เลื่อนแนวนอน ตารางเลื่อนในกล่องของตัวเอง
  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForTimeout(200);
  expect(await noHorizontalScroll(page), 'หน้าพ่อที่ 360px').toBe(true);
  const scrollable = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('table')).find((x) =>
      (x.textContent ?? '').includes('โจทย์'),
    );
    for (let p: Element | null = t ?? null; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return (t?.getBoundingClientRect().width ?? 9999) <= innerWidth;
  });
  expect(scrollable, 'ตารางเลื่อนแนวนอนภายในกล่อง').toBe(true);
  const small = await smallestButton(page);
  expect(small?.h ?? 99, `ปุ่มที่เล็กสุด "${small?.name}"`).toBeGreaterThanOrEqual(47.5);
});

// =============================================================== R. ใช้งานผิดปกติ

test('TC-R01 tap guard 400 ms ที่ปุ่ม "ต่อไป" และตัวเลือก "ในหัวเห็นอะไร": แตะเบิ้ลไม่ทะลุไปหน้าถัดไป แตะที่ 450 ms รับ (Tech §3.4, §3.5)', async ({
  page,
}) => {
  desktopOnly();
  await toA1(page);
  await typeSubmit(page, 2);
  await expectPageHas(page, okA(2, 8));
  await guard(page);
  const next = page.getByRole('button', { name: 'ต่อไป', exact: true });
  await next.click();
  // ไปข้อ A1.2 แล้ว: ที่ 150 ms พิมพ์ไม่รับ ที่ 450 ms รับ
  await expectPageHas(page, MSG.askFill);
  expect(await dotCount(page)).toBe(6);
  await tick(page, 150);
  await keyButton(page, '4').click();
  expect(await submitEnabled(page), 'ที่ 150 ms ต้องถูกทิ้ง').toBe(false);
  await tick(page, 300);
  await keyButton(page, '4').click();
  expect(await submitEnabled(page), 'ที่ 450 ms ต้องรับ').toBe(true);
  // แตะเบิ้ลที่ "ต่อไป" ของ A1.2: ต้องไปแค่ข้อเดียว
  await page.keyboard.press('Backspace');
  await typeSubmit(page, 4);
  await expectPageHas(page, okA(4, 6));
  await guard(page);
  await page.getByRole('button', { name: 'ต่อไป', exact: true }).dblclick();
  await expectPageHas(page, MSG.askFill);
  expect(await dotCount(page), 'ต้องอยู่ที่ A1.3 (3 จุด) ไม่ข้ามไป A2').toBe(3);
  await tick(page, 450);
  expect(await dotCount(page)).toBe(3);
  expect(await submitEnabled(page), 'ไม่มีอะไรถูกพิมพ์จากแตะซ้ำ').toBe(false);
  expect(await bondState(page)).toEqual({ whole: '10', a: '3', b: 'ยังไม่รู้' });
});

test('TC-R02 tap guard ที่ตัวเลือก "ในหัวเห็นอะไร": แตะเบิ้ลเลือกแล้ว "ต่อไป" ต้องไม่ถูกกดทะลุ (Tech §3.5)', async ({
  page,
}) => {
  desktopOnly();
  await toA3(page);
  const p = await readGapProblem(page);
  await guard(page);
  await typeSubmit(page, p.e);
  await expectPageHas(page, MSG.mindQuestion);
  await adv(page, 600);
  await page
    .locator('main button')
    .filter({ hasText: new RegExp(`^${MIND_LABEL['see-box']}`) })
    .first()
    .dblclick();
  const next = page.getByRole('button', { name: 'ต่อไป', exact: true });
  await expect(next).toBeVisible();
  await tick(page, 100);
  await expect(next, 'แตะซ้ำต้องไม่เลื่อนไปข้อถัดไป').toBeVisible();
  expect(await page.getByText('? + 4 = 10', { exact: true }).count(), 'ยังไม่ขึ้นโจทย์ A3.2').toBe(
    0,
  );
  await tick(page, 400);
  await next.click();
  await expect(page.getByText('? + 4 = 10', { exact: true })).toBeVisible();
});

test('TC-R03 reload กลางส่วน A (เวลาจริง): event เดิมไม่หายไม่ซ้ำ ส่วน A เริ่มใหม่ทั้งส่วน ไม่นับข้อของส่วนที่ไม่จบ ไม่เช็คก่อนซ้ำ (Tech §5.1, §6.3, §6.5)', async ({
  page,
}) => {
  desktopOnly();
  test.setTimeout(300_000);
  await startLesson(page, { fake: false });
  // c1 ผิด (เร็ว) เพื่อให้เห็น A1; ทุกข้อรอสั้นๆ ให้ทั้งเช็คก่อนจบใน ~15 วินาที
  const quick: Plan = { c1: { r: 1, ms: 100 }, c2: { ms: 100 }, c3: { ms: 100 } };
  for (const id of ['c4', 'c5', 'c6']) quick[id] = { ms: 100 };
  await playCheck(page, quick);
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
  await clickGo(page);
  await expectPageHas(page, MSG.askFill, 'A1.1');
  await guard(page);
  await typeSubmit(page, 2);
  await expectPageHas(page, okA(2, 8));
  await clickNext(page);
  await expectPageHas(page, MSG.askFill, 'A1.2');
  const before = await readDbWhen(page, 11); // started + check(2) + 6 + A started + A1.1
  const beforeIds = before.events.map((e) => e.id);
  const beforeSession = one(before, 'session.started').sessionId;
  await page.reload();
  // หลัง reload: ข้อมูลเดิมอยู่ครบ ไม่ซ้ำ
  const mid = await readDbWhen(page, beforeIds.length);
  expect(mid.events.map((e) => e.id)).toEqual(expect.arrayContaining(beforeIds));
  // เริ่มใหม่: เช็คก่อนไม่ต้องทำซ้ำ (มี block.completed แล้ว) ขึ้นส่วน A เริ่มใหม่ทั้งส่วน
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);
  const homeLink = page.getByRole('link', { name: /ช่องว่างและเติมให้เต็มสิบ/ });
  if (await homeLink.isVisible()) await homeLink.click();
  await enterLesson(page);
  expect(norm(await mainText(page)), 'ต้องเป็นหน้าเปิดส่วน A ไม่ใช่เช็คก่อน').toContain(
    norm(INTRO.A),
  );
  expect(norm(await mainText(page))).not.toContain(norm(INTRO.check));
  await clickGo(page);
  await expectPageHas(page, MSG.askFill, 'A1.1 (เริ่มส่วน A ใหม่)');
  expect(await dotCount(page)).toBe(8);
  await guard(page);
  await passA1(page);
  await playA2(page);
  await playA3(page);
  await passRuleA(page);
  await advanceToParentNote(page);
  await skipParentNote(page);
  await expect
    .poll(async () => ofType(await readDb(page), 'session.completed').length, { timeout: 15_000 })
    .toBe(1);
  const db = await readDb(page);
  for (const id of beforeIds)
    expect(
      db.events.some((e) => e.id === id),
      `event เดิม ${id} ยังอยู่`,
    ).toBe(true);
  expect(new Set(db.events.map((e) => e.id)).size, 'id ไม่ซ้ำ').toBe(db.events.length);
  const a = blocksOf(db, 'A');
  expect(a.started.length, 'block A ที่ไม่จบ + block A ใหม่').toBe(2);
  expect(a.completed, 'มี block.completed แค่ของรอบที่จบ').toHaveLength(1);
  expect(a.completed[0]?.blockId).toBe(a.started[1]?.blockId);
  expect(answeredOf(db, 'A1.1'), 'A1.1 ทั้งของเดิมและของใหม่ยังอยู่').toHaveLength(2);
  expect(asObj(a.completed[0]?.metrics).total, 'ผลนับเฉพาะข้อของ block ที่จบ').toBe(6);
  expect(ofType(db, 'block.started').filter((b) => b.blockKind === 'check')).toHaveLength(1);
  expect(ofType(db, 'session.completed')).toHaveLength(1);
  expect(beforeSession).toBeTruthy();
});

test('TC-R04 พ่อกดค้างโลโก้หยุดกลางส่วน A: session.abandoned ตัวท้าย ไม่มี block.completed ข้อที่ยังไม่ผ่านคำถามในหัวเห็นอะไรไม่ถูกบันทึก (Tech §5.4)', async ({
  page,
}) => {
  desktopOnly();
  await toA3(page);
  // A3.1 ตอบและเลือกวิธีคิดครบ → หน้า "ต่อไป"
  await playA3Partial(page, 1);
  // A3.2 ตอบตัวเลขแล้ว (อยู่ที่หน้า "ในหัวเห็นอะไร") แต่ยังไม่เลือก
  await guard(page);
  await readGapProblem(page);
  await adv(page, 800);
  await typeSubmit(page, 6);
  await expectPageHas(page, MSG.mindQuestion);
  await longPressLogo(page, 2000, true);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'ข้ามส่วนนี้' })).toBeVisible();
  await dialog.getByRole('button', { name: /^หยุด/ }).click();
  await expect
    .poll(async () => ofType(await readDb(page), 'session.abandoned').length, { timeout: 10_000 })
    .toBe(1);
  const db = await readDb(page);
  expect(ofType(db, 'session.completed')).toHaveLength(0);
  expect(db.events[db.events.length - 1]?.type).toBe('session.abandoned');
  expect(blocksOf(db, 'A').completed, 'ส่วน A ที่ไม่จบไม่มี block.completed').toHaveLength(0);
  expect(answeredOf(db, 'A3.1')).toHaveLength(1);
  expect(answeredOf(db, 'A3.2'), 'ข้อที่ยังไม่ผ่านคำถามวิธีคิดไม่ถูกบันทึก').toHaveLength(0);
  expect(asObj(one(db, 'session.abandoned').summary).kind).toBe('lesson');
  expectSessionOrder(db.events, 'หยุดกลางทาง');
});

/** เล่น A3 ทีละข้อจนครบ k ข้อ (ทุกข้อตอบถูก เลือกเห็นกล่อง) แล้วหยุดที่หน้าของข้อถัดไป */
async function playA3Partial(page: Page, k: number): Promise<void> {
  for (let i = 1; i <= k; i++) {
    const p = await readGapProblem(page);
    await guard(page);
    await adv(page, 550);
    await typeSubmit(page, p.e);
    await expectPageHas(page, MSG.mindQuestion);
    await adv(page, 600);
    await page
      .locator('main button')
      .filter({ hasText: new RegExp(`^${MIND_LABEL['see-box']}`) })
      .first()
      .click();
    await clickNext(page);
  }
}

test('TC-R05 พ่อกด "ข้ามส่วนนี้" ในส่วน A → block.completed outcome skipped/manual; ในเช็คก่อนไม่มีปุ่ม "ข้ามส่วนนี้" (Tech §5.4)', async ({
  page,
}) => {
  desktopOnly();
  await startLesson(page);
  await clickGo(page);
  await expect(page.getByText(MSG.ready)).toBeVisible();
  await tick(page, 2600);
  await expect(page.getByText(MSG.hiddenGap)).toBeVisible();
  await longPressLogo(page, 2000, true);
  let dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'ข้ามส่วนนี้' }),
    'เช็คก่อนข้ามไม่ได้',
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // ทำเช็คก่อนที่เหลือจนถึงส่วน A
  await typeSubmit(page, 3);
  await tick(page, 1000);
  await playCheck(page, {}, undefined, { intro: false, from: 1 });
  await expect(page.getByRole('button', { name: 'ไปเลย' })).toBeVisible();
  await clickGo(page);
  await guard(page);
  await readGapProblem(page);
  await longPressLogo(page, 2000, true);
  dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'ข้ามส่วนนี้' }).click();
  const b = await waitBlock(page, 'A', 'completed');
  expect(b.completed[0]?.outcome).toBe('skipped');
  expect(b.completed[0]?.skipReason).toBe('manual');
});

// =============================================================== D. dark mode, reduced motion

test('TC-D01 dark mode: ข้อความทุกหน้าที่ตรวจ ≥ WCAG AA (เช็คก่อน, A1, A2, A3) พื้นหลังเข้ม (AC21)', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const problems: string[] = [];
  const audit: Obs = async (label, pg) => {
    if (
      /^(intro-check|flash-show-c1|item-c4|ack-c4|intro-A|a1-A1\.1|a1-ok-A1\.1|flash-show-A2\.1|reveal-A2\.1|item-A3\.1|mind-A3\.1|after-mind-A3\.1|rule-A)$/.test(
        label,
      )
    ) {
      for (const p of await lowContrast(pg)) problems.push(`${label}: ${p}`);
    }
  };
  await fullSitting1(page, audit);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg, 'พื้นหลังต้องเป็นสีเข้ม').toBe('rgb(18, 26, 22)');
  expect(problems).toEqual([]);
});

test('TC-D02 จุดสี "เติมเพิ่ม" มองเห็นชัด: contrast ตาม Tech §3.4 ทั้ง light และ dark (AC21)', async ({
  page,
}) => {
  await openApp(page);
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForTimeout(100);
    const c = await tokenContrast(page);
    expect(
      Math.max(c.addedVsSurface, c.edgeVsSurface),
      `${scheme}: สีเติมหรือเส้นขอบต้อง ≥ 3:1 กับพื้น (${JSON.stringify(c)})`,
    ).toBeGreaterThanOrEqual(3);
    expect(c.addedVsA, `${scheme}: สีเติมต่างจาก group-a`).toBeGreaterThanOrEqual(1.5);
    expect(c.addedVsB, `${scheme}: สีเติมต่างจาก group-b`).toBeGreaterThanOrEqual(1.5);
  }
});

test('TC-M01 reduced motion: A1 ไม่มี transition/animation ที่กำลังเล่น (แตะช่อง ตอบผิด ตอบถูกกะพริบเป็นวงแหวนคงที่) (AC20)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toA1(page);
  const animating = (): Promise<number> => page.evaluate(() => document.getAnimations().length);
  await tapCell(page, 8, isTouch());
  expect(await animating(), 'หลังแตะช่อง').toBe(0);
  await typeSubmit(page, 8); // L1 → ไฮไลต์
  await expectPageHas(page, MSG.L1);
  expect(await animating(), 'หลังตอบผิด (วงแหวนไฮไลต์)').toBe(0);
  const ring1 = await ringedCells(page);
  await page.waitForTimeout(700);
  expect(await ringedCells(page)).toEqual(ring1);
  await guard(page);
  for (let i = 0; i < 3 && (await submitEnabled(page)); i++) await page.keyboard.press('Backspace');
  await typeSubmit(page, 2);
  await expectPageHas(page, okA(2, 8));
  expect(await animating(), 'หลังตอบถูก (กะพริบส่วนที่เติม)').toBe(0);
});
