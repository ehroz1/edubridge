# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A browser-only constructor for edubridge social media materials (Instagram
posts and carousels, Stories, Reels covers, highlight covers, Telegram
covers, YouTube thumbnails and a speaker lower third), built strictly to the
edubridge brandbook (`brandbook/Edubridge Brandbook.dc.html`). It is a sibling
of `ehroz1/card-maker-wemedia` and reuses its single-file architecture, video
pipeline, ZIP writer and PWA setup, but the editing model is different: every
slide has a typed form (no text markup), and there is a template picker screen
with live previews.

UI text, code comments and user-facing docs (README.md) are in Russian —
keep it that way. This file is in English.

## Commands

```bash
pip3 install fonttools brotli   # optional: subsets fonts (Latin + Cyrillic incl. Kazakh) to woff2
python3 build.py                # writes index.html, manifest.webmanifest, service-worker.js
python3 -m http.server 8000     # clipboard/service worker need http(s), not file://
```

There is no test suite, linter or package.json. Verify changes by building
and loading the page in Chromium (Playwright is available in the dev sandbox:
`/opt/node22/lib/node_modules/playwright`). A cheap regression check is to
render every template's sample slides via `TEMPLATES`/`previewSlides()` and
`renderSlide()` and look for non-empty `warnings` — the shipped samples are
chosen so that none of them produce warnings.

**Always edit `src/`, `brand/` or `build.py`, never the generated
`index.html`.**

## Architecture

`build.py` is plain string templating: `src/index.template.html` gets
`__FONT_FACES__`, `__CSS__`, `__ASSETS_JS__`, `__RENDER_JS__`,
`__TEMPLATES_JS__`, `__APP_JS__`, `__FAVICON__`, `__APPLE_TOUCH_ICON__`
replaced, and the build fails if a token is missing from the template.
`__ASSETS_JS__` defines five globals:

- `BRAND_PATHS` — the logo wordmark/arc and the standalone arc as SVG path
  data plus viewBox, extracted from `brand/logo/*.svg`. They are drawn with
  `Path2D` in any brand color, so there are no per-color logo files at runtime.
- `GLYPHS` — Phosphor Fill icons (`brand/glyphs/`) as path data for the canvas.
- `ICONS` — Phosphor Bold icons (`brand/ui/`) as inline SVG markup for the UI
  (`fill="currentColor"`, so they follow the theme).
- `FLAGS` — Circle Flags (`brand/flags/`) as data URIs, decoded once by
  `loadFlags()` because canvas drawing must be synchronous.
- `PARTNER_LOGOS` — the WE media group co-branding library
  (`brand/partners/*.svg`, black artwork, display names in `names.json`) as
  `[{ id: 'lib:<stem>', name, url }]`. Sorted by file name, so files carry a
  numeric prefix. They were copied from `ehroz1/wemedia-group-branding`
  (`assets/logos/*/…_black.svg`); the site itself is not reachable from the
  sandbox.

Fonts are embedded as `@font-face` families `EBOnest` (400–800) and
`EBUnbounded` (500–700) — unique names so a locally installed Onest can't
shadow them. Unbounded has no Kazakh-specific letters; `fontString()` always
lists Onest after Unbounded so the browser falls back per glyph.

Runtime is three classic scripts sharing globals (no modules):

- **`src/render.js`** — canvas primitives only: palette `C`, text styles and
  `layoutText()` (word wrap with glue words, numbers glued to the next word,
  dashes glued to the previous one, CSS-like line boxes using the fonts' hhea
  metrics in `METRICS`), pills/rubric plates (`RUBRICS`,
  `rubricPillStyle()` — rubric colors per surface; a pill can carry up to 3
  overlapping flags), `drawLogo()`, `drawArc()`, `drawGlyph()`, `drawFlag()`
  / `drawFlagsRow()`, `drawMedia()` (cover/contain crop with zoom and pan,
  hatch placeholder when empty), progress bars, and the co-branding lockup
  (`lockupLayout()` / `drawLockup()`: edubridge | divider | partner logos,
  partner logos tinted to Ink/white through a cached offscreen canvas in
  `tintedLogo()`). It knows nothing about templates or the DOM beyond
  `Image`/`HTMLVideoElement`.
- **`src/templates.js`** — the single source of truth for layouts.
  `KINDS` maps a slide type to `{ name, format, fields, tune, draw }`.
  `fields` drives the form (types: `text`, `textarea`, `select`, `toggle`,
  `flag`, `flags`, `icon`, `media`, `list`) and each field's `sample` is the
  brandbook example text. A field may have `showIf(data)` (hidden when false,
  e.g. speakers 2–3 of the webinar) and a select may have `rebuild: true`
  (re-renders the form on change). `list` items may contain a `media`
  subfield; its media key is `<listKey>.<index>.<subKey>` and is remapped
  when items move or are deleted (`remapListMedia()`). Every kind gets
  `FLAGS_FIELD` ("Флаги — по желанию", up to 3) appended automatically unless
  it sets `noFlags: true`. Optional photos use the shared `optPhoto()` field
  and are drawn with `env.band()` / `env.bgPhoto()` so an empty slot keeps
  the exact brandbook layout. `draw(ctx, data, env)` lays the slide out in export pixels
  (1080×1350, 1080×1920, 1280×720, 1920×1080) with numbers taken from the
  brandbook mockups — don't duplicate them elsewhere. `TEMPLATES` lists what
  the picker shows: group, rubric, description, Tone-of-Voice rule/
  structure/volume, starting `slides` (kind + optional sample overrides),
  `allowed` kinds for "+ Слайд" and `max` slide count. `sampleData()` /
  `emptyData()` build slide data for "Начать с примером" / "Пустой шаблон".
  A template may define `importer(text) → [{ kind, data }]` plus
  `importHint`; then the picker shows "Из текста поста" and the editor shows
  "Вставить текст" (the resources template uses `parseResourcePost()`:
  first line = title with a leading number, `Name — description` lines are
  items, other lines are categories with an icon guessed by
  `CATEGORY_ICONS`).
- **`src/app.js`** — UI and state. `renderSlide()` builds the `env` passed to
  `draw`: size, `index`/`total`/`ordinal` (automatic counters, progress bars,
  guide step numbers), `rubric` of the template, `media(key)`,
  `photo(key, …)` (draws and registers a hit-test slot), `t(role, style)`
  (applies the per-slide "Подстройка" size/line-height percentages),
  `band(key, …)` / `bgPhoto(key, color, alpha)` (optional photos, drawn only
  when loaded), `flags` + `drawFlags()`, `pill()` / `pillSize()` (rubric
  plate with the slide's flags unless `noFlags`), `logo(x, y, h, variant,
  align, maxW)` (edubridge or the co-branding lockup; scales down to `maxW`,
  not below 0.5×), `collab(…)` (same, but draws nothing without partners —
  for slides that have no logo in the brandbook), `hasCollab`, and warning
  helpers (`lines`, `minSpace`, `fits`, `warn`) that feed the warnings bar,
  the red dots on thumbnails and the "Уместить" auto-fit. Always pass a
  `maxW` to `logo`/`collab` where the lockup shares a row with something:
  three partner logos are wide.

State: `state.draft` is `{ id, templateId, name, mode, collab: { ids, mono },
slides: [{ id, kind, data, tune }] }` and is autosaved to `localStorage`
(`edubridge.drafts.v1`, max 40 drafts). `collab.ids` (max 3) point to
`lib:*` library logos or `up:*` user uploads, which live in
`edubridge.logos.v1` as data URLs (rasters are downscaled on upload). With
`mono` (the brandbook default) both logos are monochrome: our logo `main` →
`monoInk`, `onDark` → `monoWhite`, partners tinted; library logos are always
tinted because their artwork is black. Template previews pass
`collab: null`, so the picker never shows a draft's partners. Media is **not** persisted: `state.media[slideId][fieldKey]`
holds `{ el, zoom, panX, panY, name, isVideo }` keyed by the slide's stable id
(never by position), so reordering/duplicating/deleting slides keeps photos
attached to the right slide. Undo/redo snapshots `slides` (deep), `collab` and `media`
(shallow per entry — media objects are copied, elements shared); a `tag`
coalesces bursts of typing or slider drags into one step. When adding a data
field, keep saved drafts compatible: `normalizeDraft()` merges old data over
`emptyData(kind)`, so new fields just get defaults; bump the storage key only
for incompatible shape changes.

Stage interaction: `state.stage.slots` (from `env.photo`/`env.slot`) is used
for hit testing — click an empty slot to pick a file, drag to pan, wheel or
pinch to zoom, drop a file on a slot. The smallest slot under the pointer wins
(an avatar over a full-bleed background). Guides (grid, 3:4 profile crop,
Stories UI zones, Reels cover zone) are drawn by `drawGuides()` on the preview
canvas only, never in exports.

Video (ported from card-maker, see its CLAUDE.md for the Safari audio
reasoning): `fileToVideo()` uses an object URL and stores the trim window on
the element (`trimStart`/`trimEnd`); `askVideoTrim()` edits it live;
`exportVideoSlide()` re-renders the slide every animation frame while the clip
plays and records `canvas.captureStream()` (+ the source's audio tracks,
grabbed before muting) with `MediaRecorder`, preferring MP4 and falling back
to WebM. The first frame is drawn before recording starts and playback begins
only after `recorder.onstart`, otherwise encoders drop the head of the clip.
Duplicated slides get their own `<video>` element (`cloneVideo`) because a
video has a single `currentTime`.

Kinds with `transparentWhenEmpty` (Reels captions, YouTube lower third) show a
checkerboard in the preview and export a transparent PNG when their media slot
is empty (`env.exporting` tells `draw` it is an export).

Dark theme covers only the app chrome; exported slides always use brand
colors. Theme variables live in two blocks in `styles.css` that must stay in
sync (`prefers-color-scheme` and `[data-theme="dark"]`); a tiny inline script
in `index.template.html` applies the saved choice before first paint.

Mobile: under 900px the workspace stacks (stage, horizontal slide strip,
form); the stage has an explicit height there because `flex: 1` in an
auto-height column collapses. Modals use `grid-template-columns:
minmax(0, 1fr)` so the card can't size the column wider than the viewport
(same trap as in card-maker). Anything with `white-space: nowrap` inside the
picker grid will widen the mobile layout viewport — let it wrap.
