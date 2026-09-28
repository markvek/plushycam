import { test, expect } from '@playwright/test';

test('controls support keyboard, hover, pressed, and disabled states', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('button', { name: 'Add your camera', exact: true });
  const snapshot = page.getByRole('button', { name: 'Save footage', exact: true });
  await expect(snapshot).toBeDisabled();
  await expect(page.getByText('OFFLINE', { exact: true })).toBeVisible();
  const background = await add.evaluate((el) => getComputedStyle(el).backgroundColor);
  await add.hover();
  await expect(add).not.toHaveCSS('background-color', background);
  await page.mouse.down();
  await expect(add).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 1, 1)');
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await add.focus();
  await expect(add).toBeFocused();
  await expect(add).toHaveCSS('border-top-color', 'rgb(96, 106, 160)');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('textbox', { name: 'Camera name', exact: true })).toBeVisible();
});

test('icon navigation opens separate pages and supports reload and browser history', async ({
  page,
}) => {
  await page.goto('/');
  const destinations = [
    { label: 'Camera', path: '/', heading: 'Camera' },
    { label: 'Open library', path: '/saved', heading: 'Library' },
    { label: 'Manage cameras', path: '/settings', heading: 'Manage cameras' },
  ];
  for (const { label, path } of destinations) {
    const link = page.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', path);
    await expect(link.locator('svg')).toBeVisible();
  }
  await page.getByRole('link', { name: 'Open library', exact: true }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save footage', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Camera name', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  const manage = page.getByRole('link', { name: 'Manage cameras', exact: true });
  await manage.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('textbox', { name: 'Camera name', exact: true })).toBeVisible();
  await expect(manage).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect(page).toHaveURL(/\/saved$/);
  await page.getByRole('link', { name: 'Camera', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Camera', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Camera name', exact: true })).toHaveCount(0);
});

test('every page fits narrow phones and tablet breakpoints', async ({ page }) => {
  for (const width of [320, 390, 768, 900]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/', '/settings', '/saved']) {
      await page.goto(route);
      await expect(
        page.getByText(
          route === '/'
            ? 'No camera selected'
            : route === '/settings'
              ? 'Add a camera'
              : 'No saved snapshots',
          { exact: true },
        ),
      ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              Array.from(document.querySelectorAll('div, input, button, a')).filter((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1);
              }).length,
          ),
        )
        .toBe(0);
      expect(new URL(page.url()).pathname).toBe(route);
      for (const label of ['Camera', 'Open library', 'Manage cameras']) {
        await expect(
          page.getByRole('link', { name: label, exact: true }).locator('svg'),
        ).toBeVisible();
      }
    }
  }
});
