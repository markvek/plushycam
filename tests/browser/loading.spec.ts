import { expect, test } from '@playwright/test';

test('standalone globe rotates, can be paused with the keyboard, and resumes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/loading');
  await expect(page.getByRole('heading', { name: 'PLUSHY CAM001' })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Manage cameras' })).toHaveCount(0);
  const globe = page.getByTestId('globe-webgl');
  await expect(globe).toBeVisible();
  const first = await globe.screenshot();
  await expect.poll(async () => (await globe.screenshot()).equals(first)).toBe(false);
  const pause = page.getByRole('button', { name: 'Pause globe rotation' });
  await pause.focus();
  await page.keyboard.press('Enter');
  const resume = page.getByRole('button', { name: 'Resume globe rotation' });
  await expect(resume).toBeFocused();
  const frozen = await globe.screenshot();
  await page.waitForTimeout(400);
  expect((await globe.screenshot()).equals(frozen)).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await globe.screenshot()).equals(frozen)).toBe(false);
  // The standalone route also supports departure and browser history.
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Save footage' })).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('globe-webgl')).toBeVisible();
  expect(errors).toEqual([]);
});

test('reduced motion stays still and the composition fits phones and landscape', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/loading');
  const globe = page.getByTestId('globe-webgl');
  await expect(globe).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause globe rotation' })).toBeDisabled();
  const still = await globe.screenshot();
  await page.waitForTimeout(400);
  expect((await globe.screenshot()).equals(still)).toBe(true);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const box = await globe.boundingBox();
        return (
          !!box &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= viewport.width &&
          box.y + box.height <= viewport.height
        );
      })
      .toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  // Changing the OS preference while the preview is open also updates motion.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Pause globe rotation' })).toBeEnabled();
  const before = await globe.screenshot();
  await expect.poll(async () => (await globe.screenshot()).equals(before)).toBe(false);
});

test('WebGL failure keeps a working animated SVG globe', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
      if (String(type).includes('webgl')) return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/loading');
  const globe = page.getByTestId('globe-svg');
  await expect(globe).toBeVisible();
  const path = globe.locator('path').last();
  const initial = await path.getAttribute('d');
  await expect(path).not.toHaveAttribute('d', initial!);
  await page.getByRole('button', { name: 'Pause globe rotation' }).click();
  const paused = await path.getAttribute('d');
  await page.waitForTimeout(300);
  await expect(path).toHaveAttribute('d', paused!);
  await expect(page.getByTestId('globe-webgl')).toHaveCount(0);
  expect(errors).toEqual([]);
});
