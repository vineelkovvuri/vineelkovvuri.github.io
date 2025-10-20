---
title: "How to Use Multiple GitHub Accounts with SSH Keys on a Single Computer"
date: 2025-03-25 20:27:07
toc: true
tags: ['Git', 'SSH', 'GitHub']
---

# How to Use Multiple GitHub Accounts with SSH Keys on a Single Computer?

For a long time, I wanted to access both my personal account (`vineelkovvuri`)
and my Microsoft work account (`vineelko`) from my work laptop. Naturally, using
the same `.ssh/id_rsa.pub` key for both GitHub accounts wouldn't work. This
article explains the workaround I came across.

## Step 1: Generate Separate SSH Keys

First, generate different SSH key pairs for each account:

```cmd
C:\> ssh-keygen -t rsa -b 4096 -C "vineel.kovvuri@gmail.com"
Generating public/private rsa key pair.
Enter file in which to save the key (C:\Users\vineelko/.ssh/id_rsa): C:\Users\vineelko/.ssh/id_rsa_vineelkovvuri_github
```

The crucial part here is saving the RSA file with a distinct name (`id_rsa_vineelkovvuri_github`).

Repeat this process for your work account, saving it as `C:\Users\vineelko/.ssh/id_rsa_vineelko_github`.

## Step 2: Configure SSH

Add the following configuration to `C:\Users\vineelko\.ssh\config`:

```ini
# Personal Account (vineelkovvuri)
Host github-vineelkovvuri
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_vineelkovvuri_github

# Work Account (vineelko)
Host github-vineelko
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_vineelko_github
```

## Step 3: Clone Repositories with Modified URLs

When cloning repositories from your personal account, instead of:
```powershell
git clone git@github.com:vineelkovvuri/vin-pro.git
```

Use:
```powershell
git clone git@github-vineelkovvuri:vineelkovvuri/vin-pro.git
```

The modified hostname (`github-vineelkovvuri`) tells SSH which key file to use
when authenticating with GitHub.com.

## Step 4: Configure Repository-Specific Git Settings

On my work laptop, I keep my work email and username in the global
`~/.gitconfig` since that's my primary account. For personal repositories, I set
project-specific configurations:

```powershell
git config user.name "Vineel Kovvuri"
git config user.email "vineel.kovvuri@gmail.com"
```

Because we cloned the repository using the modified URL, the remotes are
automatically configured correctly:

```powershell
C:\repos\vin-pro> git remote -vv
origin  git@github-vineelkovvuri:vineelkovvuri/vin-pro.git (fetch)
origin  git@github-vineelkovvuri:vineelkovvuri/vin-pro.git (push)
```

No more WSL or multiple Windows users or complicated `includeIf` dance. Hope
this helps.
