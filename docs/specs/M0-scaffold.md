# Tech Spec M0: โครงโปรเจกต์ (scaffold)

- อ้างอิง Lesson Spec: ไม่มี (milestone โครงสร้าง ไม่มีเนื้อหาบทเรียน)
- สถานะ: พัฒนาเสร็จ รอ Architect ตรวจ
- ADR ที่เกี่ยวข้อง: 0001 deploy, 0002 stack, 0003 storage, 0004 content, 0005 manipulatives, 0007 testing
- อ้างอิง: [overview](../architecture/overview.md) §2–§8
- วันที่: 2026-09-29

## 1. สรุปสิ่งที่ต้องสร้าง

โปรเจกต์ Vite + React + TypeScript ที่ deploy ขึ้น GitHub Pages ได้จริง ติดตั้งเป็น PWA ได้ ใช้ offline ได้ และมีโครงครบทุกชั้น (app / ui / manipulatives / engine / content / store / styles) โดย**ยังไม่มีเนื้อหาบทเรียน**

สิ่งที่ผู้ใช้เห็นใน M0
- หน้าหลัก: ตั้งชื่อเล่นผู้เรียนครั้งแรก แล้วแสดงคำทักทาย
- หน้าสำหรับพ่อ (กดค้างที่โลโก้ 2 วินาที): export/import, สถานะการเก็บข้อมูล, ตั้งค่าธีม
- หน้า Play และหน้า DevManipulatives เป็น placeholder

สิ่งที่อยู่เบื้องหลัง: `ProgressStore` (IndexedDB + Memory) พร้อมชุดเทสต์ร่วม, migrations, export/import, outbox, ขอ persistent storage, CI ที่ lint → test → e2e → build → deploy

**แป้นตัวเลขไม่อยู่ใน M0** ย้ายไป M1 เพราะรายละเอียด (จำนวนหลัก ข้อความปุ่ม ข้อความช่องว่าง) มาจาก Lesson Spec DX-ADD และ M0 ไม่มีที่ใช้ (ตรงกับ overview §9 เดิม)

## 2. การจับคู่ความต้องการ → ระบบ

| ความต้องการ | ที่อยู่ในระบบ | หมายเหตุ |
|---|---|---|
| ADR-0001 static PWA, hash routing, GitHub Pages | `vite.config.ts`, `src/app/App.tsx`, `.github/workflows/ci.yml` | §4.3, §5.2, §5.6 |
| ADR-0002 React + TS strict + CSS Modules + ESLint/Prettier | `tsconfig.*.json`, `eslint.config.js`, `.prettierrc.json` | §4.5–§4.6 |
| ADR-0003 IndexedDB event log, export/import, persist, schemaVersion | `src/store/*` | §5.3 |
| ADR-0007 Vitest + Testing Library + Playwright 4 project | `vite.config.ts` (test), `playwright.config.ts`, `tests/e2e/` | §5.5 |
| N2 ฟอนต์ self-host | `src/styles/fonts.ts` | §5.1 |
| N3 token + dark mode | `src/styles/tokens.css`, `src/app/theme.ts` | §5.1 |
| N4 ไม่มี request ภายนอก | e2e ตรวจ request ทุกตัวเป็น host เดียวกัน | §5.5 ข้อ 8, AC10 |
| overview §5 ทางเข้าหน้าพ่อ กดค้าง 2 วินาที | `src/ui/useLongPress.ts`, `src/app/Layout.tsx` | §5.2 |

## 3. อุปกรณ์จำลองที่ใช้

ไม่มีใน M0 สร้างโฟลเดอร์ `src/manipulatives/` เปล่า (มี `.gitkeep`) และหน้า `/#/dev/manipulatives` แสดงข้อความ placeholder

## 4. ไฟล์และการตั้งค่า

### 4.1 Package

ติดตั้ง**เวอร์ชันเสถียรล่าสุด ณ วันที่ทำ** (ADR-0002) บันทึกแบบ `^` และ commit `package-lock.json` ถ้า `vite-plugin-pwa` ยังไม่รองรับ Vite major ล่าสุด ให้ใช้ Vite major สูงสุดที่ `vite-plugin-pwa` รองรับ แล้วระบุในรายงานส่งงาน

| ประเภท | Package | ใช้ทำอะไร |
|---|---|---|
| runtime | `react`, `react-dom` | UI |
| runtime | `react-router` (v7+) | `HashRouter` (import จาก `react-router`) |
| runtime | `idb` | IndexedDB (ADR-0003) |
| runtime | `@fontsource/kodchasan`, `@fontsource/noto-sans-thai` | ฟอนต์ self-host |
| dev | `vite`, `@vitejs/plugin-react`, `typescript` | build |
| dev | `@types/react`, `@types/react-dom`, `@types/node` | type |
| dev | `vite-plugin-pwa`, `workbox-window` | manifest + service worker (`workbox-window` จำเป็นสำหรับ `virtual:pwa-register/react`) |
| dev | `@vite-pwa/assets-generator` | สร้าง icon PNG/ICO จาก SVG ต้นฉบับ (รันมือครั้งเดียว แล้ว commit ผลลัพธ์) |
| dev | `vitest`, `jsdom` | unit/component test |
| dev | `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom` | component test |
| dev | `fake-indexeddb` | เทสต์ `IndexedDbStore` |
| dev | `@playwright/test` | e2e |
| dev | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `globals` | lint |
| dev | `prettier` | format |

ห้ามเพิ่ม package อื่น (เช่น zod, uuid, date-fns, clsx, state library, UI kit) ถ้าคิดว่าจำเป็นให้ถาม Architect

`package.json`
- `"name": "learning-platform"`, `"private": true`, `"type": "module"`
- `"engines": { "node": ">=24" }` และไฟล์ `.nvmrc` = `24`

### 4.2 Scripts

| script | คำสั่ง |
|---|---|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `e2e` | `playwright test` |
| `lint` | `eslint . --max-warnings=0 && prettier --check . && tsc -b` |
| `format` | `prettier --write .` |
| `icons` | `pwa-assets-generator` |

`tsc -b` ใช้เป็น type check (ทุก tsconfig ตั้ง `noEmit: true`)

### 4.3 Vite (`vite.config.ts`)

- ใช้ `defineConfig` จาก `vitest/config` เพื่อรวม config ของ Vitest ไว้ไฟล์เดียว
- `base: '/Learning-Platform/'`
- `resolve.alias`: `'@'` → `src/`
- plugins: `react()`, `VitePWA({...})`

```ts
VitePWA({
  registerType: 'prompt',          // ห้าม autoUpdate: จะ reload กลางแบบทดสอบ
  injectRegister: false,           // ลงทะเบียนเองผ่าน useRegisterSW (§5.2)
  includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
  manifest: {
    id: '/Learning-Platform/',
    name: 'บทเรียนคณิตศาสตร์',     // ชื่อชั่วคราว รอพ่อตั้ง (คำถามเปิด Q1)
    short_name: 'คณิต',
    description: 'ฝึกคิดเลขให้เห็นภาพในหัว ทำกับพ่อที่บ้าน',
    lang: 'th',
    dir: 'ltr',
    start_url: '/Learning-Platform/',
    scope: '/Learning-Platform/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F2F7F3',   // manifest ใช้ CSS variable ไม่ได้ ข้อยกเว้นเดียวของกฎ "ห้ามใส่สีตรง"
    theme_color: '#F2F7F3',
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
    cleanupOutdatedCaches: true,
  },
  devOptions: { enabled: false },
})
```

- Icon: วาด `public/icon.svg` เป็นรูปเรียบง่าย (ten-frame 2×5 จุดสีส้มบนพื้นเขียวอ่อน มุมโค้ง) ใช้เป็นโลโก้ในแอปด้วย ตั้ง `pwa-assets.config.ts` ใช้ `minimal2023Preset` กับ `images: ['public/icon.svg']` รัน `npm run icons` แล้ว commit PNG/ICO ที่ได้ใน `public/`
- `test` (Vitest): `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`, `restoreMocks: true`

### 4.4 `index.html`

- `<html lang="th">`
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (ห้ามใส่ `user-scalable=no` หรือ `maximum-scale`)
- `<meta name="theme-color" content="#F2F7F3" media="(prefers-color-scheme: light)">` และ `content="#121A16"` สำหรับ dark
- `<link rel="icon" href="/favicon.ico">`, `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">` (Vite เติม base ให้ตอน build ตรวจใน AC11)
- `<title>บทเรียนคณิตศาสตร์</title>`

### 4.5 TypeScript

โครงแบบ template `react-ts` ของ Vite: `tsconfig.json` (references เท่านั้น) + `tsconfig.app.json` (`src/`) + `tsconfig.node.json` (`vite.config.ts`, `playwright.config.ts`, `pwa-assets.config.ts`, `tests/e2e/**`)

ตัวเลือกที่ต้องมีใน `tsconfig.app.json`
```jsonc
{
  "target": "ES2022", "lib": ["ES2023", "DOM", "DOM.Iterable"],
  "module": "ESNext", "moduleResolution": "bundler", "jsx": "react-jsx",
  "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true, "noUnusedLocals": true, "noUnusedParameters": true,
  "verbatimModuleSyntax": true, "isolatedModules": true, "skipLibCheck": true, "noEmit": true,
  "types": ["vite/client", "vite-plugin-pwa/react"],
  "baseUrl": ".", "paths": { "@/*": ["src/*"] }
}
```
- ไม่ใช้ Vitest globals ให้ import `describe/it/expect/vi` จาก `vitest` ตรงๆ
- `tsconfig.node.json` ใช้ `lib: ["ES2023", "DOM"]` (e2e ใช้ `page.evaluate`)

### 4.6 ESLint (`eslint.config.js`, flat config) และ Prettier

- `@eslint/js` recommended + `typescript-eslint` `recommendedTypeChecked` (ใช้ `parserOptions.projectService: true`) + `react-hooks` recommended + `react-refresh` (`only-export-components`, warn) + `eslint-config-prettier` ไว้ท้ายสุด
- กฎเพิ่ม
  - `@typescript-eslint/no-explicit-any: 'error'` ทุกไฟล์
  - `no-console: ['error', { allow: ['warn', 'error'] }]`
  - `@typescript-eslint/consistent-type-imports: 'error'`
- ignores: `dist`, `coverage`, `playwright-report`, `test-results`, `dev-dist`, `public`
- `.prettierrc.json`: `{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }`
- `.prettierignore`: `dist`, `coverage`, `playwright-report`, `test-results`, `public`, `package-lock.json`, `**/*.md` (ห้าม Prettier จัดรูปเอกสารที่อนุมัติแล้ว)

### 4.7 ทิศทางการ import (บังคับด้วย ESLint)

- ข้ามชั้นต้องใช้ alias `@/<ชั้น>/...` เท่านั้น relative import (`./`, `../`) ใช้ได้เฉพาะภายในชั้นเดียวกัน
- บังคับด้วย `@typescript-eslint/no-restricted-imports` แยก `files` ตามชั้น ใช้ `patterns` แบบ `regex` ซึ่งจับทั้งแบบ alias และ relative เช่น `^(@/|(\.\./)+)(app|ui|manipulatives|store)(/|$)` และใช้ `allowTypeImports: true` กับกฎที่อนุญาตเฉพาะ type

| ไฟล์ใน | import ได้ | ห้าม |
|---|---|---|
| `src/app/**` | ทุกชั้น | — |
| `src/ui/**` | `react` | `app`, `store`, `engine`, `content`, `manipulatives` |
| `src/manipulatives/**` | `react`, `ui` | `app`, `store`, `engine`, `content` |
| `src/engine/**` | `content` (**type เท่านั้น**) | `react*`, `app`, `ui`, `manipulatives`, `store` |
| `src/store/**` | `idb`, `engine` (**type เท่านั้น**) | `react*`, `app`, `ui`, `manipulatives`, `content` |
| `src/content/**` | `engine/types` (type เท่านั้น), `engine/generators/**` | `react*`, `app`, `ui`, `manipulatives`, `store`, ส่วนอื่นของ `engine` |
| โค้ด production ทุกชั้น | — | `src/test/**` |

ตอนทำงานนี้ Developer ต้องลองเขียน import ผิด 1 จุดต่อชั้นในเครื่อง ดูว่า lint ล้ม แล้วลบทิ้ง (บันทึกผลในรายงาน ไม่ commit)

### 4.8 โครงโฟลเดอร์ที่ต้องมีหลัง M0

```
.github/workflows/ci.yml
.nvmrc  .prettierrc.json  .prettierignore  eslint.config.js
index.html  package.json  package-lock.json
playwright.config.ts  pwa-assets.config.ts  vite.config.ts
tsconfig.json  tsconfig.app.json  tsconfig.node.json
public/        icon.svg + ไฟล์ที่ generate (favicon.ico, pwa-*.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png)
src/
  main.tsx                     import fonts, tokens.css, global.css → applyTheme() → render <App/>
  app/
    App.tsx                    HashRouter + routes + ProgressProvider
    Layout.tsx(+.module.css)   header (โลโก้ กดค้าง) + <Outlet/>
    ProgressProvider.tsx       เปิด store, outbox, learner ปัจจุบัน, persist (§5.3.11)
    UpdateBanner.tsx           แจ้งเวอร์ชันใหม่ (§5.2)
    theme.ts                   อ่าน/บันทึก/ใช้ธีม (§5.1)
    strings.ts                 ข้อความ UI ของหน้าที่ไม่ใช่เนื้อหาบทเรียน (§5.4)
    routes/Home.tsx  Play.tsx  Parent.tsx  DevManipulatives.tsx  (+ .module.css)
  ui/
    Button.tsx(+.module.css)   ปุ่มมาตรฐาน ≥ 48px
    Logo.tsx                   SVG โลโก้ (ใช้แบบเดียวกับ icon.svg)
    useLongPress.ts(+.test.tsx)
  manipulatives/.gitkeep
  engine/types.ts              Learner, EventBase, AppEvent, Problem (ตาม overview §4)
  content/registry.ts          export const diagnostics = {} / lessons = {} (ยังว่าง)
  content/content.test.ts      วนตรวจทุกอย่างใน registry (ผ่านได้แม้ยังว่าง)
  store/
    ProgressStore.ts           interface + type ของ query/meta
    MemoryStore.ts  IndexedDbStore.ts
    progressStore.contract.ts  ชุดเทสต์ร่วม
    MemoryStore.test.ts  IndexedDbStore.test.ts
    migrations.ts(+.test.ts)  exportImport.ts(+.test.ts)  outbox.ts(+.test.ts)
    persist.ts  ids.ts(+.test.ts)
  styles/tokens.css  global.css  fonts.ts
  test/setup.ts
tests/e2e/smoke.spec.ts
```

## 5. รายละเอียดการทำงาน

### 5.1 Style, ฟอนต์ และธีม

**`src/styles/fonts.ts`** import เฉพาะ subset ที่ใช้ (ลดขนาด precache)
```ts
import '@fontsource/kodchasan/thai-400.css';   import '@fontsource/kodchasan/latin-400.css';
import '@fontsource/kodchasan/thai-600.css';   import '@fontsource/kodchasan/latin-600.css';
import '@fontsource/kodchasan/thai-700.css';   import '@fontsource/kodchasan/latin-700.css';
import '@fontsource/noto-sans-thai/thai-400.css'; import '@fontsource/noto-sans-thai/latin-400.css';
import '@fontsource/noto-sans-thai/thai-500.css'; import '@fontsource/noto-sans-thai/latin-500.css';
import '@fontsource/noto-sans-thai/thai-700.css'; import '@fontsource/noto-sans-thai/latin-700.css';
```
ถ้าชื่อไฟล์ subset ในเวอร์ชันที่ติดตั้งต่างจากนี้ ให้ใช้ไฟล์ subset ที่มีจริง ถ้าไม่มีแบบแยก subset ให้ใช้ `<weight>.css`

**`src/styles/tokens.css`** ค่าตาม overview §6 ทุกตัว และ dark mode ต้องมีครบ 2 ทาง
```css
:root { color-scheme: light; /* ค่า light ตาม overview §6 */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { color-scheme: dark; /* ค่า dark */ }
}
:root[data-theme='dark'] { color-scheme: dark; /* ค่า dark ชุดเดียวกัน */ }
```
เพิ่ม token: `--space-1..6` (4, 8, 12, 16, 24, 32px), `--font-size-body: 1.125rem`, `--line-height-body: 1.6` (สระและวรรณยุกต์ไทยซ้อนกัน ต้องมีระยะบรรทัดพอ), `--focus-ring: 3px solid var(--color-accent)`

**`src/styles/global.css`**
- `*, *::before, *::after { box-sizing: border-box }`
- `body`: `margin: 0`, พื้น/สีตัวอักษร/ฟอนต์จาก token, `min-height: 100dvh`
- `h1–h3`: `font-family: var(--font-heading)`
- `button`: `font: inherit`, `min-height: var(--tap-min)`, `touch-action: manipulation`
- `:focus-visible { outline: var(--focus-ring); outline-offset: 2px }`
- `@media (prefers-reduced-motion: reduce)`: ตั้ง `transition-duration` และ `animation-duration` เป็น `0.01ms !important` ทุก element (component ห้ามพึ่ง `transitionend` เพื่อเดินงานต่อ ให้ใช้ timer)
- **ห้าม** ใส่ `overflow-x: hidden` ที่ `html`/`body` เพื่อซ่อนปัญหา scroll แนวนอน

**ธีม (`src/app/theme.ts`)**
- `type ThemePref = 'system' | 'light' | 'dark'` เก็บใน `localStorage` key `lp.theme` (ครอบ try/catch ถ้าอ่านไม่ได้ใช้ `'system'`)
- `applyTheme(pref)`: `'system'` → ลบ `data-theme` ออกจาก `<html>`, อื่นๆ → ตั้ง `data-theme`
- เรียก `applyTheme(readTheme())` ใน `main.tsx` ก่อน render
- ธีมเป็นค่าของเครื่อง ไม่ใช่ข้อมูลความก้าวหน้า จึงไม่อยู่ใน store และไม่อยู่ในไฟล์ export

### 5.2 Routing, layout และ PWA update

`HashRouter` + routes

| path | component | หมายเหตุ M0 |
|---|---|---|
| `/` | `Home` | §5.4 |
| `/play/:activityId` | `Play` | หา activity ใน `content/registry.ts` ถ้าไม่พบแสดง "ไม่พบกิจกรรมนี้" + ปุ่มกลับหน้าหลัก (M0 ไม่พบเสมอ) |
| `/parent` | `Parent` | §5.4 |
| `/dev/manipulatives` | `DevManipulatives` | ลงทะเบียนเฉพาะเมื่อ `import.meta.env.DEV` และโหลดด้วย `React.lazy` เพื่อไม่ให้อยู่ใน bundle จริง |
| `*` | `<Navigate to="/" replace/>` | |

- `Layout`: header สูงคงที่ มี `Logo` ด้านซ้าย ใช้กับทุก route
- **กดค้างโลโก้ 2 วินาที** (`useLongPress(onLongPress, { ms: 2000 })` ใน `src/ui/`)
  - ใช้ Pointer Events: เริ่มที่ `pointerdown` ยกเลิกเมื่อ `pointerup`, `pointercancel`, `pointerleave` หรือเลื่อนเกิน 10px
  - กัน context menu/เลือกข้อความ: `onContextMenu` preventDefault, CSS `user-select: none; -webkit-touch-callout: none; -webkit-user-select: none`
  - แตะสั้นไม่มีผลอะไร ไม่มี feedback ให้ลูกเห็นระหว่างกดค้าง
  - Layout รับ prop/ context `onLogoLongPress` ค่าเริ่มต้นคือ `navigate('/parent')` (M1 จะ override ในหน้า Play)
- **PWA update** (`UpdateBanner`): ใช้ `useRegisterSW` จาก `virtual:pwa-register/react` ถ้า `needRefresh` เป็นจริง แสดงแถบ "มีเวอร์ชันใหม่" + ปุ่ม "อัปเดตเลย" (`updateServiceWorker(true)`) **แสดงเฉพาะหน้า Home และ Parent** ห้ามแสดงหรือ reload ระหว่างหน้า Play

### 5.3 ข้อมูล (`src/store/`)

#### 5.3.1 Type (ใน `src/engine/types.ts`)
- `Learner`, `EventBase`, `AppEvent`, `Problem`, `SkillId` ตาม overview §4.1–§4.3 ตามตัวอักษร
- M0 **ไม่มีส่วนไหนเขียน event** M1 จะปรับรายละเอียดของ `AppEvent` ก่อนมีการเขียนครั้งแรก จึงคง `schemaVersion: 1`

#### 5.3.2 Interface

```ts
export interface EventQuery { learnerId?: string; activityId?: string; sessionId?: string }

export interface MetaValues {
  currentLearnerId: string;
  lastExportAt: string;                                   // ISO
  persistence: { checkedAt: string; result: PersistResult };
}
export type PersistResult = 'granted' | 'denied' | 'unsupported';

export interface ProgressStore {
  readonly kind: 'indexeddb' | 'memory';
  listLearners(): Promise<Learner[]>;                     // เรียงตาม createdAt แล้ว id
  addLearners(learners: Learner[]): Promise<number>;      // id ซ้ำ = ข้าม ไม่เขียนทับ; คืนจำนวนที่เพิ่มจริง
  appendEvents(events: AppEvent[]): Promise<number>;      // id ซ้ำ = ข้าม; ทั้งชุดใน transaction เดียว; คืนจำนวนที่เพิ่มจริง
  listEvents(query?: EventQuery): Promise<AppEvent[]>;    // กรองด้วย AND; เรียงตาม at แล้ว id; ผ่าน migrateEvent แล้ว
  getMeta<K extends keyof MetaValues>(key: K): Promise<MetaValues[K] | undefined>;
  setMeta<K extends keyof MetaValues>(key: K, value: MetaValues[K]): Promise<void>;
  close(): Promise<void>;
}
```
- **ไม่มี API แก้ไขหรือลบ event** (append-only ตาม ADR-0003)
- ค่าที่คืนต้องเป็นสำเนา แก้ object ที่ได้แล้วต้องไม่กระทบข้อมูลใน store

#### 5.3.3 `IndexedDbStore`
- `openIndexedDbStore({ dbName = 'learning-platform' }): Promise<IndexedDbStore>`
  - ชื่อ DB ต้องไม่ generic เพราะ origin `mayfender.github.io` ใช้ร่วมกับ GitHub Pages ทุก repo ของเจ้าของ
- DB version 1 (เลข version ของ IndexedDB ใช้กับโครงสร้าง object store เท่านั้น แยกจาก `schemaVersion` ของ record)
  - `learners` keyPath `id`
  - `events` keyPath `id`, index `by-learner` (`learnerId`), `by-learner-activity` (`[learnerId, activityId]`), `by-session` (`sessionId`)
  - `meta` key แบบ out-of-line
- `upgrade(db, oldVersion)` ใช้ `switch (oldVersion)` แบบ fall-through เพื่อให้ version ต่อไปเพิ่ม case ได้
- ใช้ generic `DBSchema` ของ `idb` ให้มี type

#### 5.3.4 `MemoryStore`
เก็บใน `Map` ใช้ `structuredClone` ตอนเขียนและอ่าน

#### 5.3.5 ชุดเทสต์ร่วม (`progressStore.contract.ts`)
`export function runProgressStoreContract(name: string, create: () => Promise<ProgressStore>)` เรียกจาก `MemoryStore.test.ts` และ `IndexedDbStore.test.ts` (`import 'fake-indexeddb/auto'` และใช้ `dbName` ไม่ซ้ำต่อเทสต์)

ต้องครอบคลุม
- เพิ่มและอ่านผู้เรียน, id ซ้ำไม่เขียนทับ (nickname เดิมยังอยู่), คืนจำนวนที่เพิ่มถูก
- append event แล้วอ่านได้ครบ, id ซ้ำ (ทั้งในชุดเดียวกันและต่างชุด) ถูกข้าม
- เรียงตาม `at` แล้ว `id` แม้เขียนสลับลำดับ
- กรองด้วย `learnerId`, `activityId`, `sessionId` และรวมกัน
- ค่าที่คืนเป็นสำเนา
- meta เขียน/อ่าน/ไม่มีค่า
- (เฉพาะ IndexedDb) ปิดแล้วเปิดใหม่ด้วย `dbName` เดิม ข้อมูลยังอยู่

#### 5.3.6 `schemaVersion` และ migrations (`migrations.ts`)
```ts
export const CURRENT_SCHEMA_VERSION = 1;
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Record<number, Migration> = {};   // key n = แปลงจาก n ไป n+1
export function migrateEvent(raw: unknown, migrations = MIGRATIONS, target = CURRENT_SCHEMA_VERSION): AppEvent;
```
- ไล่ migration จาก `raw.schemaVersion` ไปถึง `target` แล้วตรวจรูปแบบด้วย `isAppEvent()` (type guard เขียนเอง ไม่ใช้ library) ถ้าไม่ผ่านโยน `InvalidEventError`
- `schemaVersion` > ปัจจุบัน → โยน `NewerSchemaError`
- **migrate ตอนอ่านและตอน import เท่านั้น ไม่เขียนทับ event เดิมใน DB**
- เทสต์: ใช้ chain ปลอม (v0→v1) ทดสอบการไล่ขั้น, version ใหม่กว่าถูกปฏิเสธ, record ผิดรูปถูกปฏิเสธ

#### 5.3.7 Export/Import (`exportImport.ts`)
```ts
export interface ExportFile {
  app: 'math-learning'; schemaVersion: number; exportedAt: string;
  learners: Learner[]; events: AppEvent[];
}
export async function exportData(store: ProgressStore, now?: Date): Promise<ExportFile>;
export function exportFileName(now: Date): string;   // 'math-learning-YYYYMMDD-HHmm.export.json' (เวลาท้องถิ่น)
export interface ImportResult { learnersAdded: number; eventsAdded: number; eventsSkipped: number; invalid: number }
export async function importData(store: ProgressStore, json: unknown): Promise<ImportResult>;
```
- รูปแบบตาม overview §4.4 ชื่อไฟล์ลงท้าย `.export.json` เพื่อให้ตรงกับ `.gitignore`
- export: ดาวน์โหลดผ่าน `Blob` + `<a download>` แล้ว `setMeta('lastExportAt', now)`
- import: `app` ต้องเป็น `'math-learning'` ไม่งั้นโยน `NotOurFileError`, `schemaVersion` ของไฟล์ใหม่กว่า → `NewerSchemaError`, event ที่ migrate/ตรวจไม่ผ่านนับเป็น `invalid` และข้ามไป (ไม่ล้มทั้งไฟล์), learner และ event รวมโดยตัด id ซ้ำ **ไม่เขียนทับ**
- import ไม่เปลี่ยน `currentLearnerId`
- เทสต์: export → import เข้า store ใหม่ได้ข้อมูลเท่ากัน, import ซ้ำไฟล์เดิมได้ `eventsAdded = 0`, รวม 2 เครื่องที่มี event ซ้อนกันบางส่วน, ไฟล์ผิดประเภท, version ใหม่กว่า, event เสียบางตัว

#### 5.3.8 Outbox (`outbox.ts`) — กันคำตอบหายเมื่อเขียนไม่สำเร็จ
```ts
export interface Outbox {
  append(events: AppEvent[]): void;          // ใส่คิวแล้วพยายามเขียนทันที ไม่ throw
  pending(): readonly AppEvent[];            // ที่ยังเขียนไม่สำเร็จ
  subscribe(cb: () => void): () => void;     // แจ้งเมื่อ pending เปลี่ยน
  flush(): Promise<void>;
}
export function createOutbox(store: ProgressStore, opts?: { retryMs?: number }): Outbox;  // retryMs = 5000
```
- เขียนไม่สำเร็จ → เก็บในหน่วยความจำ ลองใหม่ทุก `retryMs` และทุกครั้งที่มี `append` ใหม่ ลำดับต้องคงเดิม
- เทสต์ด้วย fake timers และ store ปลอมที่ล้มครั้งแรกแล้วสำเร็จ

#### 5.3.9 Persistent storage (`persist.ts`)
`requestPersistence(): Promise<PersistResult>` ถ้าไม่มี `navigator.storage?.persist` → `'unsupported'`, ถ้า `persisted()` แล้ว → `'granted'`, ไม่งั้นเรียก `persist()` เรียกทุกครั้งที่เปิดแอป (ถูกและ Chrome อาจอนุญาตภายหลัง) แล้วบันทึกผลใน meta `persistence`

#### 5.3.10 id (`ids.ts`)
`newId()` ใช้ `crypto.randomUUID()` ถ้ามี ไม่งั้นสร้าง UUID v4 จาก `crypto.getRandomValues()` (`randomUUID` ไม่มีใน http ที่ไม่ใช่ localhost เช่นเปิด dev server จากแท็บเล็ตผ่าน LAN)

#### 5.3.11 `ProgressProvider` (app)
- เปิด `openIndexedDbStore()` ถ้าล้ม (เช่น private mode) ใช้ `MemoryStore` แทน และตั้ง `storageMode: 'memory-fallback'`
- สร้าง outbox, เรียก `requestPersistence()` แบบไม่รอ
- เลือกผู้เรียนปัจจุบัน: `meta.currentLearnerId` ถ้าไม่มีหรือไม่พบ ใช้ผู้เรียนคนแรก
- context ที่ส่งออก: `{ store, outbox, storageMode, learners, currentLearner, createLearner(nickname), setCurrentLearner(id), refresh() }`
- หน้าจอต้องแสดงสถานะกำลังโหลดระหว่างเปิด store (ห้ามจอขาวเปล่า)

### 5.4 หน้าจอใน M0 และข้อความ

ข้อความอยู่ใน `src/app/strings.ts` เป็นข้อความเสนอของ Architect (ไม่ใช่เนื้อหาบทเรียน) Designer ปรับได้ (คำถามเปิด Q3)

**Home**
- ยังไม่มีผู้เรียน: หัวข้อ "ยินดีต้อนรับ", ช่อง "ชื่อเล่นของลูก" (text input ธรรมดา), คำอธิบาย "เก็บแค่ชื่อเล่นไว้ในเครื่องนี้เท่านั้น", ปุ่ม "เริ่มใช้งาน"
  - ชื่อเล่น trim แล้วยาว 1–20 ตัวอักษร ถ้าว่างปุ่มกดไม่ได้
  - สร้าง `Learner { id: newId(), nickname, createdAt }` แล้วตั้งเป็น `currentLearnerId`
- มีผู้เรียนแล้ว: "สวัสดี {nickname}" และ M0 แสดง "ยังไม่มีกิจกรรม" + `UpdateBanner`

**Parent** (หัวข้อ "หน้าสำหรับพ่อ" + ปุ่ม "กลับหน้าหลัก")
1. ผู้เรียน: แสดงชื่อเล่นปัจจุบัน ถ้ามีมากกว่า 1 คน (เช่นหลัง import จากอีกเครื่อง) แสดงตัวเลือก "ผู้เรียนปัจจุบัน"
2. สำรองข้อมูล: ปุ่ม "ดาวน์โหลดไฟล์สำรอง (export)" และ "นำเข้าไฟล์ (import)" (`<input type="file" accept="application/json,.json">`)
   - ผล import: "นำเข้าแล้ว: ผู้เรียนใหม่ {a} คน, รายการใหม่ {e} รายการ, ซ้ำ {s}, เสีย {i}"
   - error: "ไฟล์นี้ไม่ใช่ไฟล์ของแอปนี้" / "ไฟล์นี้มาจากแอปเวอร์ชันใหม่กว่า กรุณาอัปเดตแอปก่อน"
   - เตือนเมื่อมี event และไม่เคย export หรือ export ล่าสุดเกิน 7 วัน: "ยังไม่ได้สำรองข้อมูลเกิน 7 วัน"
3. สถานะการเก็บข้อมูล
   - persist: "เก็บข้อมูลแบบถาวร: ได้ / ไม่ได้ / เบราว์เซอร์ไม่รองรับ"
   - `storageMode === 'memory-fallback'`: "บันทึกลงเครื่องไม่ได้ ข้อมูลจะหายเมื่อปิดแอป"
   - outbox ค้าง: "มีข้อมูลรอบันทึก {n} รายการ กำลังลองใหม่"
   - iPad/iPhone ที่ยังไม่ได้ติดตั้ง (ตรวจ `navigator.standalone !== true` และ `matchMedia('(display-mode: standalone)')` ไม่ตรง บน UA iPhone/iPad หรือ Mac ที่ `maxTouchPoints > 1`): "บน iPad/iPhone ให้กด แชร์ → เพิ่มไปยังหน้าจอโฮม เพื่อไม่ให้ข้อมูลถูกลบเมื่อไม่ได้เปิด 7 วัน"
4. ธีม: ตัวเลือก "ตามเครื่อง / สว่าง / มืด"
5. `UpdateBanner`

**Play** (M0): "ไม่พบกิจกรรมนี้" + ปุ่ม "กลับหน้าหลัก"
**DevManipulatives** (M0): หัวข้อ "ห้องเครื่องมือ" + "ยังไม่มีอุปกรณ์จำลอง"

ทุกปุ่ม/ช่องกรอก ≥ 48px, ใช้ได้ที่ 360px, อ่านชัดทั้ง light/dark

### 5.5 เทสต์

**`src/test/setup.ts`**
- `import '@testing-library/jest-dom/vitest'`
- stub `window.matchMedia` (ค่าเริ่มต้น `matches: false` และให้เทสต์เปลี่ยนได้)
- `vi.mock('virtual:pwa-register/react', ...)` คืน `needRefresh: [false, noop]`

**`playwright.config.ts`**
```ts
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/Learning-Platform/',
    locale: 'th-TH',
    serviceWorkers: 'block',      // ให้ reload/เทสต์ไม่ติด cache ของ SW
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'android-tablet', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'phone',          use: { ...devices['Pixel 7'] } },
    { name: 'ipad',           use: { ...devices['iPad (gen 7)'] } },   // WebKit
    { name: 'desktop',        use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/Learning-Platform/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```
ถ้าชื่อ device ข้างบนไม่มีใน Playwright ที่ติดตั้ง ให้เลือกตัวที่ใกล้ที่สุด (แท็บเล็ต Android แบบ touch, Pixel ≈ 412px, iPad WebKit) และระบุในรายงาน

**`tests/e2e/smoke.spec.ts`** (รันทุก project) ทุกเทสต์เก็บ `pageerror` และ `console` ระดับ error แล้ว assert ว่าว่าง
1. เปิดแอป → เห็นฟอร์มตั้งชื่อเล่น
2. สร้างผู้เรียน "ทดสอบ" → เห็น "สวัสดี ทดสอบ" → `page.reload()` → ยังเห็น "สวัสดี ทดสอบ"
3. `setViewportSize({ width: 360, height: 740 })` ที่ Home และ Parent: `document.documentElement.scrollWidth <= window.innerWidth`
4. `emulateMedia({ colorScheme: 'dark' })` → `getComputedStyle(document.body).backgroundColor === 'rgb(18, 26, 22)'` (#121A16) จากนั้นเลือกธีม "สว่าง" ในหน้าพ่อ → `'rgb(242, 247, 243)'` (#F2F7F3) และยังเป็นค่านี้หลัง reload
5. แตะโลโก้สั้นๆ → ยังอยู่หน้าเดิม, กดค้าง 2.1 วินาที (`mouse.down` → `waitForTimeout(2100)` → `mouse.up`) → อยู่ที่ `#/parent`
6. export → ได้ไฟล์ชื่อลงท้าย `.export.json` ที่ parse แล้ว `app === 'math-learning'` และมีผู้เรียน "ทดสอบ"
7. `request.get('manifest.webmanifest')` → `lang === 'th'`, มี icon 192 และ 512; `favicon.ico` และ `apple-touch-icon-180x180.png` ตอบ 200
8. ทุก request ระหว่างเทสต์มี host เป็น `localhost:4173` (ไม่มี request ภายนอก รวมถึงฟอนต์)

### 5.6 CI/CD (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
  workflow_dispatch:
permissions: { contents: read }
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npx playwright install --with-deps
      - run: npm run e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report, retention-days: 7 }
      - run: npm run build
      - if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
        uses: actions/configure-pages@v5
      - if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
        uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: verify
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions: { pages: write, id-token: write }
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    concurrency: { group: pages, cancel-in-progress: false }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
- ใช้ major ล่าสุดของ action ทางการแต่ละตัว ณ วันที่ทำ (เลขข้างบนเป็นขั้นต่ำ)
- เจ้าของโปรเจกต์ต้องตั้งค่าเองหนึ่งครั้ง: repo Settings → Pages → Source: **GitHub Actions**
- CI ต้องไม่อัปโหลดไฟล์ export หรือข้อมูลใดๆ นอกจาก `dist` และรายงาน Playwright (ที่มีแต่ข้อมูลทดสอบ)

## 6. ข้อมูลที่บันทึก

| ที่เก็บ | ข้อมูล |
|---|---|
| IndexedDB `learners` | `Learner { id, nickname, createdAt }` |
| IndexedDB `meta` | `currentLearnerId`, `lastExportAt`, `persistence` |
| IndexedDB `events` | ยังไม่มีการเขียนใน M0 |
| localStorage `lp.theme` | ธีมของเครื่อง |

## 7. เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] AC1: `npm ci && npm run lint && npm test && npm run e2e && npm run build` ผ่านบนเครื่องที่สะอาด (Node 24)
- [ ] AC2: package ใน `package.json` ตรงกับ §4.1 ไม่มีตัวอื่น และมี `package-lock.json`
- [ ] AC3: import ผิดทิศทาง (ตาราง §4.7) ทำให้ `npm run lint` ล้ม ทุกชั้น (ทดลองในเครื่อง บันทึกในรายงาน)
- [ ] AC4: `MemoryStore` และ `IndexedDbStore` ผ่านชุดเทสต์ร่วมชุดเดียวกันครบทุกข้อใน §5.3.5
- [ ] AC5: เทสต์ migrations, export/import, outbox, ids ผ่านตาม §5.3.6–§5.3.10
- [ ] AC6: e2e smoke ข้อ 1–8 ผ่านครบทั้ง 4 project
- [ ] AC7: `dist/` มี `manifest.webmanifest` (lang `th`, icon ครบ) และ `sw.js`; ติดตั้งเป็น PWA ได้บน Chrome Android และเปิดแบบ offline ได้หลังเปิดครั้งแรก (ทดสอบมือบนอุปกรณ์จริง 1 เครื่อง)
- [ ] AC8: build จริงไม่มีโค้ดของ `DevManipulatives` (ค้นข้อความ "ห้องเครื่องมือ" ใน `dist/assets/*.js` ไม่พบ) และ `#/dev/manipulatives` ใน build จริงกลับไปหน้าหลัก
- [ ] AC9: push เข้า `main` → workflow รันครบตามลำดับ lint → test → e2e → build → deploy และ `https://mayfender.github.io/Learning-Platform/` เปิดได้; PR หรือ commit ที่เทสต์ล้มไม่ deploy
- [ ] AC10: ฟอนต์หัวข้อเป็น Kodchasan และเนื้อหาเป็น Noto Sans Thai (ตรวจด้วย DevTools) โดยไม่มี request ไปโดเมนภายนอก
- [ ] AC11: icon และ manifest โหลดได้ภายใต้ base `/Learning-Platform/` (e2e ข้อ 7)
- [ ] AC12: `UpdateBanner` ไม่ถูก render ในหน้า Play (component test)
- [ ] AC13: เปิดใน private mode ที่ IndexedDB ใช้ไม่ได้ แอปไม่พัง และหน้าพ่อแสดงคำเตือน memory-fallback (component test ด้วย store factory ที่ล้ม)

## 8. เทสต์ที่ต้องมี

- Unit: `migrations`, `exportImport`, `outbox`, `ids`, `theme` (อ่าน/เขียน/applyTheme), `persist` (mock `navigator.storage`)
- Contract: `MemoryStore.test.ts`, `IndexedDbStore.test.ts`
- Component: `useLongPress` (fake timers: 1999ms ไม่ทำงาน, 2000ms ทำงาน, ปล่อยก่อน/เลื่อนเกิน 10px ยกเลิก), Home (สร้างผู้เรียน, ปุ่มกดไม่ได้เมื่อว่าง), Parent (ผล import, เตือน 7 วัน, memory-fallback)
- `content/content.test.ts` วน registry (ยังว่างแต่ต้องมีโครง)
- e2e: `tests/e2e/smoke.spec.ts` ตาม §5.5

## 9. สิ่งที่ Developer ต้องไม่ทำ

- ไม่ใส่ analytics, tracker, Google Fonts หรือ request ภายนอกใดๆ
- ไม่ใช้ `registerType: 'autoUpdate'` หรือ reload หน้าเองระหว่างกิจกรรม
- ไม่เพิ่ม API ลบ/แก้ event ใน store
- ไม่ใช้ `localStorage` เก็บข้อมูลความก้าวหน้า (ใช้ได้เฉพาะธีม)
- ไม่ใส่ `overflow-x: hidden` ที่ `html/body` และไม่ปิดการซูมทั้งหน้า
- ไม่ commit ไฟล์ export หรือข้อมูลจริงของลูก (รวมถึงใน fixture ของเทสต์)
- ไม่สร้างแป้นตัวเลขหรือเนื้อหาบทเรียนใน M0

## 10. แผนงานย่อย

| ลำดับ | งาน | ขนาด |
|---|---|---|
| 1 | สร้างโปรเจกต์ Vite react-ts, package ตาม §4.1, scripts, tsconfig, alias, `.nvmrc` | S |
| 2 | ESLint + Prettier + กฎทิศทาง import (§4.7) | S |
| 3 | tokens.css, global.css, fonts.ts, theme.ts + เทสต์ | S |
| 4 | `engine/types.ts`, `ProgressStore`, `MemoryStore`, ชุดเทสต์ร่วม, `ids` | M |
| 5 | `IndexedDbStore` + migrations + เทสต์ | M |
| 6 | export/import, outbox, persist + เทสต์ | M |
| 7 | Router, Layout, `useLongPress`, Logo, placeholder routes | M |
| 8 | `ProgressProvider`, Home (สร้างผู้เรียน), Parent (สำรองข้อมูล สถานะ ธีม) + component test | M |
| 9 | PWA: icon.svg, `npm run icons`, manifest, `UpdateBanner` | S |
| 10 | Playwright config + smoke e2e 4 project | M |
| 11 | GitHub Actions + เปิด Pages (เจ้าของ) + deploy ครั้งแรก + ทดสอบติดตั้ง PWA | S |

## 11. คำถามที่ยังเปิดอยู่

| # | ถึง | คำถาม | ข้อเสนอ (ใช้ไปก่อนถ้ายังไม่ตอบ) |
|---|---|---|---|
| Q1 | พ่อ | ชื่อแอปและ icon | ชื่อ "บทเรียนคณิตศาสตร์" / สั้น "คณิต", icon ten-frame สีส้ม |
| Q2 | พ่อ | ต้องเปิด Pages เอง (Settings → Pages → Source: GitHub Actions) | ทำก่อนงานย่อย 11 |
| Q3 | Designer | ข้อความ UI ใน §5.4 (หน้าตั้งชื่อ หน้าพ่อ) | ใช้ตามที่เสนอ ปรับได้ใน `strings.ts` ที่เดียว |

## 12. ประวัติการแก้ไข

| วันที่ | การเปลี่ยนแปลง | เหตุผล |
|---|---|---|
| 2026-09-29 | สร้างเอกสาร | เริ่ม M0 |

## รายงานการพัฒนา — 2026-09-29

### สิ่งที่ทำ
- สร้างโปรเจกต์ Vite (react-ts) + TypeScript strict ครบตาม §4: `package.json`, scripts, `.nvmrc`, `tsconfig.{json,app.json,node.json}`, alias `@/*`
- ติดตั้ง package ตาม §4.1 ทั้งหมดด้วยเวอร์ชันเสถียรล่าสุด ณ วันที่ทำ (`npm install` ไม่ระบุเวอร์ชันเอง ให้ npm resolve, บันทึก `^` และ commit `package-lock.json`)
- ESLint flat config + Prettier + กฎทิศทาง import ครบทั้ง 5 ชั้น (`app/ui/manipulatives/engine/content/store`) ด้วย `@typescript-eslint/no-restricted-imports` แบบ regex
- `styles/tokens.css`, `global.css`, `fonts.ts` (self-host Kodchasan + Noto Sans Thai แบบ subset), `theme.ts` + เทสต์
- `engine/types.ts`, `store/ProgressStore.ts` (interface), `MemoryStore`, `IndexedDbStore` (ผ่าน `idb`, index ครบ 3 ตัว), ชุดเทสต์ร่วม `progressStore.contract.ts`
- `migrations.ts` (`migrateEvent`, `isAppEvent`, `InvalidEventError`, `NewerSchemaError`)
- `exportImport.ts` (export/import JSON, รวมโดยตัด id ซ้ำ, ไม่เขียนทับ), `outbox.ts` (คิว + retry ด้วย fake timers), `persist.ts` (`requestPersistence`), `ids.ts` (`newId` พร้อม fallback ไม่มี `crypto.randomUUID`)
- Routing: `HashRouter`, `Layout` (header + กดค้างโลโก้ 2 วินาทีผ่าน `useLongPress` แบบ Pointer Events), `ProgressProvider` (เปิด store จริง/ตกไป memory-fallback, outbox, persist, เลือกผู้เรียนปัจจุบัน), หน้า `Home`, `Parent`, `Play`, `DevManipulatives` (lazy + เฉพาะ dev)
- `strings.ts` รวมข้อความ UI ตามข้อเสนอ Architect (Q3)
- PWA: `public/icon.svg` (ten-frame ส้มบนพื้นเขียวอ่อน) → `npm run icons` สร้างไฟล์ PNG/ICO ครบ, `vite-plugin-pwa` (`registerType: 'prompt'`), `UpdateBanner` (แสดงเฉพาะ Home/Parent)
- `playwright.config.ts` 4 project + `tests/e2e/smoke.spec.ts` ครบ 8 ข้อตาม §5.5
- `.github/workflows/ci.yml` ตาม §5.6 (lint → test → e2e → build → deploy)
- อัปเดต `.gitignore` เพิ่ม `*.tsbuildinfo`

### Acceptance Criteria
| AC | ผล | หมายเหตุ |
|---|---|---|
| AC1 | ผ่าน | `npm ci && npm run lint && npm test && npm run e2e && npm run build` ผ่านทั้งหมดบนเครื่องพัฒนา (Node 24.16) |
| AC2 | ผ่าน | package ตรงกับ §4.1 ทุกตัว ไม่มีตัวอื่น มี `package-lock.json` |
| AC3 | ผ่าน | ทดลอง import ผิดทิศทาง 1 จุดต่อชั้น (ทั้ง 5 ชั้น) แล้ว `eslint` ล้มจริงทุกจุด (ลบไฟล์ทดลองแล้ว ไม่ commit) — ดูรายละเอียดด้านล่าง |
| AC4 | ผ่าน | `MemoryStore` และ `IndexedDbStore` (ผ่าน `fake-indexeddb`) ผ่าน `runProgressStoreContract` ชุดเดียวกันครบทุกข้อ |
| AC5 | ผ่าน | เทสต์ `migrations`, `exportImport`, `outbox`, `ids` ผ่านทั้งหมด |
| AC6 | ผ่าน | e2e smoke ข้อ 1–8 ผ่านครบทั้ง 4 project (32/32) |
| AC7 | **ยังไม่ได้ตรวจ** | `dist/manifest.webmanifest` มี `lang: "th"`, icon 192/512 ครบ, `sw.js` ถูกสร้าง (ยืนยันด้วยไฟล์จริงและ e2e ข้อ 7) แต่ **ยังไม่ได้ทดสอบติดตั้ง PWA และเปิด offline บนอุปกรณ์จริง** เพราะสภาพแวดล้อมนี้ไม่มีอุปกรณ์จริงให้ทดสอบ ต้องให้เจ้าของโปรเจกต์หรือ Architect ทดสอบมือหลัง deploy |
| AC8 | ผ่าน | ค้นหา `"ห้องเครื่องมือ"` และ `"ยังไม่มีอุปกรณ์จำลอง"` ใน `dist/assets/*.js` ไม่พบ (ตรวจหลัง build จริงทุกครั้ง) — ดูหมายเหตุการย้ายข้อความออกจาก `strings.ts` ด้านล่าง |
| AC9 | **ยังไม่ได้ตรวจ** | ยังไม่ได้ push เข้า `main` ตามคำสั่ง (ห้าม commit/push ในงานนี้) จึงยังไม่เห็น workflow รันจริงบน GitHub Actions และยังไม่เห็น GitHub Pages ทำงาน ต้องให้ผู้ดูแล repo ตรวจหลัง merge/push |
| AC10 | ผ่าน (บางส่วนตรวจอัตโนมัติ) | ฟอนต์ self-host ผ่าน `@fontsource` (ไม่มี Google Fonts) และ e2e ข้อ 8 ยืนยันว่าทุก request ระหว่างเทสต์เป็น `localhost:4173` เท่านั้น (ไม่มี request ภายนอกรวมฟอนต์) แต่ยังไม่ได้เปิด DevTools ตรวจ computed font-family ด้วยตาเอง |
| AC11 | ผ่าน | e2e ข้อ 7: manifest และ icon โหลดได้ภายใต้ base `/Learning-Platform/` |
| AC12 | ผ่าน | component test `Play.test.tsx` ยืนยันว่าไม่มี `role="status"` หรือข้อความ UpdateBanner ในหน้า Play |
| AC13 | ผ่าน | component test `Parent.test.tsx` ใช้ store factory ที่ throw จำลอง private mode → เห็นคำเตือน memory-fallback, แอปไม่พัง |

### เทสต์
- คำสั่งที่รัน: `npm run lint`, `npm test` (`vitest run`), `npm run e2e` (`playwright test`), `npm run build`
- ผล:
  - `npm run lint` → ผ่าน (ESLint 0 error/0 warning, Prettier ผ่าน, `tsc -b` ผ่าน)
  - `npm test` → **ผ่าน 53/53** (13 ไฟล์)
  - `npm run e2e` → **ผ่าน 32/32** (8 เทสต์ × 4 project: android-tablet, phone, ipad, desktop)
  - `npm run build` → ผ่าน, สร้าง `dist/` พร้อม `manifest.webmanifest`, `sw.js`, icon ครบ

### ทดสอบบนเบราว์เซอร์
- อุปกรณ์/ขนาดจอที่ทดสอบ: ทดสอบผ่าน Playwright บน browser engine จริง (Chromium: android-tablet/phone/desktop, WebKit: ipad) ตามเช็คลิสต์ในสเปก — **ไม่ได้เปิดด้วยเบราว์เซอร์แบบ interactive เพิ่มเติมด้วยตัวเอง** เพราะ M0 ยังไม่มีเนื้อหาบทเรียนให้ตรวจด้วยตา ครอบคลุมด้วย e2e อัตโนมัติแทน
- ผลตามเช็คลิสต์ (ข้อที่เกี่ยวกับ M0):
  - [x] ตั้งชื่อเล่นและเห็นคำทักทาย (ยังไม่มีบทเรียนให้ "เล่นจนจบ" ใน M0)
  - [x] ขนาดมือถือ (360px, ~412px) และแท็บเล็ต (~768px) ไม่มี scroll แนวนอน (Home + Parent)
  - [x] dark mode อ่านได้ชัด (ตรวจสี background ตรงกับ token ทั้ง light/dark)
  - [x] ไม่มีเวลาแสดงให้ลูกเห็น (ไม่มี UI จับเวลาใน M0 เลย)
  - [x] ข้อมูลผู้เรียนบันทึกและยังอยู่หลัง reload
  - [x] ไม่มี error ใน console/page ระหว่างเทสต์ (เก็บ `pageerror`/`console.error` แล้ว assert ว่าง ทุกเทสต์)
  - [ ] ติดตั้งเป็น PWA จริงบนอุปกรณ์จริง — **ยังไม่ได้ทดสอบ** (ต้องการอุปกรณ์จริง ดู AC7)

### สิ่งที่ต่างจาก Spec หรือยังไม่ได้ทำ
1. **`VITE_BASE` ปรับผ่าน env ได้** (ตามที่ผู้ว่าจ้างงานนี้สั่งไว้ล่วงหน้า เพราะยังไม่ยืนยัน custom domain แม้จะมี `CNAME` แล้ว): `vite.config.ts` และ `playwright.config.ts` อ่าน `process.env.VITE_BASE` ค่าเริ่มต้น `/Learning-Platform/` ตรงตาม spec ทุกประการถ้าไม่ตั้งค่า และ `.github/workflows/ci.yml` ตั้งค่าไว้จุดเดียวใน `env:` ระดับ workflow
2. **`tsconfig.app.json` ไม่มี `baseUrl`**: TypeScript ที่ติดตั้ง (6.0.3, เวอร์ชันเสถียรล่าสุด ณ วันที่ทำตาม ADR-0002) deprecate `baseUrl` แล้ว (TS5101) และ `paths` ทำงานได้โดยไม่ต้องมี `baseUrl` เมื่อ `moduleResolution: "bundler"` จึงตัดออกแทนการเติม `ignoreDeprecations` เพื่อลดหนี้ทางเทคนิค — ทดสอบแล้ว alias `@/*` ทำงานปกติทั้ง `tsc -b`, Vitest, และ Vite build
3. **`eslint-plugin-react-hooks` เวอร์ชันที่ติดตั้งคือ v7.1.1** (เวอร์ชันเสถียรล่าสุด) ซึ่งเปลี่ยน object key `configs['recommended-latest']` เป็น eslintrc format (ใช้ไม่ได้กับ flat config) ต้องใช้ `configs.flat['recommended-latest']` แทน และ v7 เพิ่มกฎใหม่หลายตัวที่ตรวจกฎของ **React Compiler** (`react-hooks/purity`, `react-hooks/static-components`, `react-hooks/set-state-in-effect`) ซึ่งโปรเจกต์นี้ไม่ได้ใช้ React Compiler จึงปิด 3 กฎนี้ (กฎหลักอื่น เช่น `rules-of-hooks`, `exhaustive-deps` ยังเปิดอยู่ตามเดิม)
4. **ปิด `@typescript-eslint/require-await`**: `ProgressStore` เป็น interface async ทั้งหมดตาม ADR-0003 (เผื่อ adapter ในอนาคตต้อง await จริง) แต่ `MemoryStore` และเมธอด `close()` ของ `IndexedDbStore` ไม่มีอะไรต้องรอจริง กฎนี้จะบังคับให้ใส่ await ปลอมโดยไม่มีประโยชน์ จึงปิดแทน
5. **ข้อความของ `DevManipulatives` (`"ห้องเครื่องมือ"`, `"ยังไม่มีอุปกรณ์จำลอง"`) ไม่ได้อยู่ใน `strings.ts`** ต่างจากหน้าอื่น เพราะ `strings.ts` เป็น object เดียวที่ import แบบเต็มโดยไฟล์ที่อยู่ใน production bundle อยู่แล้ว (`Home`, `Parent`, `App`) ทำให้ข้อความใดๆ ในไฟล์นี้ติดไปกับ bundle จริงเสมอแม้ property นั้นจะไม่ถูกใช้ (bundler ไม่ tree-shake ระดับ property ของ object literal) จึงต้องฝังข้อความ 2 บรรทัดนี้ไว้ในไฟล์ `DevManipulatives.tsx` เองโดยตรงเพื่อให้ผ่าน AC8 — เป็นทางเลือกที่ง่ายที่สุดสำหรับหน้า placeholder ที่ยังไม่มีเนื้อหาจริง ถ้าจะเพิ่มหน้า dev-only อื่นในอนาคตควรตั้งไฟล์ strings แยกต่อ route ที่ import แบบ lazy เหมือนกัน
6. **AC7 และ AC9 ยังไม่ได้ตรวจจริง** ตามที่ระบุในตาราง AC ด้านบน (ต้องใช้อุปกรณ์จริงและการ push เข้า `main` ตามลำดับ ซึ่งอยู่นอกขอบเขตที่ได้รับอนุญาตในงานนี้)
7. เพิ่มไฟล์ `src/app/LayoutContext.tsx` (ไม่ได้อยู่ในโครงสร้าง §4.8 ตรงตัว) เพื่อรองรับ context `onLogoLongPress` override ตามที่ §5.2 ระบุว่า "Layout รับ prop/context onLogoLongPress" — แยกเป็นไฟล์ context ต่างหากจาก `Layout.tsx` เพื่อให้ import ได้จาก M1 (หน้า Play) โดยไม่ต้อง import ทั้ง `Layout.tsx`

### คำถาม / ข้อเสนอ
- AC7 (ติดตั้ง PWA + offline บนอุปกรณ์จริง) และ AC9 (push จริงแล้ว CI/CD ทำงานครบ + Pages เปิดได้) รอให้เจ้าของโปรเจกต์หรือ Architect ตรวจหลังจาก merge งานนี้เข้า `main` และตั้งค่า Settings → Pages → Source: GitHub Actions (Q2 ในสเปก)
- ยังไม่มีคำถามอื่นที่ต้องรบกวน Architect เพิ่มเติม — ถ้าตรวจแล้วพบปัญหาจะแจ้งกลับ

### ลิงก์หรือวิธีเปิดดู
- โค้ดอยู่ใน working tree ที่ `D:\Workspace\learning_platform` (ยังไม่ commit ตามคำสั่ง รอ lead ตรวจแล้ว commit)
- เปิดดูในเครื่อง: `npm ci` → `npm run dev` (dev server) หรือ `npm run build && npm run preview` (build จริง)
- รันเทสต์: `npm run lint`, `npm test`, `npm run e2e`, `npm run build`
