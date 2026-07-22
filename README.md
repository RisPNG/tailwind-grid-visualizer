# Tailwind Grid Visualizer

Visualize Tailwind CSS `grid-cols-[...]` and `grid-rows-[...]` definitions with proportional column diagrams — right in your editor.

## Features

### Hover Visualization

Hover over any `grid-cols-[...]` or `grid-rows-[...]` class to see a proportional box diagram, a numbered index row, a per-column bar chart, and the compiled CSS value.

```
Grid Columns — 14 columns • 14.3 total fr

┌──┬──────┬────────┬────┬────┬────────┬───┬───┬───┬───┬────┬────┬────┬──┐
│0.│1.5fr │  2fr   │1fr │1fr │  2fr   │0.7│0.7│0.7│0.7│1fr │1fr │1fr │0.│
└──┴──────┴────────┴────┴────┴────────┴───┴───┴───┴───┴────┴────┴────┴──┘
 1    2       3      4    5      6      7   8   9  10   11   12   13  14

   1 │ ██       │ 0.5fr
   2 │ ██████   │ 1.5fr
   3 │ ████████ │ 2fr
   ...
```

### Inline Summary

A quiet column count is appended after each grid class so you can see the count at a glance without hovering:

```html
<div class="grid grid-cols-[1fr_2fr_1fr]">  (3 cols █▎██▎█)
```

Toggle it off with `tailwindGridVisualizer.inlineHint` if you prefer hover-only.

### Supported Patterns

| Pattern | Example |
|---------|---------|
| Fractional values | `grid-cols-[1fr_2fr_1.5fr]` |
| Mixed units | `grid-cols-[200px_1fr_auto]` (px, rem, em, %) |
| minmax expressions | `grid-cols-[minmax(200px,1fr)_2fr]` |
| Intrinsic sizing | `auto`, `min-content`, `max-content`, `fit-content()` |
| Presets | `grid-cols-3` |
| Rows | `grid-rows-[...]` works identically |

Works in any file type — HTML, JSX, TSX, Vue, Svelte, Astro, HEEx/EEx, ERB, Blade, Twig, and more.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `tailwindGridVisualizer.barWidth` | `40` | Max character width of the hover visualization bars |
| `tailwindGridVisualizer.inlineHint` | `true` | Show the inline column count summary after grid classes |

## Development

```bash
npm install
npm run compile      # one-off build
npm run watch        # rebuild on save
npm run package      # produces a .vsix
```

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded.

To install the built `.vsix`: Extensions panel → `···` menu → **Install from VSIX…**

## Project Structure

```
tailwind-grid-visualizer/
├── package.json          # manifest: activation, settings, scripts
├── tsconfig.json         # TypeScript config
├── .vscodeignore         # files excluded from the .vsix
├── .vscode/launch.json   # F5 debug config (Extension Development Host)
├── README.md
├── CHANGELOG.md
├── LICENSE
├── images/
│   └── icon.png          # marketplace icon
└── src/
    └── extension.ts      # all extension logic
```

### How `extension.ts` is organized

| Section | Purpose |
|---------|---------|
| **Parsing** | `parseValue` classifies a single token (fr / fixed / auto); `tokenizeGridValue` splits on `_` while respecting parens so `minmax(200px,1fr)` stays intact; `findGridMatches` scans the document for grid classes |
| **Hover Visualization** | `buildHoverVisualization` builds the box diagram, index row, and bar chart as a `MarkdownString` |
| **Inline Summary** | `createDecorationType` / `buildInlineHint` / `updateDecorations` render the trailing `(N cols)` text |
| **Activation** | `activate` registers the hover provider and wires decoration refresh to editor, document, and config change events |

## License

[The Unlicense](https://unlicense.org) — public domain, no conditions.
