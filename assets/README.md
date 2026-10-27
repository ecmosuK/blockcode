# BlockCode Asset Pack

Every block on the canvas is a single SVG sprite from `assets/blocks/`.
The manifest in `block-pack.js` connects each sprite to its inputs, defaults,
behaviour and position in the palette.

```
assets/
  block-pack.js     <- manifest: block sprites, input slots, defaults, sprites
  blocks/           <- one complete block sprite per block type
  sprites/          <- stage sprites (rocket, satellite, ufo)
tools/
  make-blocks.mjs   <- optional starter-sprite generator
```

No build step or server is needed. Refresh `index.html` after editing.

## Reference block design

The six SVGs in `assets/blocks/` are the canonical reference; edit them
directly. They share this geometry:

- Regular blocks: 44px canvas, 38px body, 10px corners.
- Hat/event block: 52px canvas, 46px body, 18px top corners.
- Bottom tab: 22x10px rounded rectangle at x=22, y=34 (y=42 for the hat).
- Top socket on regular blocks: a 20x5px cutout at x=23..43. The tab from the
  block above fits inside it.
- No separate body outline path. The reference blocks deliberately have no
  inner outline; only icons and small details use strokes.
- Text: Segoe UI 14.5px at weight 600. Input pills: white at 94% opacity.
- Each category keeps its own gradient and text color.

The workspace overlaps stacked blocks by 6px, so the 6px exposed tab tucks under
the next block and the 20x5px socket reveals it. The socket is intentionally 1px
narrower and shallower than the tab to avoid hairline seams. Keep the tab inside
the SVG canvas; content below the canvas is clipped in the browser.

Opening a block in Inkscape adds editor metadata when saving. That metadata is
harmless and ignored by the browser.

## Edit a block

Open the block's SVG in `assets/blocks/`. The sprite includes the whole block:
shape, gradient, text, icon, and the white input pills. Edit it however you like
(vector editor or text editor), keeping the canvas size in the manifest in sync.

Then open `block-pack.js`:

- `width` / `height` must match the SVG canvas size.
- `slots` place the editable HTML inputs on top of the sprite. Coordinates are
  pixels from the block's top-left corner.
- `fields` supplies the default input values.
- `label` is only used as the image's alt text.
- `action` selects the behaviour.

Example slot:

```js
{ field: 'steps', type: 'number', x: 82, y: 8, w: 44, h: 22, min: -1000, max: 1000 }
```

Match the slot rectangle to the white pill drawn in the SVG. `type` can be
`number` or `text`. Optional `min`, `max` and `step` limits are supported.

## Generator

`tools/make-blocks.mjs` writes the six starter sprites and reproduces the
reference geometry, including the top socket and no separate body outline.

```sh
node tools/make-blocks.mjs                 # writes assets/blocks
node tools/make-blocks.mjs scratch-blocks  # preview without touching the pack
```

The default output is `assets/blocks`, so it overwrites the hand-edited SVGs.
Use a scratch folder to preview, or port your changes into the script before
regenerating. The generator does not add Inkscape metadata; that is fine for
the browser and for future Inkscape edits.

## Add a block

1. Copy `move.svg` or generate a starter sprite into a scratch folder, then
   place the final SVG in `assets/blocks/`.
2. Add an entry to `blocks` in `block-pack.js` with a new `type`, `sprite`,
   `width`, `height`, `fields`, `slots` and `category`.
3. Reuse an existing action (`event`, `move`, `turn`, `goto`, `say`, `wait`) or
   add a matching `case` to `execute()` in `app.js` for new behaviour.
4. Add the category to `palette` if you created a new group.

The block palette renders the same SVG as the canvas, so the asset is the
single source of truth for how a block looks.

## Add a stage sprite

1. Drop a square SVG into `sprites/`.
2. Add `{ id, name, src }` to `sprites.list` in `block-pack.js`.

It appears in the stage sprite picker automatically. Sprites point to the
right at 0 degrees. `sprites.active` sets the starting sprite.

## Actions available to blocks

`event` starts a script, `move` drives the sprite forward, `turn` rotates it,
`goto` recentres it, `say` shows a speech bubble, and `wait` pauses the script.
