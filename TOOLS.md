# Tool Development Guide

This document describes the conventions, patterns, and requirements for creating new tools under `content/tools/` on this Hugo-based site.

## Quick Start

```text
content/tools/my-new-tool/
  index.html        # Required: Hugo page with front matter + inline HTML/CSS/JS
  index.js           # Optional: external JS for large tools
  css/               # Optional: copy theme CSS if the tool uses its own <html> shell
```

## Front Matter

Every tool page starts with Hugo front matter. The title **must** begin with an emoji.

```yaml
---
title: "<emoji> Tool Name"
tags: ["Tools"]
---
```

**Existing examples:**

| Tool                     | Title                           |
|--------------------------|---------------------------------|
| Hex Editor               | `"🔢 Hex Editor"`               |
| PE Editor                | `"🛠️ PE Editor"`                |
| UEFI Log Explorer        | `"🔬 UEFI Log Explorer"`        |
| Page Table Calculator    | `"📋 Page Table Calculator"`    |
| Hex to Memory Offsets    | `"🧮 Hex to Memory Offsets"`    |
| Pomodoro Timer           | `"🍅 Pomodoro Timer"`           |
| Whiteboard               | `"🎨 Whiteboard"`               |
| World Clocks             | `"🌍 World Clocks"`             |
| Diff Tool                | `"📄 Diff Tool"`                |
| Multi-Search Highlighter | `"🔍 Multi-Search Highlighter"` |

## Directory Naming

- Use **lowercase with hyphens**: `my-new-tool/` (not `My-New-Tool/` or `myNewTool/`).
- GitHub Pages runs on Linux — paths are **case-sensitive**. A directory named `Hex-Editor` will not match the URL `/tools/hex-editor/`.
- On Windows, `git mv` cannot do a case-only rename directly. Use the two-step trick:

  ```bash
  git mv Old-Name old-name-tmp && git mv old-name-tmp old-name
  ```

## Technology Stack

- **Vanilla JS only** — no frameworks (React, Vue, etc.), no build tools, no npm.
- **Vanilla CSS only** — no preprocessors (Sass, Less), no CSS-in-JS.
- **Plain HTML** — no templates or component systems beyond Hugo's own rendering.
- Third-party libraries loaded via CDN `<script src>` are acceptable when they provide significant value (e.g., Monaco Editor for the Diff Tool and Multi-Search Highlighter).

## Layout and Margins

The Hugo theme (`hugo-xmin`) provides page margins via:

```css
body { max-width: 960px; margin: auto; padding: 1em; }
```

Hugo renders `index.html` content inside `<main>{{ .Content }}</main>`, which inherits this body styling.

### Simple tools (most tools)

Just write HTML/CSS/JS directly after the front matter. The theme wraps your content in `<main>` and the 960px centered body provides consistent margins. **Do not** add a global `* { margin: 0; padding: 0; }` reset — it will wipe the theme's body margins. If you need a CSS reset, scope it:

```css
.my-tool, .my-tool * { box-sizing: border-box; }
```

### Full-page tools (Hex Editor, PE Editor)

If the tool needs the full viewport width, it can include its own `<html>` shell with `<head>` and `<body>` tags. In this case, copy the theme's CSS files into a local `css/` directory:

```html
---
title: "🔧 My Full-Page Tool"
tags: ["Tools"]
---

<!DOCTYPE html>
<html lang="en-us">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="./css/style.css" />
    <link rel="stylesheet" href="./css/fonts.css" />
    <style>
      /* Tool-specific CSS here */
    </style>
  </head>
  <body>
    <main>
      <!-- Tool HTML here -->
    </main>
    <script src="./index.js"></script>
  </body>
</html>
```

## Help Text

Every tool must include a help text section describing its features. Place it at the bottom of the page, after the main tool UI. Use this exact pattern:

```html
<div style="font-size: 13px; color: #7f8c8d; line-height: 2; margin-top: 8px;">
    <b style="color: #2c3e50;">Features</b><br>
    &bull; First feature description<br>
    &bull; Second feature — use <b>bold</b> for key terms and shortcuts<br>
    &bull; Use <code>code</code> for example inputs<br>
</div>
```

**Guidelines:**

- Start with a `<b>Features</b>` heading.
- Use `&bull;` for bullet points, `<br>` for line breaks.
- Bold key UI elements and keyboard shortcuts: `<b>Ctrl+Click</b>`.
- Use `<code>` for example values: `<code>0xFFFF_FFFF</code>`.
- If the tool has keyboard shortcuts, add a separate `<b>Keyboard Shortcuts</b>` section.
- If the tool benefits from usage examples, add a `<b>How it works</b>` section before Features.
- For full-page tools, the help text can go inside a placeholder div shown before the user loads data (see Hex Editor's `hex-placeholder`).

## CSS Conventions

- **Scope styles** with a class prefix to avoid collisions with the theme: `.ptcalc`, `.wb-`, `.pomo-`, `.hm-`.
- **Font stack**: `'Segoe UI', system-ui, sans-serif` for UI text; `Consolas, 'Courier New', monospace` for code/hex.
- **Color palette** (commonly used across tools):
  - Text: `#2c3e50` (dark), `#586069` (medium), `#7f8c8d` (muted)
  - Borders: `#d0d5dd`, `#ced4da`, `#b0c4de`
  - Backgrounds: `#f8f9fb`, `#f6f8fa`, `#e9ecef`
  - Accent: `#5a9fd4` (focus rings), `#0d6efd` (primary blue)
  - Danger: `#e74c3c`
- **Transitions**: Keep them subtle — `0.15s` to `0.2s` for hover states.
- **Border radius**: `6px` to `12px` depending on element size.

## JavaScript Conventions

- Use `var` or `const`/`let` consistently within a tool (either is fine, just be consistent).
- Wrap tool code in an IIFE to avoid polluting the global scope:

  ```js
  (function () {
      // Tool code here
  })();
  ```

- For tools with external JS files, use `<script src="./index.js"></script>` at the bottom of `<body>`.
- **No module imports** — everything is loaded as plain scripts.
- Cache DOM references at the top of your IIFE for performance.
- For virtual scrolling (large data), use `requestAnimationFrame` throttling.

## File Structure Examples

### Simple tool (single file)

```text
content/tools/my-tool/
  index.html      # Front matter + <style> + HTML + <script>
```

Example: Pomodoro Timer, Whiteboard, World Clocks, Page Table Calculator

### Medium tool (separate JS)

```text
content/tools/my-tool/
  index.html      # Front matter + <style> + HTML + <script src="./index.js">
  index.js        # All JavaScript
```

Example: Hex to Memory Offsets (inline), Hex Editor (separate JS)

### Large tool (own CSS + JS)

```text
content/tools/my-tool/
  index.html      # Full HTML shell with front matter
  index.js        # Application JavaScript
  css/            # Copied from themes/hugo-xmin/static/css/
    style.css
    fonts.css
    copy-button.css
    forms.css
```

Example: PE Editor, Hex Editor

## Deployment

- Hugo config: `hugo.yaml` with `publishDir: docs`.
- Build: `hugo.exe` (Windows) or `hugo_linux` (Linux).
- Output goes to `docs/` which is served by GitHub Pages.
- The site is at `https://vineelkovvuri.github.io/`.
- Tool URL: `https://vineelkovvuri.github.io/tools/<tool-name>/`.

## Checklist for New Tools

1. [ ] Directory name is lowercase with hyphens
2. [ ] Front matter has emoji title and `tags: ["Tools"]`
3. [ ] Uses vanilla HTML, CSS, and JS only (CDN libraries OK)
4. [ ] CSS is scoped — does not reset theme body margins
5. [ ] Help text section at the bottom with Features list
6. [ ] JavaScript wrapped in IIFE (no global leaks)
7. [ ] Works in modern browsers (Chrome, Edge, Firefox)
8. [ ] Runs `hugo.exe` without errors
