import { test, expect } from '@playwright/test';

// These tests use the shared operating-system clipboard.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const clipboard = navigator.clipboard;
    const write = clipboard.write.bind(clipboard);
    Object.defineProperty(clipboard, 'write', {
      configurable: true,
      value: async (items: ClipboardItem[]) => {
        document.documentElement.dataset.selectionClipboardWrite = 'pending';
        await write(items);
        document.documentElement.dataset.selectionClipboardWrite = 'complete';
      },
    });
  });
});

const financialMeasures = `Financial measures - 70%:
(i) 35% Adjusted EBIT margin;
(ii) 15% Revenue growth;
(iii) 20% Free cash flow;
Non-financial measures - 30%:
(iv) 10% USV utilisation;
(v) 10% Women in senior management;
(vi) 10% Voluntary turnover rate.`;

test('Preview financial measures copy preserves every selected line for Catalyst', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const editor = page.locator('#formatter-textarea-0-0');
  const content = financialMeasures + financialMeasures;
  await editor.fill(content);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.locator('#formatter-preview-0-0');
  const originalHtml = await preview.innerHTML();
  await preview.focus();
  await preview.selectText();
  await page.keyboard.press('Control+c');
  await expect(page.locator('html')).toHaveAttribute('data-selection-clipboard-write', 'complete');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    content.replace(/\n/g, '<br>'),
  );
  expect(await preview.innerHTML()).toBe(originalHtml);
  await expect(preview).toBeFocused();
});

test('Preview partial bold selection copies visible text and inherited rich formatting', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#formatter-textarea-0-0').fill('Before **selected words** after');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.locator('#formatter-preview-0-0');
  await preview.focus();
  await preview.evaluate((element) => {
    const text = element.querySelector('strong')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 2);
    range.setEnd(text, 8);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press('Control+c');
  await expect(page.locator('html')).toHaveAttribute('data-selection-clipboard-write', 'complete');
  const copied = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return {
      text: await (await item.getType('text/plain')).text(),
      html: await (await item.getType('text/html')).text(),
      selected: window.getSelection()!.toString(),
    };
  });
  expect(copied.text).toBe('lected');
  expect(copied.html).toContain('<strong>lected</strong>');
  expect(copied.html).not.toContain('Before');
  expect(copied.selected).toBe('lected');
});

test('financial measures selection matches the whole-cell Catalyst clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const editor = page.locator('#formatter-textarea-0-0');
  const content = financialMeasures + financialMeasures;
  await editor.fill(content);
  const readClipboard = () =>
    page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return {
        text: await (await item.getType('text/plain')).text(),
        html: await (await item.getType('text/html')).text(),
      };
    });
  await page
    .getByRole('button', { name: 'Copy formatted Cleaned Text to Catalyst', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-selection-clipboard-write', 'complete');
  const button = await readClipboard();
  await page.evaluate(() => {
    delete document.documentElement.dataset.selectionClipboardWrite;
  });
  await editor.focus();
  await editor.selectText();
  await page.keyboard.press('Control+c');
  await expect(page.locator('html')).toHaveAttribute('data-selection-clipboard-write', 'complete');
  const shortcut = await readClipboard();
  expect(shortcut.text).toBe(content.replace(/\n/g, '<br>'));
  expect(shortcut.text).toBe(button.text);
  expect(shortcut.html).toContain('Voluntary turnover rate.');
  expect(shortcut.html).toBe(button.html);
});

test('Edit selection copies Catalyst text and rich HTML through Ctrl+C', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const editor = page.locator('#formatter-textarea-0-0');
  const content = 'Before\n**Selected**\nSecond line\nAfter';
  await editor.fill(content);
  await editor.evaluate((element: HTMLTextAreaElement) => {
    const start = element.value.indexOf('**Selected**');
    element.setSelectionRange(start, element.value.indexOf('\nAfter'));
  });
  await page.keyboard.press('Control+c');
  await expect(page.locator('html')).toHaveAttribute('data-selection-clipboard-write', 'complete');
  const copied = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return {
      text: await (await item.getType('text/plain')).text(),
      html: await (await item.getType('text/html')).text(),
    };
  });
  expect(copied.text).toBe('**Selected**<br>Second line');
  expect(copied.html).toContain('<strong');
  expect(copied.html).toContain('Selected');
  expect(copied.html).not.toContain('Before');
  expect(copied.html).not.toContain('After');
  await expect(editor).toHaveValue(content);
  await expect(editor).toBeFocused();
  expect(
    await editor.evaluate((element: HTMLTextAreaElement) =>
      element.value.slice(element.selectionStart, element.selectionEnd),
    ),
  ).toBe('**Selected**\nSecond line');
});
