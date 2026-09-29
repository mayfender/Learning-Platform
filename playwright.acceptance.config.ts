import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Acceptance test ของ Tester (roles/tester.md) แยกจาก e2e ของ Developer
// ใช้ project, baseURL และ webServer เดียวกับ e2e ส่วน E2E_DEV=1 ใช้รันกับ dev server ได้เหมือนกัน
export default defineConfig({
  ...base,
  testDir: 'tests/acceptance',
  outputDir: 'test-results/acceptance',
});
