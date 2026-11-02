// Application startup. All feature scripts are loaded before this file.
/* ---------- Boot ---------- */

let workspace = [];

const initialScript = [
  makeBlock('start'),
  makeBlock('goto'),
  makeBlock('move', { steps: 60 }),
  makeBlock('turn', { deg: 90 }),
  makeBlock('say', { text: 'Hello, NASA!', secs: 1.2 }),
  makeBlock('wait', { secs: 0.4 })
].filter(Boolean);

workspace = initialScript.length ? [makeScript(initialScript, 24, 24)] : [];

loadLayoutState();
applyLayoutState();

initSprites();
initializeSpriteWorkspaces();
renderPalette();
renderWorkspace();
setRunning(false);
resetSprite(false);

initPanels();
initTabs();
initStageObserver();
syncStageGeometry();
initCodeDictionary();
