import { expect, type Download, type Locator, type Page, type TestInfo } from '@playwright/test';

export const STARTER_BLOCK_TYPES = ['start', 'goto', 'move', 'turn', 'say', 'wait'];

/**
 * Page object for the BlockCode browser editor.
 *
 * The app uses stable element IDs rather than data-testid attributes, so this
 * class is the single place where selectors live. Tests should call the
 * intent-level methods below instead of reaching into the DOM directly.
 */
export class BlockCodePage {
  readonly page: Page;

  // Shell
  readonly app: Locator;
  readonly toast: Locator;
  readonly saveProjectDialog: Locator;
  readonly saveProjectSaveButton: Locator;
  readonly saveProjectDiscardButton: Locator;
  readonly saveProjectCancelButton: Locator;

  // Toolbar
  readonly newProjectButton: Locator;
  readonly openProjectButton: Locator;
  readonly saveProjectButton: Locator;
  readonly saveProjectAsButton: Locator;
  readonly openProjectInput: Locator;
  readonly dictionaryButton: Locator;
  readonly runButton: Locator;
  readonly stopButton: Locator;
  readonly resetButton: Locator;
  readonly clearButton: Locator;
  readonly uploadButton: Locator;

  // Tabs / views
  readonly tabBlocks: Locator;
  readonly tabAssets: Locator;
  readonly tabAssetEditor: Locator;
  readonly blocksView: Locator;
  readonly assetsView: Locator;
  readonly assetEditorView: Locator;

  // Block workspace
  readonly palette: Locator;
  readonly paletteGroups: Locator;
  readonly canvas: Locator;
  readonly scripts: Locator;
  readonly workspaceBlocks: Locator;
  readonly emptyState: Locator;
  readonly hint: Locator;

  // Code panel
  readonly watchCode: Locator;
  readonly codeStatus: Locator;
  readonly copyCodeButton: Locator;
  readonly downloadCodeButton: Locator;
  readonly buildAppButton: Locator;

  // Stage
  readonly stage: Locator;
  readonly sprite: Locator;
  readonly bubble: Locator;
  readonly posLabel: Locator;

  // Dictionary
  readonly dictionaryDialog: Locator;
  readonly dictionarySearch: Locator;
  readonly dictionaryCount: Locator;
  readonly dictionaryResults: Locator;
  readonly dictionaryEntries: Locator;
  readonly dictionaryEmpty: Locator;
  readonly dictionaryCloseButton: Locator;

  // Assets
  readonly spriteList: Locator;
  readonly bgList: Locator;
  readonly bgNameInput: Locator;
  readonly bgColorInput: Locator;
  readonly bgAccentInput: Locator;
  readonly createBgButton: Locator;
  readonly newSpriteButton: Locator;
  readonly makeCustomSpriteButton: Locator;
  readonly assetEditorBackButton: Locator;
  readonly assetEditorTitle: Locator;
  readonly assetEditorHost: Locator;

  constructor(page: Page) {
    this.page = page;

    this.saveProjectDialog = page.locator('.save-project-dialog');
    this.saveProjectSaveButton = this.saveProjectDialog.getByRole('button', { name: 'Save' });
    this.saveProjectDiscardButton = this.saveProjectDialog.getByRole('button', { name: "Don't save" });
    this.saveProjectCancelButton = this.saveProjectDialog.getByRole('button', { name: 'Cancel' });
    this.app = page.locator('.app');
    this.toast = page.locator('#toast');

    this.newProjectButton = page.locator('#newProjectBtn');
    this.openProjectButton = page.locator('#openProjectBtn');
    this.saveProjectButton = page.locator('#saveProjectBtn');
    this.saveProjectAsButton = page.locator('#saveProjectAsBtn');
    this.openProjectInput = page.locator('#openProjectInput');
    this.dictionaryButton = page.locator('#dictionaryBtn');
    this.runButton = page.locator('#runBtn');
    this.stopButton = page.locator('#stopBtn');
    this.resetButton = page.locator('#resetBtn');
    this.clearButton = page.locator('#clearBtn');
    this.uploadButton = page.locator('#uploadBtn');

    this.tabBlocks = page.locator('#tabBlocks');
    this.tabAssets = page.locator('#tabAssets');
    this.tabAssetEditor = page.locator('#tabAssetEditor');
    this.blocksView = page.locator('#viewBlocks');
    this.assetsView = page.locator('#viewAssets');
    this.assetEditorView = page.locator('#viewAssetEditor');

    this.palette = page.locator('#palette');
    this.paletteGroups = page.locator('#palette .palette-group');
    this.canvas = page.locator('#canvas');
    this.scripts = page.locator('#scripts .script');
    this.workspaceBlocks = page.locator('#scripts .block[data-path]');
    this.emptyState = page.locator('#empty');
    this.hint = page.locator('#hint');

    this.watchCode = page.locator('#watchCode');
    this.codeStatus = page.locator('#codeStatus');
    this.copyCodeButton = page.locator('#copyCodeBtn');
    this.downloadCodeButton = page.locator('#downloadCodeBtn');
    this.buildAppButton = page.locator('#buildAppBtn');

    this.stage = page.locator('#stage');
    this.sprite = page.locator('#sprite');
    this.bubble = page.locator('#bubble');
    this.posLabel = page.locator('#posLabel');

    this.dictionaryDialog = page.locator('#codeDictionary');
    this.dictionarySearch = page.locator('#dictionarySearch');
    this.dictionaryCount = page.locator('#dictionaryCount');
    this.dictionaryResults = page.locator('#dictionaryResults');
    this.dictionaryEntries = page.locator('#dictionaryResults .dictionary-entry');
    this.dictionaryEmpty = page.locator('#dictionaryResults .dictionary-empty');
    this.dictionaryCloseButton = page.locator('#dictionaryClose');

    this.spriteList = page.locator('#spriteList');
    this.bgList = page.locator('#bgList');
    this.bgNameInput = page.locator('#bgName');
    this.bgColorInput = page.locator('#bgColor');
    this.bgAccentInput = page.locator('#bgAccent');
    this.createBgButton = page.locator('#createBgBtn');
    this.newSpriteButton = page.locator('#newSpriteBtn');
    this.makeCustomSpriteButton = page.locator('#makeCustomSpriteBtn');
    this.assetEditorBackButton = page.locator('#assetEditorBack');
    this.assetEditorTitle = page.locator('#assetEditorTitle');
    this.assetEditorHost = page.locator('#assetEditorHost');
  }

  // ---------------------------------------------------------------- startup

  /** Load the editor. The app has no start page and boots on a blank project. */
  async openEditor(): Promise<void> {
    await this.page.goto('/');
    await expect(this.paletteGroups.first()).toBeVisible();
    await expect(this.app).not.toHaveAttribute('inert');
  }

  /** Wait for the reload the app performs after New / Open. */
  async waitForEditorReload(): Promise<void> {
    await this.page.waitForFunction(() => {
      const entry = performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined;
      return Boolean(
        entry && entry.type === 'reload' &&
        document.querySelector('#palette .palette-group')
      );
    });
    await expect(this.paletteGroups.first()).toBeVisible();
  }

  /**
   * Seed the workspace with the classic six-block starter script. Tests that
   * exercise running/generated code use this instead of relying on launch
   * defaults, because a launch now always creates a blank project.
   */
  async loadStarterWorkspace(
    extraBlocks: Array<{ type: string; params?: Record<string, unknown> }> = []
  ): Promise<void> {
    const extraJson = JSON.stringify(extraBlocks);
    await this.page.evaluate(`
      (() => {
        const script = [
          { type: 'start' },
          { type: 'goto' },
          { type: 'move', params: { steps: 60 } },
          { type: 'turn', params: { deg: 90 } },
          { type: 'say', params: { text: 'Hello, NASA!', secs: 1.2 } },
          { type: 'wait', params: { secs: 0.4 } },
          ...${extraJson}
        ].map((block) => makeBlock(block.type, block.params)).filter(Boolean);
        workspace = script.length ? [makeScript(script, 24, 24)] : [];
        saveSpriteWorkspaces();
        renderWorkspace();
      })();
    `);
  }

  async confirmSaveChanges(): Promise<void> {
    await this.saveProjectSaveButton.click();
  }

  async discardChanges(): Promise<void> {
    await this.saveProjectDiscardButton.click();
  }

  async cancelSaveChanges(): Promise<void> {
    await this.saveProjectCancelButton.click();
  }

  // ---------------------------------------------------------------- blocks

  async workspaceBlockTypes(): Promise<string[]> {
    return this.workspaceBlocks.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.type || '')
    );
  }

  async expectWorkspaceBlockTypes(types: string[]): Promise<void> {
    await expect(this.workspaceBlocks).toHaveCount(types.length);
    expect(await this.workspaceBlockTypes()).toEqual(types);
  }

  paletteBlock(type: string): Locator {
    return this.palette.locator(`.block[data-type="${type}"]`).first();
  }

  /**
   * Drag a palette block into the workspace with real pointer events.
   *
   * Source coordinates are offset 12px from the top-left so the gesture starts
   * on the block artwork, never on an editable slot (the app deliberately
   * ignores drags that begin inside inputs/selects).
   */
  async dragPaletteBlockTo(type: string, targetX: number, targetY: number): Promise<void> {
    const block = this.paletteBlock(type);
    await block.scrollIntoViewIfNeeded();
    const box = await block.boundingBox();
    if (!box) throw new Error(`Palette block "${type}" is not visible`);

    await this.page.mouse.move(box.x + 12, box.y + 12);
    await this.page.mouse.down();
    await this.page.mouse.move(targetX, targetY, { steps: 15 });
    await this.page.mouse.up();

    await expect(this.page.locator('.drag-ghost')).toHaveCount(0);
  }

  /** Drop a palette block just below an existing workspace block (snap). */
  async dragPaletteBlockBelow(type: string, anchor: Locator): Promise<void> {
    const box = await anchor.boundingBox();
    if (!box) throw new Error('Anchor block is not visible');
    await this.dragPaletteBlockTo(type, box.x + 24, box.y + box.height + 6);
  }

  // ---------------------------------------------------------------- actions

  async run(): Promise<void> {
    await this.runButton.click();
  }

  async clearWorkspace(): Promise<void> {
    await this.clearButton.click();
  }

  async saveProjectDownload(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.saveProjectButton.click()
    ]);
    return download;
  }

  async saveProjectAsDownload(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.saveProjectAsButton.click()
    ]);
    return download;
  }

  async downloadCpp(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadCodeButton.click()
    ]);
    return download;
  }

  async openProjectFile(filePath: string): Promise<void> {
    await this.openProjectInput.setInputFiles(filePath);
  }

  async openProjectBuffer(name: string, contents: string): Promise<void> {
    await this.openProjectInput.setInputFiles({
      name,
      mimeType: 'application/json',
      buffer: Buffer.from(contents)
    });
  }

  // --------------------------------------------------------------- artifacts

  async capture(testInfo: TestInfo, name: string): Promise<void> {
    await this.page.screenshot({
      path: testInfo.outputPath(name),
      fullPage: true
    });
  }
}
