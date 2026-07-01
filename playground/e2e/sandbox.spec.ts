import { expect, test } from '@playwright/test';

// The Sandbox validates the engine for a non-poker game: custom faces, per-card
// zone rules, playing an effect, and the deck-search modal.
test('Sandbox: zone restriction, effect on play, and deck search', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sandbox' }).click();

  // Custom card faces render (not <Card>).
  const boostInHand = page.locator('.sb-slot:not(.in-deck)', { has: page.locator('.k-boost') }).first();
  await expect(boostInHand).toBeVisible();

  // Rule: a boost may only enter Zone 1 — selecting it disables Zone 2.
  await boostInHand.click(); // a tap selects
  await expect(page.getByRole('button', { name: 'Bajar a Zona 2' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Bajar a Zona 1' })).toBeEnabled();

  // Playing it into Zone 1 fires its effect (+3 to the score).
  await page.getByRole('button', { name: 'Bajar a Zona 1' }).click();
  await expect(page.locator('.sb-scorebox .game-score')).toHaveText('3');

  // Open the deck, browse it, and pull a card into play.
  await page.getByRole('button', { name: 'Buscar en la baraja' }).click();
  await expect(page.locator('.cm-reveal-overlay')).toBeVisible();
  await page.locator('.cm-reveal-card').first().click();
  await expect(page.locator('.cm-reveal-overlay')).toHaveCount(0); // modal closed after picking
});

// Dragging a boost into a zone it isn't allowed in is rejected and snaps back.
test('Sandbox: a forbidden drag is rejected and snaps back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sandbox' }).click();

  const boost = page.locator('.sb-slot:not(.in-deck)', { has: page.locator('.k-boost') }).first();
  await expect(boost).toBeVisible();
  const card = (await boost.boundingBox())!;
  const stage = (await page.locator('.sb-stagewrap .cm-stage').boundingBox())!;

  // Drag the boost down into Zone 2's band (the lower zone) with real pointer moves.
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  await page.mouse.down();
  await page.mouse.move(stage.x + stage.width * 0.62, stage.y + stage.height * 0.58, { steps: 12 });
  await page.mouse.up();

  // The drop was rejected (logged) and nothing scored — the card snapped home.
  await expect(page.locator('.sb-loglist-mini')).toContainText('rechazado');
  await expect(page.locator('.sb-scorebox .game-score')).toHaveText('0');
});
