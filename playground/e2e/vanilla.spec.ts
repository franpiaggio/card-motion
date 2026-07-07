import { expect, test } from '@playwright/test';

// The vanilla build's happy path, in a real browser with real rAF: the whole
// table at #/vanilla is mounted by `card-motion/vanilla` (no React below the
// header), and must deal, select and play exactly like the React one.
test('Vanilla: deals a hand, selects a card, and plays it', async ({ page }) => {
  test.setTimeout(60_000); // several retry-until-idle loops of up to 15s each
  await page.goto('/#/vanilla');

  // The full deck rendered and the deal control is visible.
  await expect(page.locator('.cm-card')).toHaveCount(52);
  const deal = page.getByRole('button', { name: 'Deal' });
  await expect(deal).toBeVisible();

  await deal.click();

  // 8 hand cards became interactive toggle buttons; the live region updated.
  const handCards = page.locator('.cm-stage [role="button"]');
  await expect(handCards).toHaveCount(8, { timeout: 15_000 });
  await expect(page.locator('.cm-sr-only')).toContainText('8 cards in hand');

  // Select one card → aria-pressed flips and "Play" replaces "Play All".
  // Every interaction below retries: the table drops actions while an
  // animation is still playing (same busy guard as the React <CardTable>).
  await expect(page.getByRole('button', { name: 'Play All' })).toBeVisible();
  await expect(async () => {
    await handCards.first().click();
    await expect(handCards.first()).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect(page.locator('.cm-sr-only')).toContainText('1 selected');

  await expect(async () => {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('.cm-sr-only')).toContainText('1 on the table', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  // Reset collects everything back to the deck. The table drops actions while
  // an animation is still playing (same busy guard as the React <CardTable>),
  // so retry the click until the engine accepts it — like a real user would.
  await expect(async () => {
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.cm-sr-only')).toContainText('0 cards in hand', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
});

// Keyboard flow: roving tabindex + Enter to select, exactly like <CardTable>.
test('Vanilla: hand cards are keyboard-operable', async ({ page }) => {
  await page.goto('/#/vanilla');
  await page.getByRole('button', { name: 'Deal' }).click();
  const handCards = page.locator('.cm-stage [role="button"]');
  await expect(handCards).toHaveCount(8, { timeout: 15_000 });

  const first = page.locator('.cm-stage [role="button"][tabindex="0"]');
  await expect(first).toHaveCount(1);
  // Selection is dropped while the deal animation is still playing (busy
  // guard, same as the React <CardTable>) — retry until the engine is idle.
  await expect(async () => {
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.locator('.cm-sr-only')).toContainText('1 selected', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
});
