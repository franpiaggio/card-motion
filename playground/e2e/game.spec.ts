import { expect, test } from '@playwright/test';

// The one integration that has to keep working: shuffle, deal a hand, and score
// a played hand — end to end, with real animations running.
test('Demo: deals a hand and scores a played hand', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Demo' }).click();
  await page.getByRole('button', { name: 'Barajar y repartir' }).click();

  // The deal finished once the play control appears (phase → 'playing').
  const play = page.getByRole('button', { name: /^Jugar mano/ });
  await expect(play).toBeVisible({ timeout: 15_000 });

  // A full hand of 8 interactive cards landed.
  const handCards = page.locator('.game-stagewrap [role="button"]');
  await expect(handCards).toHaveCount(8);

  // Select three cards; the play button enables once something is selected.
  for (let i = 0; i < 3; i++) await handCards.nth(i).click();
  await expect(play).toBeEnabled();

  await play.click();

  // The score counts up past zero — the played hand actually scored.
  const score = page.locator('.game-score');
  await expect(score).not.toHaveText('0', { timeout: 15_000 });
});

// Only cards in your hand are selectable — clicking the deck/discard must not.
test('Demo: cards outside your hand cannot be selected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo' }).click();
  await page.getByRole('button', { name: 'Barajar y repartir' }).click();

  const play = page.getByRole('button', { name: /^Jugar mano/ });
  await expect(play).toBeVisible({ timeout: 15_000 });
  await expect(play).toBeDisabled(); // nothing selected yet

  // Click the top of the deck (left) and the discard slot (right) — no selection.
  const stage = (await page.locator('.game-stagewrap .cm-stage').boundingBox())!;
  await page.mouse.click(stage.x + stage.width * 0.12, stage.y + stage.height * 0.32);
  await page.mouse.click(stage.x + stage.width * 0.88, stage.y + stage.height * 0.32);
  await expect(play).toBeDisabled();

  // Sanity: a real hand card still IS selectable (so the above wasn't a no-op).
  await page.locator('.game-stagewrap [role="button"]').first().click();
  await expect(play).toBeEnabled();
});
