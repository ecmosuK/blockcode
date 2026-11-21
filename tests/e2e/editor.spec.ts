import { test, expect } from './fixtures';
import { BlockCodePage, STARTER_BLOCK_TYPES } from './pages/BlockCodePage';

test.describe('Editor startup and program execution', () => {
  test('app starts directly on a new blank project', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();

    await expect(page).toHaveTitle(/BlockCode/);
    await expect(app.app).toBeVisible();
    await expect(app.emptyState).toBeVisible();
    await expect(app.workspaceBlocks).toHaveCount(0);
    await expect(app.runButton).toBeEnabled();
    await expect(app.saveProjectDialog).toHaveCount(0);
    await expect(page.locator('#welcomeScreen')).toHaveCount(0);

    await app.capture(testInfo, 'new-project.png');
  });

  test('starter workspace renders blocks and generated Watch C++', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.loadStarterWorkspace();

    await app.expectWorkspaceBlockTypes(STARTER_BLOCK_TYPES);
    await expect(app.hint).toHaveText('Drag blocks into loops, or snap stacks together.');
    await expect(app.posLabel).toHaveText('x 0 | y 0');

    await expect(app.watchCode).toContainText('qos_app_running');
    await expect(app.watchCode).toContainText('watch_say("Hello, NASA!", 1.2f);');
    await expect(app.codeStatus).toContainText('6 blocks');

    await app.capture(testInfo, 'starter-workspace.png');
  });

  test('Run animates the stage, shows the say bubble, and Stop halts it', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.loadStarterWorkspace([{ type: 'wait', params: { secs: 5 } }]);
    await expect(app.posLabel).toHaveText('x 0 | y 0');

    await app.run();

    await expect(app.runButton).toHaveText('Running...');
    await expect(app.stopButton).toBeEnabled();

    // goto -> move -> turn -> say: the bubble appears roughly one second in.
    await expect(app.bubble).toHaveClass(/is-visible/, { timeout: 6_000 });
    await expect(app.bubble).toHaveText('Hello, NASA!');
    await expect(app.posLabel).toHaveText('x 96 | y 0');

    await app.capture(testInfo, 'run-say-bubble.png');

    await app.stopButton.click();
    await expect(app.runButton).toHaveText('Run');
    await expect(app.stopButton).toBeDisabled();
    await expect(app.bubble).not.toHaveClass(/is-visible/);
  });

  test('Run completes on its own and restores the toolbar state', async ({ page }) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.loadStarterWorkspace();
    await app.run();

    await expect(app.runButton).toHaveText('Running...');
    await expect(app.runButton).toHaveText('Run', { timeout: 12_000 });
    await expect(app.stopButton).toBeDisabled();
    await expect(app.posLabel).toHaveText('x 96 | y 0');
  });

  test('Clear empties the workspace and Run explains how to start', async ({ page }, testInfo) => {
    const app = new BlockCodePage(page);

    await app.openEditor();
    await app.clearWorkspace();

    await expect(app.workspaceBlocks).toHaveCount(0);
    await expect(app.emptyState).toBeVisible();
    await expect(app.toast).toHaveText('Workspace cleared.');
    await expect(app.watchCode).toHaveText('');

    await app.run();
    await expect(app.toast).toHaveText('Drag some blocks into the workspace first.');
    await expect(app.runButton).toHaveText('Run');

    await app.capture(testInfo, 'cleared-workspace.png');
  });
});
