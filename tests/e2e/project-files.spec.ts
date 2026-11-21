import fs from 'node:fs';
import { test, expect } from './fixtures';
import { BlockCodePage, STARTER_BLOCK_TYPES } from './pages/BlockCodePage';

test.describe('Project file save and open', () => {
  test('Save downloads a project file that can be reopened', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.loadStarterWorkspace();

    const download = await app.saveProjectDownload();
    expect(download.suggestedFilename()).toBe('Untitled.blockcode');

    const projectPath = testInfo.outputPath('roundtrip.blockcode');
    await download.saveAs(projectPath);

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    expect(project.format).toBe('blockcode-project');
    expect(project.version).toBe(1);
    expect(project.data['blockcode.sprite-workspaces.v1']).toContain('"start"');
    expect(project.data['blockcode.assets.v1']).toBeTruthy();

    // New project first, so the reopen proves the file restored the workspace.
    await app.newProjectButton.click();
    await app.waitForEditorReload();
    await expect(app.workspaceBlocks).toHaveCount(0);
    await expect(app.emptyState).toBeVisible();

    await app.openProjectFile(projectPath);

    await expect(app.workspaceBlocks).toHaveCount(STARTER_BLOCK_TYPES.length);
    expect(await app.workspaceBlockTypes()).toEqual(STARTER_BLOCK_TYPES);

    await app.capture(testInfo, 'reopened-project.png');
  });

  test('Save As also downloads the current project', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();

    const download = await app.saveProjectAsDownload();
    expect(download.suggestedFilename()).toBe('Untitled.blockcode');

    const outputPath = testInfo.outputPath('save-as.blockcode');
    await download.saveAs(outputPath);

    const project = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    expect(project.format).toBe('blockcode-project');
    expect(project.data['blockcode.lists.v1']).toBe('[]');
  });

  test('an unsupported project file is rejected without changing the workspace', async ({ page }) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.loadStarterWorkspace();
    await app.expectWorkspaceBlockTypes(STARTER_BLOCK_TYPES);

    await app.openProjectBuffer('broken.blockcode', '{"format":"nope"}');

    await expect(app.toast).toHaveText('This is not a supported BlockCode project file.');
    await app.expectWorkspaceBlockTypes(STARTER_BLOCK_TYPES);
    await expect(app.app).toBeVisible();
  });

  test('New asks to save an untitled project and can be cancelled', async ({ page }) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await expect(app.workspaceBlocks).toHaveCount(0);

    await app.newProjectButton.click();
    await expect(app.saveProjectDialog).toBeVisible();

    await app.cancelSaveChanges();
    await expect(app.saveProjectDialog).toHaveCount(0);
    await expect(app.paletteGroups.first()).toBeVisible();

    await app.newProjectButton.click();
    await expect(app.saveProjectDialog).toBeVisible();
    await app.discardChanges();
    await app.waitForEditorReload();
    await expect(app.workspaceBlocks).toHaveCount(0);
  });
});
