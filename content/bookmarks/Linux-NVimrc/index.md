---
title: "Linux ~/.config/nvim/init.vim"
tags: ['LinuxSetup']
---

```bash
set nocompatible              " be iMproved, required
filetype off                  " required

set number
filetype plugin indent on
syntax on
set cindent
set shiftwidth=4
set tabstop=4
set incsearch
set ignorecase
set hlsearch
set ruler

" Make vsplit and split open files to the right and below respectively
set splitright
set splitbelow

set lazyredraw
set ttyfast

" no wrapping of text
set nowrap
set textwidth=0
set wrapmargin=0

"no sounds
set noerrorbells
set novisualbell
set t_vb=
set noeb vb t_vb=

set showmode

set laststatus=2                " tell VIM to always put a status line in, even
                                "    if there is only one window
set wildmenu                    " make tab completion for files/buffers act like bash
set wildmode=list:full          " show a list when pressing tab and complete
                                "    first full match
set showcmd                     " show (partial) command in the last line of the screen
                                "    this also shows visual selection info
set pastetoggle=<F2>
set listchars=tab:\|\ ,eol:$,trail:-
set backspace=indent,eol,start
set wildmode=longest:full,full
set colorcolumn=100

set showmatch
hi MatchParen cterm=underline ctermfg=blue ctermbg=none "Highlight only other matching brace(not both) in red

au BufNewFile,BufRead COMMIT_EDITMSG set spell
hi clear SpellBad
hi SpellBad cterm=underline
hi clear SpellCap
hi SpellCap cterm=underline
hi clear SpellRare
hi SpellRare cterm=underline
hi clear SpellLocal
hi SpellLocal cterm=underline

"Correct common mistakes
:command WQ wq
:command Wq wq
:command W w
:command Q q

nnoremap <silent> <F4> :TlistToggle<CR>

"No swapfiles
set nobackup
set noswapfile
set nowritebackup

```
