---
title: "Windows Terminal Setting JSON"
tags: ['Windows', 'Terminal', 'WindowsSetup']
---

```json
{
    "$help": "https://aka.ms/terminal-documentation",
    "$schema": "https://aka.ms/terminal-profiles-schema",
    "actions": [],
    "copyFormatting": "none",
    "copyOnSelect": false,
    "defaultProfile": "{0caa0dad-35be-5f56-a8ff-afceeeaa6101}",
    "firstWindowPreference": "persistedWindowLayout",
    "keybindings": 
    [
        {
            "id": "Terminal.CopyToClipboard",
            "keys": "ctrl+c"
        },
        {
            "id": "Terminal.PasteFromClipboard",
            "keys": "ctrl+v"
        },
        {
            "id": "Terminal.DuplicatePaneAuto",
            "keys": "alt+shift+d"
        }
    ],
    "newTabMenu": 
    [
        {
            "type": "remainingProfiles"
        }
    ],
    "profiles": 
    {
        "defaults": 
        {
            "backgroundImage": "C:\\Users\\vineel\\OneDrive\\Softs\\Terminal\\animated-tux.gif",
            "backgroundImageAlignment": "bottomRight",
            "backgroundImageStretchMode": "none",
            "font": 
            {
                "face": "FiraMono Nerd Font Mono"
            },
            "historySize": 50000,
            "closeOnExit": "graceful"
        },
        "list": 
        [
            {
                "commandline": "%SystemRoot%\\System32\\cmd.exe",
                "guid": "{0caa0dad-35be-5f56-a8ff-afceeeaa6101}",
                "hidden": false,
                "name": "Command Prompt",
                "tabTitle": "CMD"
            },
            {
                "commandline": "wt -w 0 -d C:\\; sp -V -d C:\\; mf left",
                "guid": "{2caa0dad-35be-5f56-a8ff-afceeeaa6102}",
                "hidden": false,
                "name": "Split 1x2",
                "tabTitle": "Split 1x2"
            },
            {
                "commandline": "wt -w 0 -d C:\\; sp -V -d C:\\; mf left; sp -H -d C:\\;mf right;sp -H -d C:\\; mf first",
                "guid": "{2caa0dad-35be-5f56-a8ff-afceeeaa6103}",
                "hidden": false,
                "name": "Split 2x2",
                "tabTitle": "Split 2x2"
            },
            {
                "guid": "{963ff2f7-6aed-5ce3-9d91-90d99571f53a}",
                "hidden": true,
                "name": "Ubuntu-24.04",
                "source": "Windows.Terminal.Wsl"
            }
        ]
    },
    "schemes": [],
    "themes": [],
    "wordDelimiters": " ()\"',;<>~!@#$%^&*|+=[]{}~?\u2502"
}
```
