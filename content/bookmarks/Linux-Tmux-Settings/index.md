---
title: "Linux Tmux Settings"
tags: ['LinuxSetup']
---

## ~/.tmux.conf
```bash
# remap prefix from 'C-b' to 'C-a'
unbind C-b
set-option -g prefix C-a
bind-key C-a send-prefix
#
# start with window 1 (instead of 0)
set -g base-index 1

# start with pane 1
set -g pane-base-index 1

# shorten command delay
set -sg escape-time 1

# split panes using | and -
bind | split-window -h -c '#{pane_current_path}'
bind - split-window -v -c '#{pane_current_path}'
unbind '"'
unbind %

# reload config file (change file location to your the tmux.conf you want to use)
bind r source-file ~/.tmux.conf

# This will make ctrl + left/right arrow work
set-window-option -g xterm-keys on
# switch panes using Alt-arrow without prefix
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

# Enable mouse control (clickable windows, panes, resizable panes)
# set -g mouse-select-window on
# set -g mouse-select-pane on
# set -g mouse-resize-pane on

# Enable mouse mode (tmux 2.1 and above)
# set -g mouse on

# don't rename windows automatically
set-option -g allow-rename off

#### COLOUR (Solarized 256)

# default statusbar colors
set-option -g status-style bg=colour235,fg=colour136

# default window title colors
set-window-option -g window-status-style fg=colour244,bg=default

# active window title colors
set-window-option -g window-status-current-style fg=colour166,bg=default

# pane border
set-option -g pane-border-style fg=colour235
set-option -g pane-active-border-style fg=colour240

# message text
set-option -g message-style bg=colour235,fg=colour166

# pane number display
set-option -g display-panes-active-colour colour33 #blue
set-option -g display-panes-colour colour166 #orange

# clock
set-window-option -g clock-mode-colour colour64 #green

# bell
set-window-option -g window-status-bell-style fg=colour235,bg=colour160
```
