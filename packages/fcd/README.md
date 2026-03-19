# fcd — fuzzy cd

Quickly jump into project directories using fzf.

## Requirements

- [fzf](https://github.com/junegunn/fzf)

## Setup

Source `fcd.sh` in your shell rc file:

```bash
# .zshrc / .bashrc
source /path/to/ai-cli-tools/packages/fcd/fcd.sh
```

Or if you ran `install.sh`:

```bash
source ~/.local/share/fcd/fcd.sh
```

## Usage

```bash
fcd          # browse all directories
fcd react    # pre-filter with "react"
```

## Configuration

Create `~/.fcdrc` with one directory per line. The first entry gets priority (listed first in fzf). Lines starting with `#` are comments.

```
~/dev
~/projects
~/work
```

If `~/.fcdrc` doesn't exist, defaults to `~/dev`.
