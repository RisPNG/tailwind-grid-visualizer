# Change Log

All notable changes to Tailwind Grid Visualizer are documented here.

## 0.1.0 (2026-07-22)

Initial release.

- Hover visualization for `grid-cols-[...]` and `grid-rows-[...]` classes: proportional box diagram, numbered index row, per-column bar chart, and the compiled CSS value
- Inline column count summary after grid classes (toggle with `tailwindGridVisualizer.inlineHint`)
- Support for fractional (`fr`) values, mixed units (`px`, `rem`, `em`, `%`), `minmax()`, intrinsic sizing (`auto`, `min-content`, `max-content`, `fit-content()`), and `grid-cols-N` presets
- Works in any file type — HTML, JSX, TSX, Vue, Svelte, Astro, HEEx/EEx, ERB, Blade, Twig, and more
- `tailwindGridVisualizer.barWidth` setting to control the max width of the hover visualization
