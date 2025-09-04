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
    dd = difftool -d --no-symlinks
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
[mergetool]
    prompt = false
    keepBackup = false
[difftool "bc"]
    cmd = \"C:/Program Files/Beyond Compare 4/BCompare.exe\" \"$LOCAL\" \"$REMOTE\"
[core]
    editor = notepad4
    autocrlf = false
    commentChar = ";"
    longpaths = true
    symlinks = true
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
[pull]
    rebase = false
[rebase]
    autoStash = false
    autosquash = false
    updateRefs = false

[remote "origin"]
    fetch = '+refs/pull/*:refs/remotes/origin/pull/*'

# You Don't Know Git - Edward Thomson - NDC London 2025
# https://www.youtube.com/watch?v=DZI0Zl-1JqQ
```
