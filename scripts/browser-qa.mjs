import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port = 4187;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  { stdio: 'pipe' },
);
let browser;
const errors = [];
async function checkLayout(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  if (dimensions.content > dimensions.viewport) {
    console.log(
      await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .map((el) => ({
            tag: el.tagName,
            class: String(el.className),
            right: el.getBoundingClientRect().right,
            width: el.getBoundingClientRect().width,
          }))
          .filter((el) => el.right > document.documentElement.clientWidth + 1 && el.width > 1),
      ),
    );
    await page.screenshot({ path: '.qa/overflow.png', fullPage: true });
  }
  assert.ok(
    dimensions.content <= dimensions.viewport,
    `${label}: overflow ${JSON.stringify(dimensions)}`,
  );
}
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      /* Server is starting. */
    }
    if (attempt === 99) throw new Error('Preview server did not become ready.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await mkdir('.qa', { recursive: true });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin);
    await page.getByRole('heading', { name: 'Good times are better shared.' }).waitFor();
    await checkLayout(page, `empty dashboard ${width}`);
    if (width === 1440 || width === 375)
      await page.screenshot({ path: `.qa/empty-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Create your first group' }).click();
    await page.getByRole('dialog').waitFor();
    await checkLayout(page, `group dialog ${width}`);
    assert.equal(
      await page.getByLabel('Group name').evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press('Escape');
    assert.equal(
      await page
        .getByRole('button', { name: 'Create your first group' })
        .evaluate((el) => el === document.activeElement),
      true,
      'Focus returns to the opener',
    );
  }
  await page.getByRole('button', { name: 'Explore with sample groups' }).click();
  await page.getByRole('heading', { name: 'The Goa getaway', exact: true }).waitFor();
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin);
    await checkLayout(page, `populated dashboard ${width}`);
    if (width === 1440 || width === 375)
      await page.screenshot({ path: `.qa/dashboard-${width}.png`, fullPage: true });
    await page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: 'The Goa getaway', exact: true }) })
      .click();
    await page.getByRole('button', { name: 'Add expense', exact: true }).waitFor();
    await checkLayout(page, `group ${width}`);
    if (width === 375 || width === 1440)
      await page.screenshot({ path: `.qa/group-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Add expense', exact: true }).click();
    await page.getByLabel('What was it for?').fill('Coffee & the view');
    await page.getByLabel('Amount (INR)', { exact: true }).fill('100');
    await checkLayout(page, `expense dialog ${width}`);
    assert.equal(await page.getByText('All accounted for · ₹100').count(), 1);
    if (width === 375) await page.screenshot({ path: '.qa/expense-375.png', fullPage: false });
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Balances', exact: true }).click();
    await checkLayout(page, `group balances ${width}`);
    await page.getByRole('tab', { name: 'Settlements', exact: true }).click();
    await checkLayout(page, `group settlements ${width}`);
    await page.getByRole('button', { name: 'Settle up', exact: true }).click();
    await checkLayout(page, `settlement dialog ${width}`);
    await page.keyboard.press('Escape');
    for (const route of ['/groups', '/balances', '/activity', '/settings']) {
      await page.goto(`${origin}${route}`);
      await checkLayout(page, `${route} ${width}`);
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(origin);
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'The Goa getaway', exact: true }) })
    .click();
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByLabel('What was it for?').fill('Persisted browser coffee');
  await page.getByLabel('Amount (INR)', { exact: true }).fill('100');
  await page.getByRole('dialog').getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByText('Persisted browser coffee', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('Persisted browser coffee', { exact: true }).waitFor();
  const exportData = await page.evaluate(() => JSON.parse(localStorage.getItem('splitcrumb:data')));
  const newExpense = exportData.expenses.find((e) => e.description === 'Persisted browser coffee');
  assert.equal(
    newExpense.participants.reduce((n, s) => n + s.amountMinor, 0),
    10000,
  );
  assert.ok(newExpense.participants.every((s) => s.amountMinor === 2500));
  await page.goto(`${origin}/settings`);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  assert.match((await downloadEvent).suggestedFilename(), /^splitcrumb-backup-/);
  await page.getByLabel('Import backup file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exportData)),
  });
  await page.getByRole('heading', { name: 'Replace your current data?' }).waitFor();
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Your browser data has been replaced.' })
    .waitFor();
  await page.getByLabel('Import backup file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await page.getByRole('alert').filter({ hasText: 'not valid JSON' }).waitFor();
  await page.evaluate(() => localStorage.setItem('splitcrumb:data', '{broken'));
  await page.reload();
  await page.getByRole('button', { name: 'Download raw data' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('splitcrumb:data')), '{broken');
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
  console.log(
    'PASS: responsive layout at 320, 375, 768, 1024, 1440px; empty and populated pages; dialogs; focus restoration; real expense persistence; JSON export/import; corrupt-data recovery; no browser errors.',
  );
  console.log('Screenshots saved to .qa/.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
