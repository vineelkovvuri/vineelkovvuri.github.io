---
title: "SSH Config to Use Multiple GitHub Accounts with SSH Keys on a Single Computer"
tags: ['Windows', 'SSH', 'WindowsSetup']
---

```ini
# This should be copied as ~/.ssh/config

Host 192.168.1.22
  HostName 192.168.1.22
  User vineelko
  ForwardAgent yes

# For Account 1 (vineelkovvuri)
# when cloning a repo we should use
# git clone git@github-vineelkovvuri:vineelkovvuri/vin-pro.git instead of below
# git clone git@github.com:vineelkovvuri/vin-pro.git
# git config user.name "Vineel Kovvuri"
# git config user.email "vineelkovvuri@gmail.com"
Host github-vineelkovvuri
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_vineelkovvuri_github

# For Account 2 (vineelko)
Host github-vineelko
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_vineelko_github

```
