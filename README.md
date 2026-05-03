# gpc-editor-shell

Cross-editor topbar, theme, and keyboard shortcuts for browser-game tooling. Drop-in, no build step.

Originally extracted from [golf-paper-craft](https://github.com/SkyWalker2506/golf-paper-craft) for reuse across browser-game projects.

## What you get

- `src/editor-shell.js` — `window.EditorShell.mount({ ... })` mounts a unified topbar into `#editor-shell-topbar`. Wires action buttons (Save / Play / Publish / Undo / Redo / Import / Export / Reset) to either explicit callbacks or legacy `#btn-*` IDs. Adds keyboard shortcuts (Ctrl+S / Ctrl+Z / Ctrl+Shift+Z, etc.) and a `?` help overlay.
- `src/editor-shell.css` — visual theme (paper-craft palette by default; override CSS vars to retheme).

## Install (as git submodule)

```bash
git submodule add https://github.com/SkyWalker2506/gpc-editor-shell.git www/lib/editor-shell
```

In each editor HTML page, before the closing `</body>`:

```html
<link rel="stylesheet" href="./lib/editor-shell/src/editor-shell.css">
<script src="./lib/editor-shell/src/editor-shell.js" defer></script>
<div id="editor-shell-topbar"></div>
```

Then in the page's init script:

```js
EditorShell.mount({
  page: 'level',                    // current tab key
  title: 'Level Editor',
  brand: 'My Game',                 // subtitle (defaults to "Golf · Paper Craft")
  logo:  '🎮',                      // single-char logo (defaults to ⛳)
  tabs: [                           // optional — overrides default 5-tab nav
    { page: 'level',  label: 'Levels', icon: '🌱', href: './editor.html' },
    { page: 'assets', label: 'Assets', icon: '📦', href: './assets.html' },
  ],
  actions: {
    onSave:    () => { /* ... */ },
    onPublish: () => { /* ... */ },
    // omit any of: onPlay, onPublish, onSave, onUndo, onRedo, onExport, onImport, onReset
    // — shell will fall back to clicking #btn-save / #btn-publish / etc. if present.
  }
});
```

## API

- `EditorShell.mount(opts)` — initial render.
- `EditorShell.markDirty()` / `EditorShell.markClean()` — toggle the "Unsaved" indicator.
- `EditorShell.setSubtitle(text)` — update the subtitle dynamically.
- `EditorShell.addShortcut({ key, ctrl?, shift?, alt?, run })` — register an extra keybinding.

## Status

Initial extract from golf-paper-craft @ 2026-05-03. Default tabs/brand still reference the golf project as fallback when no opts are passed; pass `tabs`/`brand`/`logo` to retheme.

## License

MIT (inherits from origin project).
