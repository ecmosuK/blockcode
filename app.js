// Application startup. All feature scripts are loaded before this file.
/* ---------- Boot ---------- */

let workspace = [];

const PROJECT_FORMAT = 'blockcode-project';
const PROJECT_VERSION = 1;
const SHOW_EDITOR_AFTER_RELOAD_KEY = 'blockcode.show-editor-after-project-load';
const PROJECT_STORAGE_KEYS = [
  ASSETS_KEY,
  SPRITE_WORKSPACES_KEY,
  VARIABLES_KEY,
  LISTS_KEY,
  VISIBLE_VARIABLES_KEY,
  VISIBLE_LISTS_KEY
];

function createProjectFile() {
  saveSpriteWorkspaces();
  saveRuntimeAssets();
  const data = {};
  PROJECT_STORAGE_KEYS.forEach((key) => {
    data[key] = localStorage.getItem(key);
    if (data[key] === null &&
        key !== ASSETS_KEY && key !== SPRITE_WORKSPACES_KEY) {
      data[key] = '[]';
    }
  });
  return JSON.stringify({
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    data
  }, null, 2);
}

function parseProjectFile(contents) {
  const project = JSON.parse(contents);
  if (!project || project.format !== PROJECT_FORMAT ||
      project.version !== PROJECT_VERSION || !project.data ||
      typeof project.data !== 'object' || Array.isArray(project.data)) {
    throw new Error('This is not a supported BlockCode project file.');
  }

  const data = {};
  PROJECT_STORAGE_KEYS.forEach((key) => {
    const value = project.data[key];
    if (typeof value !== 'string') {
      throw new Error('The project file is missing required project data.');
    }
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error('The project file contains invalid project data.');
    }
    if (key === ASSETS_KEY &&
        (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))) {
      throw new Error('The project file contains invalid asset data.');
    }
    if (key === SPRITE_WORKSPACES_KEY &&
        (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          Object.values(parsed).some((scripts) => !Array.isArray(scripts)))) {
      throw new Error('The project file contains invalid sprite code.');
    }
    if (key !== ASSETS_KEY && key !== SPRITE_WORKSPACES_KEY &&
        !Array.isArray(parsed)) {
      throw new Error('The project file contains invalid variables or lists.');
    }
    data[key] = value;
  });
  return data;
}

function emptyProjectData() {
  const spriteWorkspaces = {};
  ((PACK.sprites && PACK.sprites.list) || []).forEach((sprite) => {
    spriteWorkspaces[sprite.id] = [];
  });
  return {
    [ASSETS_KEY]: '{}',
    [SPRITE_WORKSPACES_KEY]: JSON.stringify(spriteWorkspaces),
    [VARIABLES_KEY]: '[]',
    [LISTS_KEY]: '[]',
    [VISIBLE_VARIABLES_KEY]: '[]',
    [VISIBLE_LISTS_KEY]: '[]'
  };
}

function installProjectData(data) {
  const previous = {};
  PROJECT_STORAGE_KEYS.forEach((key) => {
    previous[key] = localStorage.getItem(key);
  });
  try {
    PROJECT_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, data[key]));
  } catch (error) {
    PROJECT_STORAGE_KEYS.forEach((key) => {
      if (previous[key] === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous[key]);
    });
    throw new Error('Could not load this project. It may contain more data than local storage can hold.');
  }
  sessionStorage.setItem(SHOW_EDITOR_AFTER_RELOAD_KEY, 'true');
  location.reload();
}

async function openProjectFile(confirmBeforeOpen) {
  try {
    if (confirmBeforeOpen &&
        !window.confirm('Open another project? Your current work is autosaved in BlockCode, but save a project file to keep a separate copy.')) return;
    if (window.blockCodeDesktop) {
      const project = await window.blockCodeDesktop.openProject();
      if (!project) return;
      installProjectData(parseProjectFile(project.contents));
      return;
    }
    $('openProjectInput').click();
  } catch (error) {
    showToast(error.message || 'Could not open the project file.');
  }
}

async function saveProjectFile(saveAs) {
  try {
    const contents = createProjectFile();
    if (window.blockCodeDesktop) {
      const result = await window.blockCodeDesktop.saveProject(contents, saveAs);
      if (result) showToast('Project saved.');
      return;
    }
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Untitled.blockcode';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Project downloaded.');
  } catch (error) {
    showToast(error.message || 'Could not save the project file.');
  }
}

function dismissWelcomeScreen() {
  $('welcomeScreen').hidden = true;
  document.querySelector('.app').inert = false;
  document.querySelector('.app').removeAttribute('aria-hidden');
  $('runBtn').focus();
}

async function createNewProject(confirmBeforeCreate) {
  if (confirmBeforeCreate &&
      !window.confirm('Create a new project? Save your current work first if you want to keep it.')) return;
  try {
    if (window.blockCodeDesktop) await window.blockCodeDesktop.newProject();
    stopProgram();
    installProjectData(emptyProjectData());
  } catch (error) {
    showToast(error.message || 'Could not create a new project.');
  }
}

function initWelcomeScreen() {
  $('welcomeOpenProjectBtn').addEventListener('click', () => openProjectFile(false));
  $('welcomeNewProjectBtn').addEventListener('click', () => createNewProject(false));
  if (sessionStorage.getItem(SHOW_EDITOR_AFTER_RELOAD_KEY) === 'true') {
    sessionStorage.removeItem(SHOW_EDITOR_AFTER_RELOAD_KEY);
    dismissWelcomeScreen();
  } else {
    $('welcomeOpenProjectBtn').focus();
  }
}

function initProjectFiles() {
  $('newProjectBtn').addEventListener('click', () => createNewProject(true));
  $('openProjectBtn').addEventListener('click', openProjectFile);
  $('saveProjectBtn').addEventListener('click', () => saveProjectFile(false));
  $('saveProjectAsBtn').addEventListener('click', () => saveProjectFile(true));
  $('openProjectInput').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      installProjectData(parseProjectFile(await file.text()));
    } catch (error) {
      showToast(error.message || 'Could not open the project file.');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!$('welcomeScreen').hidden) return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const target = event.target;
    if (target && target.closest &&
        target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveProjectFile(event.shiftKey);
    } else if (event.key.toLowerCase() === 'o') {
      event.preventDefault();
      openProjectFile();
    } else if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      $('newProjectBtn').click();
    }
  });
}

function initUpdater() {
  const button = $('updateBtn');
  const desktop = window.blockCodeDesktop;
  if (!desktop || !desktop.onUpdateStatus) return;
  button.hidden = false;

  let action = 'check';
  let manualCheck = false;
  const setButton = (text, nextAction, disabled, title) => {
    button.textContent = text;
    button.disabled = disabled;
    button.title = title;
    action = nextAction;
  };

  desktop.onUpdateStatus((update) => {
    if (update.status === 'checking') {
      setButton('Checking…', 'check', true, 'Checking GitHub for updates');
    } else if (update.status === 'available') {
      setButton('Download update', 'download', false, 'Download version ' + update.version);
      showToast('BlockCode ' + update.version + ' is available.');
    } else if (update.status === 'not-available') {
      setButton('Check updates', 'check', false, 'Check GitHub for a BlockCode update');
      if (manualCheck) showToast('BlockCode is up to date.');
      manualCheck = false;
    } else if (update.status === 'downloading') {
      setButton('Downloading ' + update.percent + '%', 'download', true, 'Downloading update');
    } else if (update.status === 'downloaded') {
      setButton('Restart to update', 'install', false, 'Restart BlockCode to install version ' + update.version);
      showToast('Update downloaded. Restart BlockCode to install it.');
    } else if (update.status === 'error') {
      setButton('Check failed', 'check', false, update.message || 'Could not check for updates.');
      if (manualCheck) showToast(update.message || 'Could not check for updates.');
      manualCheck = false;
    }
  });

  button.addEventListener('click', async () => {
    try {
      if (action === 'download') {
        await desktop.downloadUpdate();
      } else if (action === 'install') {
        await desktop.installUpdate();
      } else {
        manualCheck = true;
        setButton('Checking…', 'check', true, 'Checking GitHub for updates');
        await desktop.checkForUpdates();
      }
    } catch (error) {
      setButton('Check updates', 'check', false, 'Check GitHub for a BlockCode update');
      showToast(error.message || 'Could not update BlockCode.');
      manualCheck = false;
    }
  });

  void desktop.checkForUpdates();
}

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
initProjectFiles();
initWelcomeScreen();
initUpdater();
