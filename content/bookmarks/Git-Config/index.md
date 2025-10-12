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
    lg = log --oneline --left-right --date=short --pretty=format:'%m %C(auto)%<(7)%h %C(blue)%<(10)%ad %C(green)%<(20,trunc)%an%Creset %Creset %s%C(yellow)%d%Creset'
    llg = log --oneline --left-right --date=short --pretty=format:'%m %C(auto)%<(7)%h %Creset %s%Creset'
    dd = difftool -d --no-symlinks
[pager]
    diff = riff  # Install riff https://github.com/walles/riff
    show = riff
    log = riff
[interactive]
    diffFilter = riff --color=on
[diff]
    tool = winmerge
    guitool = winmerge
    colorWords = true
    algorithm = histogram
    colorMoved = plain
    mnemonicPrefix = true
    renames = true
[merge]
    tool = winmerge
    guitool = winmerge
    conflictstyle=diff3
[mergetool]
    prompt = false
    keepBackup = false
[difftool "bc"]
    cmd = \"C:/Program Files/Beyond Compare 4/BCompare.exe\" \"$LOCAL\" \"$REMOTE\"
[difftool "winmerge"]
    path = C:/Users/vineelko/AppData/Local/Programs/WinMerge/winmergeu.exe
    cmd = \"C:/Users/vineelko/AppData/Local/Programs/WinMerge/winmergeu.exe\" -e -u \"$LOCAL\" \"$REMOTE\"
[mergetool "winmerge"]
    path = C:/Users/vineelko/AppData/Local/Programs/WinMerge/winmergeu.exe
    cmd = \"C:/Users/vineelko/AppData/Local/Programs/WinMerge/winmergeu.exe\" -e -u  -wl -wr -fm -dl \"Mine: $LOCAL\" -dm \"Merged: $BASE\" -dr \"Theirs: $REMOTE\" \"$LOCAL\" \"$BASE\" \"$REMOTE\" -o \"$MERGED\"
[pull]
    rebase = false
[rebase]
    autoStash = false
    autosquash = false
    updateRefs = false
[core]
    editor = notepad4
    autocrlf = false
    commentChar = ";"
    longpaths = true
    symlinks = true
    pager = moor  # Install moor: https://github.com/walles/moor
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
    prune = true
    pruneTags = true
    all = true
[commit]
    verbose = true
[rerere]
    enabled = true
    autoupdate = true
[remote "origin"]
    fetch = '+refs/pull/*:refs/remotes/origin/pull/*'

```
