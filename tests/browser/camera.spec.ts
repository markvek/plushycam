import { test, expect } from '@playwright/test';

test('configure, connect, capture, reload, export, and remove a local snapshot', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add your camera', exact: true }).click();
  await page.getByRole('textbox', { name: 'Camera name', exact: true }).fill('Fixture camera');
  await page.getByRole('textbox', { name: 'Camera address', exact: true }).fill('127.0.0.1');
  await page.getByRole('textbox', { name: 'Port', exact: true }).fill('8790');
  await page.getByRole('button', { name: 'Save camera', exact: true }).click();
  await page.getByRole('button', { name: 'Connect camera', exact: true }).click();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  await expect(page.getByTestId('live-frame').first()).toBeVisible();
  await page.screenshot({ path: '.context/plushycam-live-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Take snapshot', exact: true }).click();
  await expect(page.getByText('Snapshot saved to your library.')).toBeVisible();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export image', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Export image', exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export image', exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/plushycam.*\.jpg$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: '.context/plushycam-library-mobile.png', fullPage: true });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Room for your first moment')).toBeVisible();
  expect(errors).toEqual([]);
});

test('invalid address stays on the setup form with a helpful error', async ({ page }) => {
  await page.goto('/settings');
  await page
    .getByRole('textbox', { name: 'Camera address', exact: true })
    .fill('http://wrong/path');
  await page.getByRole('button', { name: 'Save camera', exact: true }).click();
  await expect(
    page.getByText('Enter an IP address or hostname only, without http:// or a path.'),
  ).toBeVisible();
});

test('browser bridge validates its target and streams the configured camera', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('textbox', { name: 'Camera name', exact: true }).fill('Bridged fixture');
  await page.getByRole('textbox', { name: 'Camera address', exact: true }).fill('127.0.0.1');
  await page.getByRole('textbox', { name: 'Port', exact: true }).fill('8790');
  await page.getByRole('button', { name: /Browser connection help/ }).click();
  await page
    .getByRole('textbox', { name: 'Browser bridge address (optional)', exact: true })
    .fill('http://127.0.0.1:8791');
  await page.getByRole('button', { name: 'Save camera', exact: true }).click();
  await page.getByRole('button', { name: 'Connect camera', exact: true }).click();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Take snapshot', exact: true }).click();
  await expect(page.getByText('Snapshot saved to your library.')).toBeVisible();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
});
