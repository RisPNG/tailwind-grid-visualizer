import * as vscode from 'vscode';

// ─── Types ──────────────────────────────────────────────────────────

interface GridColumn {
  raw: string;
  value: number;
  unit: string;
  isFr: boolean;
  isFixed: boolean;
  isAuto: boolean;
}

interface GridMatch {
  fullMatch: string;
  columns: GridColumn[];
  range: vscode.Range;
  type: 'cols' | 'rows';
}

// ─── Parsing ────────────────────────────────────────────────────────

const GRID_PATTERN = /grid-(cols|rows)-\[([^\]]+)\]/g;
const GRID_PRESET_PATTERN = /grid-(cols|rows)-(\d+)/g;

function parseValue(token: string): GridColumn {
  const trimmed = token.trim();

  if (['auto', 'min-content', 'max-content'].includes(trimmed)) {
    return { raw: trimmed, value: 1, unit: trimmed, isFr: false, isFixed: false, isAuto: true };
  }
  if (trimmed.startsWith('fit-content')) {
    return { raw: trimmed, value: 1, unit: 'fit-content', isFr: false, isFixed: false, isAuto: true };
  }
  if (trimmed.startsWith('minmax(')) {
    const inner = trimmed.slice(7, -1);
    const parts = inner.split(',').map(s => s.trim());
    const parsed = parseValue(parts[parts.length - 1]);
    return { ...parsed, raw: trimmed };
  }

  const frMatch = trimmed.match(/^([\d.]+)fr$/);
  if (frMatch) { return { raw: trimmed, value: parseFloat(frMatch[1]), unit: 'fr', isFr: true, isFixed: false, isAuto: false }; }

  const pxMatch = trimmed.match(/^([\d.]+)px$/);
  if (pxMatch) { return { raw: trimmed, value: parseFloat(pxMatch[1]), unit: 'px', isFr: false, isFixed: true, isAuto: false }; }

  const remMatch = trimmed.match(/^([\d.]+)rem$/);
  if (remMatch) { return { raw: trimmed, value: parseFloat(remMatch[1]), unit: 'rem', isFr: false, isFixed: true, isAuto: false }; }

  const emMatch = trimmed.match(/^([\d.]+)em$/);
  if (emMatch) { return { raw: trimmed, value: parseFloat(emMatch[1]), unit: 'em', isFr: false, isFixed: true, isAuto: false }; }

  const pctMatch = trimmed.match(/^([\d.]+)%$/);
  if (pctMatch) { return { raw: trimmed, value: parseFloat(pctMatch[1]), unit: '%', isFr: false, isFixed: true, isAuto: false }; }

  const numMatch = trimmed.match(/^([\d.]+)$/);
  if (numMatch) { return { raw: trimmed, value: parseFloat(numMatch[1]), unit: 'px', isFr: false, isFixed: true, isAuto: false }; }

  return { raw: trimmed, value: 1, unit: '?', isFr: false, isFixed: false, isAuto: true };
}

function tokenizeGridValue(value: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of value) {
    if (ch === '(') { depth++; current += ch; }
    else if (ch === ')') { depth--; current += ch; }
    else if (ch === '_' && depth === 0) {
      if (current.trim()) { tokens.push(current.trim()); }
      current = '';
    } else { current += ch; }
  }
  if (current.trim()) { tokens.push(current.trim()); }
  return tokens;
}

function findGridMatches(document: vscode.TextDocument): GridMatch[] {
  const text = document.getText();
  const matches: GridMatch[] = [];

  let m: RegExpExecArray | null;
  const arbitraryPattern = new RegExp(GRID_PATTERN.source, 'g');
  while ((m = arbitraryPattern.exec(text)) !== null) {
    matches.push({
      fullMatch: m[0],
      columns: tokenizeGridValue(m[2]).map(parseValue),
      range: new vscode.Range(document.positionAt(m.index), document.positionAt(m.index + m[0].length)),
      type: m[1] as 'cols' | 'rows',
    });
  }

  const presetPattern = new RegExp(GRID_PRESET_PATTERN.source, 'g');
  while ((m = presetPattern.exec(text)) !== null) {
    const pos = document.positionAt(m.index);
    if (matches.some(e => e.range.contains(pos))) { continue; }
    const count = parseInt(m[2], 10);
    matches.push({
      fullMatch: m[0],
      columns: Array.from({ length: count }, () => ({
        raw: '1fr', value: 1, unit: 'fr', isFr: true, isFixed: false, isAuto: false,
      })),
      range: new vscode.Range(document.positionAt(m.index), document.positionAt(m.index + m[0].length)),
      type: m[1] as 'cols' | 'rows',
    });
  }

  return matches;
}

// ─── Hover Visualization ────────────────────────────────────────────

function buildHoverVisualization(match: GridMatch, maxBarWidth: number): vscode.MarkdownString {
  const cols = match.columns;
  const label = match.type === 'cols' ? 'Columns' : 'Rows';
  const totalCols = cols.length;

  const frCols = cols.filter(c => c.isFr);
  const totalFr = frCols.reduce((sum, c) => sum + c.value, 0);

  const FIXED_BAR_SIZE = 3;
  const AUTO_BAR_SIZE = 4;
  const fixedCount = cols.filter(c => c.isFixed).length;
  const autoCount = cols.filter(c => c.isAuto).length;
  const reservedChars = (fixedCount * FIXED_BAR_SIZE) + (autoCount * AUTO_BAR_SIZE);
  const frBarBudget = Math.max(maxBarWidth - reservedChars, frCols.length * 2);

  function getBarWidth(col: GridColumn): number {
    if (col.isFr && totalFr > 0) {
      return Math.max(1, Math.round((col.value / totalFr) * frBarBudget));
    }
    if (col.isFixed) { return FIXED_BAR_SIZE; }
    return AUTO_BAR_SIZE;
  }

  const indexWidth = String(totalCols).length;
  const barWidths = cols.map(getBarWidth);

  // ── Proportional box diagram ──
  let topBorder = '┌';
  let midContent = '│';
  let botBorder = '└';

  for (let i = 0; i < cols.length; i++) {
    const w = barWidths[i];
    topBorder += '─'.repeat(w);
    botBorder += '─'.repeat(w);

    const colLabel = cols[i].raw;
    const padded = colLabel.length <= w
      ? colLabel.padStart(Math.floor((w + colLabel.length) / 2)).padEnd(w)
      : colLabel.slice(0, w);
    midContent += padded;

    if (i < cols.length - 1) {
      topBorder += '┬';
      midContent += '│';
      botBorder += '┴';
    }
  }
  topBorder += '┐';
  midContent += '│';
  botBorder += '┘';

  // ── Numbered index row under the box ──
  let indexRow = ' ';
  for (let i = 0; i < cols.length; i++) {
    const w = barWidths[i];
    const num = String(i + 1);
    const padded = num.padStart(Math.floor((w + num.length) / 2)).padEnd(w);
    indexRow += padded;
    if (i < cols.length - 1) { indexRow += ' '; }
  }

  // ── Per-column detail lines ──
  const detailLines: string[] = [];
  const maxBar = Math.max(...barWidths);
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const idx = String(i + 1).padStart(indexWidth);
    const bar = '█'.repeat(barWidths[i]).padEnd(maxBar);
    const tag = col.isFr ? '' : col.isFixed ? ' (fixed)' : ' (auto)';
    detailLines.push(`  ${idx} │ ${bar} │ ${col.raw}${tag}`);
  }

  // ── Compose markdown ──
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = true;

  const frSummary = totalFr > 0 ? ` • ${totalFr} total fr` : '';
  const fixedSummary = fixedCount > 0 ? ` • ${fixedCount} fixed` : '';

  md.appendMarkdown(`**Grid ${label}** — ${totalCols} ${label.toLowerCase()}${frSummary}${fixedSummary}\n\n`);
  md.appendCodeblock(
    [topBorder, midContent, botBorder, indexRow, '', ...detailLines].join('\n'),
    'text'
  );

  const cssValue = cols.map(c => c.raw).join(' ');
  md.appendMarkdown(`\n\n**CSS:** \`grid-template-${match.type === 'cols' ? 'columns' : 'rows'}: ${cssValue}\``);

  return md;
}

// ─── Inline Summary Decoration ──────────────────────────────────────

let decorationType: vscode.TextEditorDecorationType;

function createDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    after: {
      margin: '0 0 0 6px',
      color: new vscode.ThemeColor('editorCodeLens.foreground'),
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
}

function buildInlineHint(match: GridMatch): string {
  const cols = match.columns;
  const label = match.type === 'cols' ? 'cols' : 'rows';

  const frCols = cols.filter(c => c.isFr);
  const totalFr = frCols.reduce((sum, c) => sum + c.value, 0);
  const MINI_WIDTH = 16;

  let miniBar = '';
  const thinBlock = '▎';

  if (totalFr > 0 && cols.every(c => c.isFr)) {
    for (let i = 0; i < cols.length; i++) {
      const w = Math.max(1, Math.round((cols[i].value / totalFr) * MINI_WIDTH));
      miniBar += '█'.repeat(w);
      if (i < cols.length - 1) { miniBar += thinBlock; }
    }
  }

  const suffix = miniBar ? ` ${miniBar}` : '';
  return `(${cols.length} ${label}${suffix})`;
}

function updateDecorations(editor: vscode.TextEditor) {
  const config = vscode.workspace.getConfiguration('tailwindGridVisualizer');
  if (!config.get<boolean>('inlineHint', true)) {
    editor.setDecorations(decorationType, []);
    return;
  }

  const matches = findGridMatches(editor.document);
  const decorations: vscode.DecorationOptions[] = matches.map(match => ({
    range: match.range,
    renderOptions: {
      after: {
        contentText: buildInlineHint(match),
        fontStyle: 'normal',
      },
    },
  }));

  editor.setDecorations(decorationType, decorations);
}

// ─── Activation ─────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  // Wildcard selector — Tailwind classes can appear in any template language
  // (heex, eex, erb, blade, twig, astro, svelte, vue, jsx, tsx, etc.)
  const allFiles: vscode.DocumentSelector = [
    { scheme: 'file' },
    { scheme: 'untitled' },
  ];

  const hoverProvider = vscode.languages.registerHoverProvider(allFiles, {
    provideHover(document, position) {
      const matches = findGridMatches(document);
      const config = vscode.workspace.getConfiguration('tailwindGridVisualizer');
      const barWidth = config.get<number>('barWidth', 40);

      for (const match of matches) {
        if (match.range.contains(position)) {
          return new vscode.Hover(buildHoverVisualization(match, barWidth), match.range);
        }
      }
      return null;
    },
  });

  decorationType = createDecorationType();

  if (vscode.window.activeTextEditor) {
    updateDecorations(vscode.window.activeTextEditor);
  }

  const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) { updateDecorations(editor); }
  });

  const docChangeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.activeTextEditor;
    if (editor && event.document === editor.document) {
      updateDecorations(editor);
    }
  });

  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('tailwindGridVisualizer')) {
      const editor = vscode.window.activeTextEditor;
      if (editor) { updateDecorations(editor); }
    }
  });

  context.subscriptions.push(
    hoverProvider,
    decorationType,
    editorChangeDisposable,
    docChangeDisposable,
    configChangeDisposable,
  );
}

export function deactivate() {}
