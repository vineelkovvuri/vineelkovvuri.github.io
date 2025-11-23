---
title: "Linux Git Config(~/.gitconfig)"
tags: ['Git', 'LinuxSetup']
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
    lg = log --oneline --left-right --date=short --pretty=format:'%m %C(auto)%<(7)%h %C(blue)%<(10)%ad %C(green)%<(20,trunc)%an%Creset %Creset %s%C(yellow)%d%Creset'
    llg = log --oneline --left-right --date=short --pretty=format:'%m %C(auto)%<(7)%h %Creset %s%Creset'
    dd = difftool -d --no-symlinks
[diff]
    tool = meld
    guitool = meld
    colorWords = true
    algorithm = histogram
    colorMoved = plain
    mnemonicPrefix = true
    renames = true
[merge]
    tool = meld
    guitool = meld
    conflictstyle=diff3
[mergetool]
    prompt = false
    keepBackup = false
[pull]
    rebase = false
[rebase]
    autoStash = false
    autosquash = false
    updateRefs = false
[core]
	editor = subl -n -w
    autocrlf = false
    commentChar = ";"
    longpaths = true
    symlinks = true
[grep]
    patternType = perl
    lineNumber = true
[help]
    autocorrect = 1
[safe]
    directory = *
[branch]
    sort = -committerdate
[tag]
    sort = version:refname
[init]
    defaultBranch = main
[push]
    default = simple
    autoSetupRemote = true
    followTags = true
[fetch]
    all = true
[commit]
    verbose = true
[rerere]
    enabled = true
    autoupdate = true
[remote "origin"]
    fetch = '+refs/pull/*:refs/remotes/origin/pull/*'

```
