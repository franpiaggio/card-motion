import { expect, test, type Page } from '@playwright/test';

const SHOT = '/private/tmp/claude-501/-Users-franciscopiaggio-localwork-cardLibrary-playground/970f058e-21d4-4d00-b31c-1dc445bb88c2/scratchpad';

async function closeRules(page: Page) {
  await expect(page.locator('.sol-modal')).toBeVisible();
  await page.locator('.sol-modal-close').click();
  await expect(page.locator('.sol-modal')).toHaveCount(0);
}

// Dismiss the opening overlay: a difficulty picker (pick the first option) or a rules modal.
async function dismissStart(page: Page) {
  await expect(page.locator('.sol-modal')).toBeVisible();
  const diff = page.locator('.sol-diff-opt').first();
  if (await diff.count()) await diff.click();
  else await page.locator('.sol-modal-close').click();
  await expect(page.locator('.sol-modal')).toHaveCount(0);
}

async function noHorizontalOverflow(page: Page) {
  const over = await page.evaluate(() => {
    const b = document.querySelector('.sol-board') as HTMLElement;
    return b.scrollWidth - b.clientWidth;
  });
  expect(over).toBeLessThanOrEqual(1);
}

async function dragToFirstFreeCell(page: Page) {
  const card = (await page.locator('.sol-col').first().locator('.cm-draggable').last().boundingBox())!;
  const cell = (await page.locator('.sol-top .sol-cell').first().boundingBox())!;
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  await page.mouse.down();
  await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2, { steps: 14 });
  await page.mouse.up();
}

// ── FreeCell ─────────────────────────────────────────────────────────────────
test.describe('FreeCell', () => {
  test('deals 8 columns, opens rules, and drags a card into a free cell', async ({ page }) => {
    await page.goto('/#/freecell');
    await closeRules(page);
    await expect(page.locator('.sol-col')).toHaveCount(8);
    await noHorizontalOverflow(page);

    await dragToFirstFreeCell(page);
    // The free cell now holds a card and the move counter advanced.
    await expect(page.locator('.sol-top .sol-cell').first().locator('.cm-card')).toBeVisible();
    await expect(page.locator('.sol-stat')).toHaveText('1 moves');
  });

  test('is playable on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/freecell');
    await closeRules(page);
    await expect(page.locator('.sol-col')).toHaveCount(8);
    await noHorizontalOverflow(page);
    await dragToFirstFreeCell(page);
    await expect(page.locator('.sol-top .sol-cell').first().locator('.cm-card')).toBeVisible();
    await page.screenshot({ path: `${SHOT}/freecell-mobile.png` });
  });
});

// ── Klondike ─────────────────────────────────────────────────────────────────
test.describe('Klondike', () => {
  test('deals 7 columns and draws from the stock to the waste', async ({ page }) => {
    await page.goto('/#/klondike');
    await dismissStart(page);
    await expect(page.locator('.sol-col')).toHaveCount(7);
    await noHorizontalOverflow(page);

    await expect(page.locator('.sol-cell').first().locator('.cm-card')).toHaveCount(0); // waste empty
    await page.locator('.sol-stock').click();
    await expect(page.locator('.sol-cell').first().locator('.cm-card')).toBeVisible(); // waste has a card
    await expect(page.locator('.sol-stat')).toHaveText('1 moves');
  });

  test('is playable on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/klondike');
    await dismissStart(page);
    await expect(page.locator('.sol-col')).toHaveCount(7);
    await noHorizontalOverflow(page);
    await page.locator('.sol-stock').click();
    await expect(page.locator('.sol-cell').first().locator('.cm-card')).toBeVisible();
    await page.screenshot({ path: `${SHOT}/klondike-mobile.png` });
  });
});

// ── Examples index ───────────────────────────────────────────────────────────
test('Examples index links to both games', async ({ page }) => {
  await page.goto('/#/examples');
  await expect(page.getByRole('heading', { name: /Working/ })).toBeVisible();
  await page.getByRole('link', { name: /FreeCell/ }).click();
  await expect(page).toHaveURL(/#\/freecell$/);
});
