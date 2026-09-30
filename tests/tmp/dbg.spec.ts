import { test } from '@playwright/test';
import { toA2, playA2, dotCount, dotCountDom, ringedCells, cellStates } from '../acceptance/helpers/add04';

test('dbg', async ({ page }) => {
  test.setTimeout(120000);
  await toA2(page);
  const seen = await playA2(page, {}, async (label, pg) => {
    console.log(label, 'dots', await dotCount(pg), 'dom', await dotCountDom(pg), 'ring', JSON.stringify(await ringedCells(pg)), (await cellStates(pg)).join(','));
  });
  console.log(JSON.stringify(seen));
});
