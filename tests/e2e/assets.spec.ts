import { test, expect } from './fixtures';
import { BlockCodePage } from './pages/BlockCodePage';

test.describe('Sprites and backgrounds', () => {
  test('tabs switch views and a new background is added to the stage', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await expect(app.blocksView).toBeVisible();

    await app.tabAssets.click();
    await expect(app.assetsView).toBeVisible();
    await expect(app.blocksView).toBeHidden();
    await expect(app.tabAssets).toHaveAttribute('aria-selected', 'true');

    await expect(app.spriteList.locator('.asset-row').first()).toContainText('Rocket');
    await expect(app.bgList.locator('.asset-row').first()).toContainText('Mission Control');

    await app.bgNameInput.fill('E2E Sky');
    await app.bgColorInput.fill('#123456');
    await app.bgAccentInput.fill('#654321');
    await app.createBgButton.click();

    await expect(app.toast).toHaveText('Background created.');
    const newBackground = app.bgList.locator('.asset-row').filter({ hasText: 'E2E Sky' });
    await expect(newBackground).toHaveCount(1);
    await expect(newBackground).toContainText('Active');

    await app.capture(testInfo, 'new-background.png');

    await app.tabBlocks.click();
    await expect(app.blocksView).toBeVisible();
    await expect(app.assetsView).toBeHidden();
    await expect(app.tabBlocks).toHaveAttribute('aria-selected', 'true');
  });

  test('custom sprite opens the asset editor and can be closed', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.tabAssets.click();
    await expect(app.spriteList.locator('.asset-row')).toHaveCount(1);

    await app.makeCustomSpriteButton.click();

    await expect(app.assetEditorView).toBeVisible();
    await expect(app.assetsView).toBeHidden();
    await expect(app.assetEditorTitle).toContainText(/new sprite/i);
    await expect(app.assetEditorHost.locator(':scope > *')).toHaveCount(1);
    await expect(app.toast).toHaveText('Sprite created.');

    await app.capture(testInfo, 'custom-sprite-editor.png');

    await app.assetEditorBackButton.click();
    await expect(app.assetsView).toBeVisible();
    await expect(app.assetEditorView).toBeHidden();
    await expect(app.spriteList.locator('.asset-row')).toHaveCount(2);
  });
});
