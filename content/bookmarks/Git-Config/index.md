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
    lg = log --pretty=format:'%C(auto)%h %Cgreen%an%Creset %C(yellow)%d%Creset %s' --abbrev-commit
[diff]
    tool = winmerge
    guitool = winmerge
    colormoved = "default"
    colormovedws = "allow-indentation-change"
    colorWords = true

[merge]
    tool = winmerge
    guitool = winmerge
[mergetool]
    prompt = false
    keepBackup = false

[difftool "bc"]
    path = C:/Program Files/Beyond Compare 4/bcomp.exe
[mergetool "bc"]
    path = C:/Program Files/Beyond Compare 4/bcomp.exe
    keepBackup = false

[difftool "meld"]
    path = "C:/Program Files (x86)/Meld/meld/meld.exe"
[mergetool "meld"]
    path = "C:/Program Files (x86)/Meld/meld/meld.exe"
    keepBackup = false

[core]
    editor = notepad4
    autocrlf = false
    commentChar = ";"
    longpaths = true
[help]
    autocorrect = 1

[safe]
    directory = *

# https://blog.gitbutler.com/how-git-core-devs-configure-git/
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

[remote "origin"]
    fetch = '+refs/pull/*:refs/remotes/origin/pull/*'

# You Don't Know Git - Edward Thomson - NDC London 2025
# https://www.youtube.com/watch?v=DZI0Zl-1JqQ
```
