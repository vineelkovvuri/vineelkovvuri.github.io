# Project: vineelkovvuri.github.io

Personal website and blog built with Hugo, hosted on GitHub Pages.

## Stack

- **Hugo** static site generator (`hugo.yaml`, theme: `hugo-xmin`)
- **Build output**: `docs/` directory (served by GitHub Pages)
- **Site URL**: https://vineelkovvuri.github.io/

## Structure

```text
content/
  blog/          # Blog posts
  projects/      # Project pages
  tools/         # Interactive web tools (vanilla HTML/CSS/JS)
  bookmarks/     # Bookmarks page
themes/hugo-xmin/  # Hugo theme (provides body { max-width: 960px; margin: auto; })
docs/              # Hugo build output (publishDir)
```

## Building

```bash
hugo.exe        # Windows
./hugo_linux    # Linux
```

## Conventions

- **Tools**: See `TOOLS.md` for tool development conventions (layout, styling, help text, directory naming, etc.)
- **Directory names**: Use lowercase with hyphens (GitHub Pages is case-sensitive)
- **No frameworks**: Tools use vanilla JS, CSS, and HTML only (CDN libraries OK for significant value like Monaco Editor)
