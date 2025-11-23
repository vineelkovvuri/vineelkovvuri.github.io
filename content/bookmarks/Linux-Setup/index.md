---
title: "Linux Setup"
tags: ['LinuxSetup']
---

## Packages

```bash
sudo add-apt-repository ppa:freefilesync/ffs

sudo apt install -y gcc nasm make pkg-config git neovim micro tree unrar \
    python-is-python3 curl fzf gparted fish cifs-utils meld vlc btop \
    ripgrep lsscsi graphviz fd-find bat hexyl xchm hwinfo shutter \
    mate-themes gtkterm bless alacritty tmux terminator dconf-editor \
    cutecom minicom gdb-multiarch xscreensaver xscreensaver-data-extra \
    xscreensaver-gl-extra qdirstat btop  sigrok dosfstools mtools \
    nvme-cli  openssh-server gpart  freefilesync
```

## Fish Shell

```bash
chsh -s $(which fish)
set -U fish_prompt_pwd_dir_length 0
```

## Disable boot logo

```bash
sudo nvim /etc/default/grub
GRUB_CMDLINE_LINUX_DEFAULT=""
sudo update-grub2
```

## Install RDP

```bash
sudo apt install xrdp -y
sudo systemctl status xrdp
sudo usermod -a -G ssl-cert xrdp
sudo systemctl restart xrdp
sudo ufw allow from 192.168.1.0/24 to any port 3389
sudo ufw reload
```

## Case insensitive bash completion

```bash
if [ ! -f ~/.inputrc ]; then echo '$include /etc/inputrc' > ~/.inputrc; fi
echo 'set completion-ignore-case on' >> ~/.inputrc
```

## Useful bash aliases(copy to ~/.bashrc)

```bash
alias cd..='cd ..'
alias c.='cd ..'
alias c..='cd ../..'
alias c...='cd ../../..'
alias c....='cd ../../../..'
alias c.....='cd ../../../../..'

alias gti='git'
alias du='du -hs'
alias ls='ls --color -h'
alias ks='ls --color -h'
alias tree='tree -ahC'
alias bc='bc -l'

shopt -s nocaseglob #make ls *ttl* expand to TTL Cook. To unset use shopt -u nocaseglob

```
