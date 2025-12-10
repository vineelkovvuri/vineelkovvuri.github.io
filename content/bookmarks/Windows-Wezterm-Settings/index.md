---
title: "WezTerm Setting"
tags: ['Windows', 'Terminal', 'WindowsSetup']
---

## C:\Users\vineelko\OneDrive\Softs\Tools\WezTerm\wezterm.lua

```lua
local wezterm = require 'wezterm'
local config = {}

-- ===== Appearance =====
config.font = wezterm.font 'FiraMono Nerd Font Mono'
config.font_size = 13
config.color_scheme = 'Campbell (Gogh)'

config.scrollback_lines = 20000

-- ===== Key Bindings =====
config.keys = {
  -- Move between panes (Alt+Arrows)
  { key = "LeftArrow",  mods = "ALT",        action = wezterm.action.ActivatePaneDirection("Left") },
  { key = "RightArrow", mods = "ALT",        action = wezterm.action.ActivatePaneDirection("Right") },
  { key = "UpArrow",    mods = "ALT",        action = wezterm.action.ActivatePaneDirection("Up") },
  { key = "DownArrow",  mods = "ALT",        action = wezterm.action.ActivatePaneDirection("Down") },

  -- Resize panes (Shift+Alt+Arrows)
  { key = "LeftArrow",  mods = "ALT|SHIFT", action = wezterm.action.AdjustPaneSize({ "Left", 5 }) },
  { key = "RightArrow", mods = "ALT|SHIFT", action = wezterm.action.AdjustPaneSize({ "Right", 5 }) },
  { key = "UpArrow",    mods = "ALT|SHIFT", action = wezterm.action.AdjustPaneSize({ "Up", 2 }) },
  { key = "DownArrow",  mods = "ALT|SHIFT", action = wezterm.action.AdjustPaneSize({ "Down", 2 }) },

  -- Split panes
  { key = "+", mods = "ALT|SHIFT", action = wezterm.action.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
  { key = "_", mods = "ALT|SHIFT", action = wezterm.action.SplitVertical({ domain = "CurrentPaneDomain" }) },

    -- Key bindings for Windows-style copy/paste
    -- Ctrl+C to copy when text is selected, otherwise send Ctrl+C
  {
    key = 'c',
    mods = 'CTRL',
    action = wezterm.action_callback(function(window, pane)
      local has_selection = window:get_selection_text_for_pane(pane) ~= ''
      if has_selection then
        window:perform_action(wezterm.action.CopyTo('Clipboard'), pane)
      else
        window:perform_action(wezterm.action.SendKey({ key = 'c', mods = 'CTRL' }), pane)
      end
    end),
  },
  -- Ctrl+V to paste
  {
    key = 'v',
    mods = 'CTRL',
    action = wezterm.action.PasteFrom('Clipboard'),
  },
  -- Optional: Ctrl+Shift+C/V as backup (traditional terminal shortcuts)
  {
    key = 'c',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.CopyTo('Clipboard'),
  },
  {
    key = 'v',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.PasteFrom('Clipboard'),
  },


    -- Ctrl+Alt+S: Show SSH connection menu (interactive)
  {
    key = 's',
    mods = 'CTRL|ALT',
    action = wezterm.action.ShowLauncherArgs {
      flags = 'FUZZY|LAUNCH_MENU_ITEMS',
    },
  },
}

-- Word delimiters for double-click selection (Windows Terminal style)
config.selection_word_boundary = " ()\"',;<>~!@#$%^&*|+=[]{}~?│"

-- Cursor configuration (Windows Terminal style)
config.default_cursor_style = 'BlinkingBar'  -- Thin vertical bar that blinks
config.cursor_blink_rate = 530              -- Blink speed in milliseconds
config.cursor_blink_ease_in = 'Constant'    -- No easing animation
config.cursor_blink_ease_out = 'Constant'   -- No easing animation
config.enable_scroll_bar = true
config.min_scroll_bar_height = '1cell'
-- config.colors = {
--   scrollbar_thumb = 'silver',
-- }

-- Background image Tux (Windows Terminal style)
config.background = {
      -- Solid background color layer
  {
    source = {
      Color = '#000000',  -- Change to your preferred background color
    },
    width = '100%',
    height = '100%',
  },
  {
    source = {
      File = 'C:/Users/vineelko/OneDrive/Softs/Terminal/animated-tux.gif',  -- Change to your file path
    },
    horizontal_align = 'Right',
    vertical_align = 'Bottom',
    repeat_x = 'NoRepeat',
    repeat_y = 'NoRepeat',
    -- width='139',
    -- height='160',
    width='209',
    height='240',
    hsb = {
      brightness = 1.0,
    },
    attachment = { Parallax = 0.0 },  -- Fixed position
  },
}

-- SSH Launch Menu - appears when you press Ctrl+Alt+S
config.launch_menu = {
  {
    label = 'SSH to UbuntuTFA',
    args = { 'ssh', 'vineel@ubuntutfa' },
  },
  {
    label = 'Visual Studio 2022 Developer Command Prompt (x64)',
    args = {
      'cmd.exe',
      '/k',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat'
    },
  },
}

wezterm.on('format-tab-title', function(tab)
  local cwd = tab.active_pane.current_working_dir
  local dirname = cwd and cwd.file_path:match("([^/]+)/?$") or "~"
  return string.format('%d: %s', tab.tab_index + 1, dirname)
end)

return config
```
