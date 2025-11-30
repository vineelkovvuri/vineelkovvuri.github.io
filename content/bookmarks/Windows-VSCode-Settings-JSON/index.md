---
title: "Windows VSCode Setting JSON"
tags: ['VSCode', 'WindowsSetup']
---

## Extensions
```text
code --install-extension 13xforever.language-x86-64-assembly
code --install-extension alexandersklarmsft.midl3-language-server
code --install-extension bibhasdn.unique-lines
code --install-extension bierner.markdown-emoji
code --install-extension christian-kohler.path-intellisense
code --install-extension chunsen.bracket-select
code --install-extension codetrek.haystack-search
code --install-extension codezombiech.gitignore
code --install-extension csholmq.excel-to-markdown-table
code --install-extension dakara.transformer
code --install-extension dan-c-underwood.arm
code --install-extension davidanson.vscode-markdownlint
code --install-extension davidwang.ini-for-vscode
code --install-extension dnut.rewrap-revived
code --install-extension earshinov.simple-alignment
code --install-extension earshinov.sort-lines-by-selection
code --install-extension editorconfig.editorconfig
code --install-extension esbenp.prettier-vscode
code --install-extension fill-labs.dependi
code --install-extension formulahendry.auto-close-tag
code --install-extension formulahendry.auto-rename-tag
code --install-extension github.copilot
code --install-extension github.copilot-chat
code --install-extension github.vscode-pull-request-github
code --install-extension heaths.vscode-guid
code --install-extension ibm.output-colorizer
code --install-extension intel-corporation.edk2code
code --install-extension ionutvmi.reg
code --install-extension jbockle.jbockle-format-files
code --install-extension jkjustjoshing.vscode-text-pastry
code --install-extension josa.markdown-table-formatter
code --install-extension jsynowiec.vscode-insertdatestring
code --install-extension kevinkyang.auto-comment-blocks
code --install-extension lixquid.calculator
code --install-extension maelvalais.autoconf
code --install-extension markis.code-coverage
code --install-extension medo64.render-crlf
code --install-extension ms-azure-devops.azure-pipelines
code --install-extension ms-python.debugpy
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-python.vscode-python-envs
code --install-extension ms-vscode-remote.remote-containers
code --install-extension ms-vscode-remote.remote-ssh
code --install-extension ms-vscode-remote.remote-ssh-edit
code --install-extension ms-vscode-remote.remote-wsl
code --install-extension ms-vscode-remote.vscode-remote-extensionpack
code --install-extension ms-vscode.cmake-tools
code --install-extension ms-vscode.cpptools
code --install-extension ms-vscode.cpptools-extension-pack
code --install-extension ms-vscode.cpptools-themes
code --install-extension ms-vscode.hexeditor
code --install-extension ms-vscode.powershell
code --install-extension ms-vscode.remote-explorer
code --install-extension ms-vscode.remote-server
code --install-extension ms-vscode.vscode-github-issue-notebooks
code --install-extension pomdtr.excalidraw-editor
code --install-extension redhat.vscode-xml
code --install-extension rubbersheep.gi
code --install-extension rust-lang.rust-analyzer
code --install-extension shardulm94.trailing-spaces
code --install-extension smcpeak.default-keys-windows
code --install-extension streetsidesoftware.code-spell-checker
code --install-extension stuart.unique-window-colors
code --install-extension tamasfe.even-better-toml
code --install-extension thamaraiselvam.remove-blank-lines
code --install-extension trond-snekvik.gnu-mapfiles
code --install-extension twxs.cmake
code --install-extension usernamehw.errorlens
code --install-extension vadimcn.vscode-lldb
code --install-extension wmaurer.change-case
code --install-extension xaver.clang-format
code --install-extension yzhang.markdown-all-in-one
code --install-extension zachflower.uncrustify
```

## Settings JSON

```json
{
    "editor.fontFamily": "FiraMono Nerd Font Mono",
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
    "terminal.integrated.shell.windows": "C:\\Windows\\System32\\cmd.exe",
    "C_Cpp.configurationWarnings": "Disabled",
    "C_Cpp.default.enableConfigurationSquiggles": false,
    "timeline.excludeSources": [
        "git-history"
    ],
    "clang-format.executable": "C:\\Program Files\\LLVM\\bin\\clang-format.exe",
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
    "terminal.integrated.defaultProfile.windows": "Command Prompt",
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
