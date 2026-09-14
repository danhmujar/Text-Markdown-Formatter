import { test, expect } from '@playwright/test';

test.describe('pwa - installable offline mode', () => {
  test('manifest, service-worker control, and offline editing with persistence', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref as string);
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as {
      name: string;
      scope: string;
      start_url: string;
      display: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };
    expect(manifest.name).toBe('Text & Markdown Formatter');
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    for (const expected of [
      { sizes: '192x192', purpose: 'any' },
      { sizes: '512x512', purpose: 'any' },
      { sizes: '512x512', purpose: 'maskable' },
    ]) {
      expect(
        manifest.icons.some(
          (icon) =>
            icon.sizes === expected.sizes &&
            icon.purpose === expected.purpose &&
            icon.type === 'image/png',
        ),
        `missing ${expected.sizes} ${expected.purpose} icon`,
      ).toBe(true);
    }

    for (const icon of manifest.icons) {
      const iconResponse = await page.request.get(
        new URL(icon.src, manifestResponse.url()).toString(),
      );
      expect(iconResponse.ok()).toBe(true);
      expect(iconResponse.headers()['content-type']).toContain('image/png');
    }

    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    const persistedMarkdown = '# Offline check\n\nPersisted content stays available.';
    await expect(page.locator('#formatter-textarea-0-0')).toBeVisible();
    await page.locator('#formatter-textarea-0-0').fill(persistedMarkdown);
    await page.waitForTimeout(700);
    await page.locator('#toggle-edit-mode-0-0').click();
    await expect(page.locator('#formatter-preview-0-0')).toContainText(
      'Persisted content stays available.',
    );
    await page.waitForTimeout(600);

    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.clearBrowserCache');
    await context.setOffline(true);
    await expect(page.locator('#offline-pill')).toBeVisible();
    await expect(page.locator('#offline-pill')).toHaveAttribute(
      'aria-label',
      'Browser reports no network connection; cached formatter features may still work',
    );
    await context.setOffline(false);
    await expect(page.locator('#offline-pill')).toBeHidden();

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.locator('header img')).toHaveJSProperty('complete', true);
      await expect(page.locator('header img')).toHaveJSProperty('naturalWidth', 192);
      await expect(page.locator('#formatter-preview-0-0')).toContainText(
        'Persisted content stays available.',
      );

      await page.locator('#toggle-edit-mode-0-0').click();
      await expect(page.locator('#formatter-textarea-0-0')).toBeVisible();
      await page
        .locator('#formatter-textarea-0-0')
        .fill('# Offline check\n\nEdited while offline.');
      await page.waitForTimeout(700);
      await page.locator('#toggle-edit-mode-0-0').click();
      await expect(page.locator('#formatter-preview-0-0')).toContainText('Edited while offline.');

      await page.locator('#header-undo-btn').click();
      await expect(page.locator('#formatter-preview-0-0')).toContainText(
        'Persisted content stays available.',
      );
    } finally {
      await context.setOffline(false);
      await cdpSession.detach();
    }
    await expect(page.locator('#offline-pill')).toBeHidden();
  });
});
