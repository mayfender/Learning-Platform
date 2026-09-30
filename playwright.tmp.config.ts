import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testDir: 'tests/tmp', outputDir: 'test-results/tmp' });
