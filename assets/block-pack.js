/*
 * BlockCode asset pack
 * --------------------
 * Each block is a single SVG sprite in assets/blocks. This file connects
 * those sprites to the workspace: input slots, defaults, behaviour and order.
 * Refresh index.html after editing; no build step or server is needed.
 */

window.BLOCK_PACK = {
  categories: {
    event: { title: 'Events' },
    motion: { title: 'Motion' },
    looks: { title: 'Looks' },
    control: { title: 'Control' }
  },

  palette: ['event', 'motion', 'looks', 'control'],

  blocks: [
    {
      type: 'event',
      category: 'event',
      label: 'when clicked',
      sprite: 'assets/blocks/event.svg',
      width: 160,
      height: 52,
      fields: {},
      slots: [],
      action: 'event'
    },
    {
      type: 'move',
      category: 'motion',
      label: 'move steps',
      sprite: 'assets/blocks/move.svg',
      width: 190,
      height: 44,
      fields: { steps: 50 },
      slots: [
        { field: 'steps', type: 'number', x: 82, y: 8, w: 44, h: 22, min: -1000, max: 1000 }
      ],
      action: 'move'
    },
    {
      type: 'turn',
      category: 'motion',
      label: 'turn degrees',
      sprite: 'assets/blocks/turn.svg',
      width: 158,
      height: 44,
      fields: { deg: 90 },
      slots: [
        { field: 'deg', type: 'number', x: 76, y: 8, w: 44, h: 22, min: -3600, max: 3600 }
      ],
      action: 'turn'
    },
    {
      type: 'goto',
      category: 'motion',
      label: 'go to start',
      sprite: 'assets/blocks/goto.svg',
      width: 142,
      height: 44,
      fields: {},
      slots: [],
      action: 'goto'
    },
    {
      type: 'say',
      category: 'looks',
      label: 'say for seconds',
      sprite: 'assets/blocks/say.svg',
      width: 252,
      height: 44,
      fields: { text: 'Hello, NASA!', secs: 1 },
      slots: [
        { field: 'text', type: 'text', x: 70, y: 8, w: 96, h: 22 },
        { field: 'secs', type: 'number', x: 196, y: 8, w: 30, h: 22, min: 0, max: 10, step: 0.1 }
      ],
      action: 'say'
    },
    {
      type: 'wait',
      category: 'control',
      label: 'wait seconds',
      sprite: 'assets/blocks/wait.svg',
      width: 158,
      height: 44,
      fields: { secs: 1 },
      slots: [
        { field: 'secs', type: 'number', x: 76, y: 8, w: 40, h: 22, min: 0, max: 10, step: 0.1 }
      ],
      action: 'wait'
    }
  ],

  sprites: {
    active: 'rocket',
    list: [
      { id: 'rocket', name: 'Rocket', src: 'assets/sprites/rocket.svg' },
      { id: 'satellite', name: 'Satellite', src: 'assets/sprites/satellite.svg' },
      { id: 'ufo', name: 'UFO', src: 'assets/sprites/ufo.svg' }
    ]
  }
};
