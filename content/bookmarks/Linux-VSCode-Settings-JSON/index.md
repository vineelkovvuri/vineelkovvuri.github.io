---
title: "Windows VSCode Setting JSON"
tags: ['VSCode', 'WindowsSetup']
---

```json
{
    // "editor.fontFamily": "FiraMono Nerd Font Mono",
    "editor.fontSize": 14,
    "editor.minimap.enabled": false,
    "breadcrumbs.enabled": true,
    "explorer.confirmDragAndDrop": false,
    "editor.rulers": [
        80,
        100
    ],
    "editor.smoothScrolling": false,
    "workbench.editor.enablePreview": false,
    "remove-empty-lines.allowedNumberOfEmptyLines": 0,
    "explorer.confirmDelete": false,
    "editor.renderWhitespace": "all",
    "workbench.startupEditor": "none",
    "editor.codeLens": false,
    "editor.mouseWheelZoom": true,
    "files.associations": {
        "*.w": "cpp"
    },
    "C_Cpp.configurationWarnings": "Disabled",
    "C_Cpp.default.enableConfigurationSquiggles": false,
    "timeline.excludeSources": [
        "git-history"
    ],
    "[c]": {
        "editor.defaultFormatter": "xaver.clang-format"
    },
    "[cpp]": {
        "editor.defaultFormatter": "xaver.clang-format"
    },
    "git.enabled": false,
    "git.autofetch": false,
    "devCanvas.alwaysInstallNewVersions": true,
    "[markdown]": {
        "editor.defaultFormatter": "josa.markdown-table-formatter"
    },
    "extensions.ignoreRecommendations": true,
    "formatFiles.extensionsToInclude": "c,h,cpp",
    "cmake.configureOnOpen": false,
    "insertDateString.formatDate": "DD-MMM-YYYY",
    "security.workspace.trust.untrustedFiles": "open",
    "editor.bracketPairColorization.enabled": true,
    "editor.suggest.preview": true,
    "security.workspace.trust.banner": "never",
    "security.workspace.trust.startupPrompt": "never",
    "security.workspace.trust.enabled": false,
    "files.readonlyInclude": {
        "/.cargo/registry/src//*.rs": true,
        "/lib/rustlib/src/rust/library//*.rs": true,
    },
    "diffEditor.ignoreTrimWhitespace": false,
    "diffEditor.useInlineViewWhenSpaceIsLimited": false,
    "editor.stickyScroll.enabled": true,
    "editor.accessibilitySupport": "off",
    "explorer.confirmPasteNative": false,
    "remote.SSH.remotePlatform": {
        "192.168.1.22": "linux"
    },
    "[html]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[json]": {
        "editor.defaultFormatter": "vscode.json-language-features"
    },
    "terminal.integrated.fontSize": 20,
    "workbench.experimental.enableNewProfilesUI": true
}
```
