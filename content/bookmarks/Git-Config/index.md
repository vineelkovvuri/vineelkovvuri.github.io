---
title: "Git Config"
tags: ['Git', 'WindowsSetup']
---

```ini
[user]
    name = Vineel Kovvuri
    email = vineel.kovvuri@gmail.com
[alias]
    st = status
    br = branch -vv
    co = checkout
    cp = cherry-pick
[diff]
    tool = meld
    colormoved = "default"
    colormovedws = "allow-indentation-change"
[difftool]
    prompt = false
[merge]
    tool = meld
[mergetool]
    prompt = false
[color]
    ui = auto
[difftool "bc"]
    path = c:/Program Files/Beyond Compare 4/bcomp.exe
[mergetool "bc"]
    path = c:/Program Files/Beyond Compare 4/bcomp.exe
    keepBackup = false
[difftool "meld"]
    path = "C:/Program Files (x86)/Meld/meld/meld.exe"
[mergetool "meld"]
    path = "C:/Program Files (x86)/Meld/meld/meld.exe"
    keepBackup = false
[core]
    editor = notepad4
    autocrlf = false
[help]
    autocorrect = 1
[safe]
    directory = *
```