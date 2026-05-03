# Changelog

## Unreleased

### Added
- `mount({ brand: { logo, name, accent } })` — object form for `brand` opt. Sets `--es-accent` CSS var when `accent` is supplied. String form (`brand: 'My Game'`) still works.
- `examples/standalone.html` — full demo with custom tabs (no golf), accent override, dirty toggle, subtitle update.

### Notes
- `tabs`, `logo`, and string-`brand` were already supported; this release documents them properly and adds the accent hook.

## 0.1.x — 2026-05-03

- Add canonical `.empty-pane` rule for cross-editor consistency.
- Add toast API + beforeunload guard styles.
- Initial extract from golf-paper-craft.
