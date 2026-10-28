'use strict';

/* ---------- Stage ---------- */

function stageSize() {
  const w = stageEl.clientWidth;
  const h = stageEl.clientHeight;
  if (w > 0 && h > 0) {
    stageCache = { w: w, h: h };
  }
  if (stageCache.w > 0 && stageCache.h > 0) {
    return stageCache;
  }
  return { w: 800, h: 600 };
}

function updateSprite() {
  const size = stageSize();
  spriteEl.style.left = state.x + 'px';
  spriteEl.style.top = state.y + 'px';
  spriteEl.style.display = state.visible ? '' : 'none';
  const scale = clamp(state.size, 10, 400) / 100;
  rocketEl.style.transform =
    'translate(-50%, -50%) rotate(' + state.heading + 'deg) scale(' + scale + ')';
  posEl.textContent =
    'x ' + Math.round(state.x - size.w / 2) + ' | y ' + Math.round(size.h / 2 - state.y);
}

function resetSprite(animate) {
  const size = stageSize();

  if (!animate) spriteEl.style.transition = 'none';
  state.x = size.w / 2;
  state.y = size.h / 2;
  state.heading = 0;
  state.size = 100;
  state.visible = true;
  updateSprite();
  if (!animate) {
    void spriteEl.offsetWidth;
    spriteEl.style.transition = '';
  }

  hideBubble();
  rocketEl.classList.remove('is-burning');
}

function showBubble(text) {
  bubbleEl.textContent = text;
  bubbleEl.classList.add('is-visible');
}

function hideBubble() {
  bubbleEl.classList.remove('is-visible');
}

function sleep(ms, token) {
  return new Promise((resolve) => {
    if (token !== state.token) {
      resolve();
      return;
    }

    let timer = null;
    const finish = () => {
      if (timer) clearTimeout(timer);
      sleepers.delete(finish);
      resolve();
    };

    timer = setTimeout(finish, Math.max(0, ms));
    sleepers.add(finish);
  });
}

/* ---------- Program execution ---------- */

function evalNumber(value, vars) {
  if (isExpression(value)) {
    const a = () => evalNumber(value.params.a, vars);
    const b = () => evalNumber(value.params.b, vars);
    switch (value.type) {
      case 'add': return a() + b();
      case 'subtract': return a() - b();
      case 'multiply': return a() * b();
      case 'divide': {
        const divisor = b();
        return divisor === 0 ? 0 : a() / divisor;
      }
      case 'round': return Math.round(a());
      case 'random': {
        const low = Math.min(a(), b());
        const high = Math.max(a(), b());
        return low + Math.floor(Math.random() * (high - low + 1));
      }
      case 'variable': {
        const name = String(value.params.name || '').trim();
        return Number(vars[name]) || 0;
      }
      default: return 0;
    }
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function variableName(value) {
  const name = String(value || '').trim();
  return name || 'value';
}

function getAudioContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch (error) {
      audioContext = null;
    }
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function stopAllAudio() {
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (error) { /* ignore */ }
  }
  activeOscillators.forEach((oscillator) => {
    try { oscillator.stop(); } catch (error) { /* ignore */ }
  });
  activeOscillators.clear();
}

async function playTone(hz, secs, token) {
  const frequency = clamp(hz, 20, 12000);
  const duration = clamp(secs, 0, 10);
  const ctx = getAudioContext();

  if (!ctx || duration <= 0) {
    await sleep(duration * 1000, token);
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  activeOscillators.add(oscillator);

  await sleep(duration * 1000, token);

  try { oscillator.stop(); } catch (error) { /* ignore */ }
  activeOscillators.delete(oscillator);
}

function speakText(text, token) {
  const message = String(text || '').slice(0, 200);
  if (!message) return Promise.resolve();

  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
    showBubble(message);
    return sleep(900, token).then(() => {
      if (token === state.token) hideBubble();
    });
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, Math.min(8000, 900 + message.length * 70));
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = finish;
    utterance.onerror = finish;
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      finish();
    }
  });
}

function stagePointToPixels(x, y) {
  const size = stageSize();
  return {
    x: clamp(size.w / 2 + x, PAD, size.w - PAD),
    y: clamp(size.h / 2 - y, PAD, size.h - PAD)
  };
}

async function executeStack(blocks, token, ctx) {
  for (const block of blocks || []) {
    if (token !== state.token) return false;

    const el = scriptsEl.querySelector('.block[data-id="' + block.id + '"]');
    if (el) el.classList.add('is-active');

    await executeBlock(block, token, ctx);

    if (el) el.classList.remove('is-active');
    if (token !== state.token) return false;
  }
  return true;
}

async function executeBlock(block, token, ctx) {
  const def = DEFS[block.type] || {};
  const action = def.action || block.type;
  const size = stageSize();
  const vars = ctx.vars;

  switch (action) {
    case 'event':
    case 'start':
      await sleep(140, token);
      break;

    case 'define':
      break;

    case 'repeat': {
      const times = clamp(Math.floor(evalNumber(block.params.times, vars)), 0, 10000);
      for (let i = 0; i < times; i++) {
        if (token !== state.token) return;
        if (!await executeStack(block.children, token, ctx)) return;
      }
      break;
    }

    case 'forever': {
      while (token === state.token) {
        if (!await executeStack(block.children, token, ctx)) return;
        if (!block.children || !block.children.length) await sleep(16, token);
        await sleep(0, token);
      }
      break;
    }

    case 'call': {
      const name = String(block.params.name || '').trim();
      const script = findFunctionScript(name);
      if (!script) {
        showToast('No function named "' + (name || 'unnamed') + '".');
        await sleep(300, token);
        break;
      }
      if (ctx.depth >= MAX_CALL_DEPTH) {
        showToast('Too many nested function calls.');
        await sleep(300, token);
        break;
      }
      const nextCtx = { vars: vars, depth: ctx.depth + 1 };
      await executeStack(script.slice(1), token, nextCtx);
      break;
    }

    case 'move': {
      const steps = evalNumber(block.params.steps, vars);
      const radians = (state.heading * Math.PI) / 180;
      state.x = clamp(state.x + Math.cos(radians) * steps * 1.6, PAD, size.w - PAD);
      state.y = clamp(state.y + Math.sin(radians) * steps * 1.6, PAD, size.h - PAD);
      rocketEl.classList.add('is-burning');
      updateSprite();
      await sleep(380, token);
      rocketEl.classList.remove('is-burning');
      break;
    }

    case 'turn': {
      const degrees = evalNumber(block.params.deg, vars);
      state.heading += degrees;
      updateSprite();
      await sleep(330, token);
      break;
    }

    case 'goto': {
      state.x = size.w / 2;
      state.y = size.h / 2;
      state.heading = 0;
      state.size = 100;
      state.visible = true;
      updateSprite();
      await sleep(360, token);
      break;
    }

    case 'stop':
      stopProgram();
      break;

    case 'setvar':
    case 'changevar': {
      const name = variableName(block.params.name);
      const value = evalNumber(block.params.value, vars);
      if (action === 'setvar') vars[name] = value;
      else vars[name] = (Number(vars[name]) || 0) + value;
      await sleep(80, token);
      break;
    }

    case 'switchsprite': {
      applySpriteById(String(block.params.sprite || ''), false);
      await sleep(220, token);
      break;
    }

    case 'switchbg': {
      applyBackgroundById(String(block.params.background || ''), false);
      await sleep(220, token);
      break;
    }

    case 'show':
      state.visible = true;
      updateSprite();
      await sleep(160, token);
      break;

    case 'hide':
      state.visible = false;
      updateSprite();
      await sleep(160, token);
      break;

    case 'setsize':
      state.size = clamp(evalNumber(block.params.size, vars), 10, 400);
      updateSprite();
      await sleep(160, token);
      break;

    case 'gotoxy': {
      const point = stagePointToPixels(
        evalNumber(block.params.x, vars),
        evalNumber(block.params.y, vars)
      );
      state.x = point.x;
      state.y = point.y;
      updateSprite();
      await sleep(320, token);
      break;
    }

    case 'glide': {
      const secs = clamp(evalNumber(block.params.secs, vars), 0, 10);
      const point = stagePointToPixels(
        evalNumber(block.params.x, vars),
        evalNumber(block.params.y, vars)
      );
      const startX = state.x;
      const startY = state.y;
      const steps = Math.max(1, Math.round(secs * 30));
      if (secs <= 0) {
        state.x = point.x;
        state.y = point.y;
        updateSprite();
        break;
      }
      for (let i = 1; i <= steps; i++) {
        if (token !== state.token) return;
        const t = i / steps;
        state.x = startX + (point.x - startX) * t;
        state.y = startY + (point.y - startY) * t;
        updateSprite();
        await sleep((secs * 1000) / steps, token);
      }
      break;
    }

    case 'changex': {
      const dx = evalNumber(block.params.dx, vars);
      state.x = clamp(state.x + dx, PAD, size.w - PAD);
      updateSprite();
      await sleep(220, token);
      break;
    }

    case 'changey': {
      const dy = evalNumber(block.params.dy, vars);
      state.y = clamp(state.y - dy, PAD, size.h - PAD);
      updateSprite();
      await sleep(220, token);
      break;
    }

    case 'point': {
      state.heading = evalNumber(block.params.deg, vars);
      updateSprite();
      await sleep(220, token);
      break;
    }

    case 'say': {
      const text = String(block.params.text == null ? '' : block.params.text).slice(0, 80) || 'Hello from BlockCode';
      const secs = clamp(evalNumber(block.params.secs, vars), 0, 10);
      showBubble(text);
      await sleep(secs * 1000, token);
      if (token === state.token) hideBubble();
      break;
    }

    case 'speak': {
      const text = String(block.params.text == null ? '' : block.params.text).slice(0, 200);
      await speakText(text, token);
      break;
    }

    case 'tone': {
      await playTone(
        evalNumber(block.params.hz, vars),
        evalNumber(block.params.secs, vars),
        token
      );
      break;
    }

    case 'stopsounds':
      stopAllAudio();
      await sleep(120, token);
      break;

    case 'wait': {
      const secs = clamp(evalNumber(block.params.secs, vars), 0, 10);
      await sleep(secs * 1000, token);
      break;
    }

    default:
      showToast('No action is registered for "' + action + '".');
      await sleep(300, token);
  }
}
