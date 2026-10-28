/*
 * BlockCode asset pack
 * --------------------
 * Each block is a single SVG sprite in assets/blocks. This file connects
 * those sprites to the workspace: input slots, defaults, behaviour and order.
 * Refresh index.html after editing; no build step or server is needed.
 */

window.BLOCK_PACK = {
  categories: {
    functions: { title: 'Functions', color: '#14b8a6' },
    normal: { title: 'Normal', color: '#f97316' },
    math: { title: 'Math', color: '#22c55e' },
    visual: { title: 'Visual', color: '#ec4899' },
    audio: { title: 'Speech & audio', color: '#ef4444' }
  },

  palette: ['functions', 'normal', 'math', 'visual', 'audio'],

  blocks: [
    {
      type: 'start',
      category: 'functions',
      label: 'on start',
      sprite: 'assets/blocks/start.svg',
      width: 160,
      height: 52,
      fields: {},
      slots: [],
      action: 'start',
      hat: true
    },
    {
      type: 'define',
      category: 'functions',
      label: 'define function',
      sprite: 'assets/blocks/define.svg',
      width: 250,
      height: 52,
      fields: { name: 'my function' },
      slots: [
        { field: 'name', type: 'text', x: 98, y: 15, w: 108, h: 22 }
      ],
      action: 'define',
      hat: true
    },
    {
      type: 'call',
      category: 'functions',
      label: 'call function',
      sprite: 'assets/blocks/call.svg',
      width: 230,
      height: 44,
      fields: { name: '' },
      slots: [
        { field: 'name', type: 'function', x: 76, y: 8, w: 112, h: 22 }
      ],
      action: 'call'
    },
    {
      type: 'repeat',
      category: 'functions',
      label: 'repeat times',
      sprite: 'assets/blocks/repeat-top.svg',
      width: 200,
      height: 44,
      fields: { times: 4 },
      slots: [
        { field: 'times', type: 'value', x: 96, y: 8, w: 48, h: 22 }
      ],
      action: 'repeat',
      cblock: true
    },
    {
      type: 'forever',
      category: 'functions',
      label: 'forever',
      sprite: 'assets/blocks/forever-top.svg',
      width: 160,
      height: 44,
      fields: {},
      slots: [],
      action: 'forever',
      cblock: true
    },
    {
      type: 'wait',
      category: 'normal',
      label: 'wait seconds',
      sprite: 'assets/blocks/wait.svg',
      width: 158,
      height: 44,
      fields: { secs: 1 },
      slots: [
        { field: 'secs', type: 'value', x: 76, y: 8, w: 40, h: 22 }
      ],
      action: 'wait'
    },
    {
      type: 'goto',
      category: 'normal',
      label: 'go to start',
      sprite: 'assets/blocks/goto.svg',
      width: 142,
      height: 44,
      fields: {},
      slots: [],
      action: 'goto'
    },
    {
      type: 'stop',
      category: 'normal',
      label: 'stop',
      sprite: 'assets/blocks/stop.svg',
      width: 120,
      height: 44,
      fields: {},
      slots: [],
      action: 'stop'
    },
    {
      type: 'setvar',
      category: 'math',
      label: 'set variable',
      sprite: 'assets/blocks/setvar.svg',
      width: 300,
      height: 44,
      fields: { name: 'score', value: 0 },
      slots: [
        { field: 'name', type: 'text', x: 74, y: 8, w: 64, h: 22 },
        { field: 'value', type: 'value', x: 170, y: 8, w: 120, h: 22 }
      ],
      action: 'setvar'
    },
    {
      type: 'changevar',
      category: 'math',
      label: 'change variable',
      sprite: 'assets/blocks/changevar.svg',
      width: 310,
      height: 44,
      fields: { name: 'score', value: 1 },
      slots: [
        { field: 'name', type: 'text', x: 92, y: 8, w: 64, h: 22 },
        { field: 'value', type: 'value', x: 188, y: 8, w: 112, h: 22 }
      ],
      action: 'changevar'
    },
    {
      type: 'add',
      category: 'math',
      label: 'add',
      sprite: 'assets/blocks/add.svg',
      width: 150,
      height: 36,
      fields: { a: 1, b: 1 },
      slots: [
        { field: 'a', type: 'value', x: 30, y: 7, w: 36, h: 22 },
        { field: 'b', type: 'value', x: 94, y: 7, w: 36, h: 22 }
      ],
      action: 'add',
      reporter: true
    },
    {
      type: 'subtract',
      category: 'math',
      label: 'subtract',
      sprite: 'assets/blocks/subtract.svg',
      width: 150,
      height: 36,
      fields: { a: 1, b: 1 },
      slots: [
        { field: 'a', type: 'value', x: 30, y: 7, w: 36, h: 22 },
        { field: 'b', type: 'value', x: 94, y: 7, w: 36, h: 22 }
      ],
      action: 'subtract',
      reporter: true
    },
    {
      type: 'multiply',
      category: 'math',
      label: 'multiply',
      sprite: 'assets/blocks/multiply.svg',
      width: 150,
      height: 36,
      fields: { a: 2, b: 2 },
      slots: [
        { field: 'a', type: 'value', x: 30, y: 7, w: 36, h: 22 },
        { field: 'b', type: 'value', x: 94, y: 7, w: 36, h: 22 }
      ],
      action: 'multiply',
      reporter: true
    },
    {
      type: 'divide',
      category: 'math',
      label: 'divide',
      sprite: 'assets/blocks/divide.svg',
      width: 150,
      height: 36,
      fields: { a: 10, b: 2 },
      slots: [
        { field: 'a', type: 'value', x: 30, y: 7, w: 36, h: 22 },
        { field: 'b', type: 'value', x: 94, y: 7, w: 36, h: 22 }
      ],
      action: 'divide',
      reporter: true
    },
    {
      type: 'round',
      category: 'math',
      label: 'round',
      sprite: 'assets/blocks/round.svg',
      width: 126,
      height: 36,
      fields: { a: 0 },
      slots: [
        { field: 'a', type: 'value', x: 66, y: 7, w: 46, h: 22 }
      ],
      action: 'round',
      reporter: true
    },
    {
      type: 'random',
      category: 'math',
      label: 'random',
      sprite: 'assets/blocks/random.svg',
      width: 200,
      height: 36,
      fields: { a: 1, b: 10 },
      slots: [
        { field: 'a', type: 'value', x: 78, y: 7, w: 38, h: 22 },
        { field: 'b', type: 'value', x: 146, y: 7, w: 38, h: 22 }
      ],
      action: 'random',
      reporter: true
    },
    {
      type: 'variable',
      category: 'math',
      label: 'variable',
      sprite: 'assets/blocks/variable.svg',
      width: 170,
      height: 36,
      fields: { name: 'score' },
      slots: [
        { field: 'name', type: 'text', x: 82, y: 7, w: 74, h: 22 }
      ],
      action: 'variable',
      reporter: true
    },
    {
      type: 'move',
      category: 'visual',
      label: 'move steps',
      sprite: 'assets/blocks/move.svg',
      width: 190,
      height: 44,
      fields: { steps: 50 },
      slots: [
        { field: 'steps', type: 'value', x: 82, y: 8, w: 44, h: 22 }
      ],
      action: 'move'
    },
    {
      type: 'turn',
      category: 'visual',
      label: 'turn degrees',
      sprite: 'assets/blocks/turn.svg',
      width: 158,
      height: 44,
      fields: { deg: 90 },
      slots: [
        { field: 'deg', type: 'value', x: 76, y: 8, w: 44, h: 22 }
      ],
      action: 'turn'
    },
    {
      type: 'switchsprite',
      category: 'visual',
      label: 'switch sprite to',
      sprite: 'assets/blocks/switchsprite.svg',
      width: 290,
      height: 44,
      fields: { sprite: 'rocket' },
      slots: [
        { field: 'sprite', type: 'sprite', x: 164, y: 8, w: 112, h: 22 }
      ],
      action: 'switchsprite'
    },
    {
      type: 'switchbg',
      category: 'visual',
      label: 'switch background to',
      sprite: 'assets/blocks/switchbg.svg',
      width: 300,
      height: 44,
      fields: { background: 'mission' },
      slots: [
        { field: 'background', type: 'background', x: 184, y: 8, w: 102, h: 22 }
      ],
      action: 'switchbg'
    },
    {
      type: 'show',
      category: 'visual',
      label: 'show sprite',
      sprite: 'assets/blocks/show.svg',
      width: 150,
      height: 44,
      fields: {},
      slots: [],
      action: 'show'
    },
    {
      type: 'hide',
      category: 'visual',
      label: 'hide sprite',
      sprite: 'assets/blocks/hide.svg',
      width: 150,
      height: 44,
      fields: {},
      slots: [],
      action: 'hide'
    },
    {
      type: 'setsize',
      category: 'visual',
      label: 'set size',
      sprite: 'assets/blocks/setsize.svg',
      width: 190,
      height: 44,
      fields: { size: 100 },
      slots: [
        { field: 'size', type: 'value', x: 108, y: 8, w: 44, h: 22 }
      ],
      action: 'setsize'
    },
    {
      type: 'gotoxy',
      category: 'visual',
      label: 'go to x y',
      sprite: 'assets/blocks/gotoxy.svg',
      width: 280,
      height: 44,
      fields: { x: 0, y: 0 },
      slots: [
        { field: 'x', type: 'value', x: 98, y: 8, w: 44, h: 22 },
        { field: 'y', type: 'value', x: 186, y: 8, w: 44, h: 22 }
      ],
      action: 'gotoxy'
    },
    {
      type: 'glide',
      category: 'visual',
      label: 'glide to x y',
      sprite: 'assets/blocks/glide.svg',
      width: 340,
      height: 44,
      fields: { secs: 1, x: 0, y: 0 },
      slots: [
        { field: 'secs', type: 'value', x: 82, y: 8, w: 34, h: 22 },
        { field: 'x', type: 'value', x: 182, y: 8, w: 44, h: 22 },
        { field: 'y', type: 'value', x: 258, y: 8, w: 44, h: 22 }
      ],
      action: 'glide'
    },
    {
      type: 'changex',
      category: 'visual',
      label: 'change x by',
      sprite: 'assets/blocks/changex.svg',
      width: 230,
      height: 44,
      fields: { dx: 20 },
      slots: [
        { field: 'dx', type: 'value', x: 140, y: 8, w: 50, h: 22 }
      ],
      action: 'changex'
    },
    {
      type: 'changey',
      category: 'visual',
      label: 'change y by',
      sprite: 'assets/blocks/changey.svg',
      width: 230,
      height: 44,
      fields: { dy: 20 },
      slots: [
        { field: 'dy', type: 'value', x: 140, y: 8, w: 50, h: 22 }
      ],
      action: 'changey'
    },
    {
      type: 'point',
      category: 'visual',
      label: 'point in direction',
      sprite: 'assets/blocks/point.svg',
      width: 260,
      height: 44,
      fields: { deg: 90 },
      slots: [
        { field: 'deg', type: 'value', x: 190, y: 8, w: 48, h: 22 }
      ],
      action: 'point'
    },
    {
      type: 'say',
      category: 'audio',
      label: 'say for seconds',
      sprite: 'assets/blocks/say.svg',
      width: 252,
      height: 44,
      fields: { text: 'Hello, NASA!', secs: 1 },
      slots: [
        { field: 'text', type: 'text', x: 70, y: 8, w: 96, h: 22 },
        { field: 'secs', type: 'value', x: 196, y: 8, w: 30, h: 22 }
      ],
      action: 'say'
    },
    {
      type: 'speak',
      category: 'audio',
      label: 'speak',
      sprite: 'assets/blocks/speak.svg',
      width: 250,
      height: 44,
      fields: { text: 'Hello!' },
      slots: [
        { field: 'text', type: 'text', x: 92, y: 8, w: 146, h: 22 }
      ],
      action: 'speak'
    },
    {
      type: 'tone',
      category: 'audio',
      label: 'play tone',
      sprite: 'assets/blocks/tone.svg',
      width: 300,
      height: 44,
      fields: { hz: 440, secs: 0.5 },
      slots: [
        { field: 'hz', type: 'value', x: 108, y: 8, w: 46, h: 22 },
        { field: 'secs', type: 'value', x: 214, y: 8, w: 34, h: 22 }
      ],
      action: 'tone'
    },
    {
      type: 'stopsounds',
      category: 'audio',
      label: 'stop all sounds',
      sprite: 'assets/blocks/stopsounds.svg',
      width: 200,
      height: 44,
      fields: {},
      slots: [],
      action: 'stopsounds'
    }
  ],

  sprites: {
    active: 'rocket',
    list: [
      { id: 'rocket', name: 'Rocket', src: 'assets/sprites/rocket.svg' },
      { id: 'satellite', name: 'Satellite', src: 'assets/sprites/satellite.svg' },
      { id: 'ufo', name: 'UFO', src: 'assets/sprites/ufo.svg' }
    ]
  },

  backgrounds: {
    active: 'mission',
    list: [
      {
        id: 'mission',
        name: 'Mission Control',
        css: 'radial-gradient(600px 400px at 50% 42%, #17264f 0%, rgba(10, 17, 34, .7) 58%, #060a14 100%), linear-gradient(rgba(148, 163, 184, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, .08) 1px, transparent 1px)',
        size: 'auto, 32px 32px, 32px 32px'
      },
      {
        id: 'orbit',
        name: 'Orbit',
        css: 'radial-gradient(circle at 30% 20%, #1d4ed8, #0f172a 55%, #020617)',
        size: 'cover'
      },
      {
        id: 'nebula',
        name: 'Nebula',
        css: 'radial-gradient(circle at 70% 25%, #db2777, transparent 40%), radial-gradient(circle at 20% 70%, #7c3aed, transparent 45%), linear-gradient(160deg, #020617, #0b1120)',
        size: 'cover'
      },
      {
        id: 'lunar',
        name: 'Lunar Surface',
        css: 'radial-gradient(circle at 50% 120%, #94a3b8, #1e293b 60%, #020617)',
        size: 'cover'
      }
    ]
  }
};
