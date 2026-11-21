// Application startup. All feature scripts are loaded before this file.
/* ---------- Boot ---------- */

let workspace = [];

const PROJECT_FORMAT = 'blockcode-project';
const PROJECT_VERSION = 1;
const PROJECT_SESSION_KEY = 'blockcode.project-session-started';
const PROJECT_HAS_FILE_KEY = 'blockcode.project-has-file';
const PROJECT_STORAGE_KEYS = [
  ASSETS_KEY,
  SPRITE_WORKSPACES_KEY,
  VARIABLES_KEY,
  LISTS_KEY,
  VISIBLE_VARIABLES_KEY,
  VISIBLE_LISTS_KEY
];

let projectHasFile = false;
let savedProjectSnapshot = null;

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

/**
 * The app no longer has a start page. A fresh launch begins on a blank
 * project, while reloads that happen after Open / New keep the loaded data.
 */
function beginNewProjectSession() {
  let started = false;
  try {
    started = sessionStorage.getItem(PROJECT_SESSION_KEY) === 'true';
  } catch (error) {
    /* sessionStorage may be unavailable in private modes */
  }
  if (started) return;

  const data = emptyProjectData();
  PROJECT_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.setItem(key, data[key]);
    } catch (error) {
      /* ignore storage failures during boot; the editor still loads */
    }
  });
  try {
    sessionStorage.setItem(PROJECT_SESSION_KEY, 'true');
    sessionStorage.removeItem(PROJECT_HAS_FILE_KEY);
  } catch (error) {
    /* sessionStorage may be unavailable in private modes */
  }
}

function setProjectHasFile(hasFile) {
  projectHasFile = Boolean(hasFile);
  try {
    if (projectHasFile) sessionStorage.setItem(PROJECT_HAS_FILE_KEY, 'true');
    else sessionStorage.removeItem(PROJECT_HAS_FILE_KEY);
  } catch (error) {
    /* sessionStorage may be unavailable in private modes */
  }
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
  location.reload();
}

function projectNeedsSaving() {
  return !projectHasFile || savedProjectSnapshot === null ||
    createProjectFile() !== savedProjectSnapshot;
}

function askToSaveProject(action) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'save-project-dialog';

    const form = document.createElement('form');
    form.className = 'save-project-form';

    const title = document.createElement('h2');
    title.textContent = 'Save this project?';

    const description = document.createElement('p');
    description.textContent = projectHasFile
      ? 'You have unsaved changes. Save them before ' + action + '?'
      : 'This project has not been saved to a file yet. Save it before ' + action + '?';

    const actions = document.createElement('div');
    actions.className = 'save-project-actions';

    const makeButton = (label, className, result) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', () => dialog.close(result));
      return button;
    };

    const cancelButton = makeButton('Cancel', 'btn btn-ghost', 'cancel');
    const discardButton = makeButton('Don\'t save', 'btn btn-ghost', 'discard');
    const saveButton = makeButton('Save', 'btn btn-run', 'save');
    actions.append(cancelButton, discardButton, saveButton);

    form.append(title, description, actions);
    dialog.appendChild(form);

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      dialog.close('cancel');
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close('cancel');
    });
    dialog.addEventListener('close', () => {
      const choice = dialog.returnValue || 'cancel';
      dialog.remove();
      resolve(choice);
    }, { once: true });

    document.body.appendChild(dialog);
    dialog.showModal();
    saveButton.focus();
  });
}

async function prepareToLeaveProject(action) {
  if (!projectNeedsSaving()) return true;
  const choice = await askToSaveProject(action);
  if (choice === 'cancel') return false;
  if (choice === 'discard') return true;
  return saveProjectFile(false);
}

async function openProjectFile() {
  try {
    if (!(await prepareToLeaveProject('opening another project'))) return;
    if (window.blockCodeDesktop) {
      const project = await window.blockCodeDesktop.openProject();
      if (!project) return;
      setProjectHasFile(true);
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
      if (!result) return false;
      showToast('Project saved.');
    } else {
      const blob = new Blob([contents], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Untitled.blockcode';
      link.click();
      URL.revokeObjectURL(url);
      showToast('Project downloaded.');
    }
    savedProjectSnapshot = contents;
    setProjectHasFile(true);
    return true;
  } catch (error) {
    showToast(error.message || 'Could not save the project file.');
    return false;
  }
}

async function createNewProject() {
  if (!(await prepareToLeaveProject('starting a new project'))) return;
  try {
    if (window.blockCodeDesktop) await window.blockCodeDesktop.newProject();
    stopProgram();
    setProjectHasFile(false);
    installProjectData(emptyProjectData());
  } catch (error) {
    showToast(error.message || 'Could not create a new project.');
  }
}

function initProjectState() {
  try {
    projectHasFile = sessionStorage.getItem(PROJECT_HAS_FILE_KEY) === 'true';
  } catch (error) {
    projectHasFile = false;
  }
  savedProjectSnapshot = createProjectFile();
}

function initCloseGuard() {
  const desktop = window.blockCodeDesktop;
  if (!desktop || !desktop.onCloseRequested) return;
  desktop.onCloseRequested(async () => {
    let canClose = false;
    try {
      canClose = await prepareToLeaveProject('closing BlockCode');
    } finally {
      await desktop.resolveClose(canClose);
    }
  });
}

function initProjectFiles() {
  $('newProjectBtn').addEventListener('click', createNewProject);
  $('openProjectBtn').addEventListener('click', openProjectFile);
  $('saveProjectBtn').addEventListener('click', () => saveProjectFile(false));
  $('saveProjectAsBtn').addEventListener('click', () => saveProjectFile(true));
  $('openProjectInput').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const project = parseProjectFile(await file.text());
      setProjectHasFile(true);
      installProjectData(project);
    } catch (error) {
      showToast(error.message || 'Could not open the project file.');
    }
  });
  document.addEventListener('keydown', (event) => {
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
      createNewProject();
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
      if (manualCheck) {
        const currentVersion = update.currentVersion;
        const latestVersion = update.version;
        showToast(currentVersion && latestVersion && currentVersion !== latestVersion
          ? 'Update check mismatch: running ' + currentVersion + ', release feed reports ' + latestVersion + '.'
          : 'BlockCode is up to date' + (currentVersion ? ' (' + currentVersion + ')' : '') + '.');
      }
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

beginNewProjectSession();
workspace = [];

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
initProjectState();
initCloseGuard();
initUpdater();
