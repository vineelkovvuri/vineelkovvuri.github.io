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

# https://blog.gitbutler.com/how-git-core-devs-configure-git/
[column]
    ui = auto
[branch]
    sort = -committerdate
[tag]
    sort = version:refname
[init]
    defaultBranch = main
[diff]
    algorithm = histogram
    colorMoved = plain
    mnemonicPrefix = true
    renames = true
[push]
    default = simple
    autoSetupRemote = true
    followTags = true
[fetch]
    prune = true
    pruneTags = true
    all = true
[commit]
    verbose = true
[rerere]
    enabled = true
    autoupdate = true
[rebase]
    autoSquash = true
    autoStash = true
    updateRefs = true

[remote "origin"]
	fetch = '+refs/pull/*:refs/remotes/origin/pull/*'

```