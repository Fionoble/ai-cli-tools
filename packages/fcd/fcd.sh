#!/usr/bin/env bash
# fcd — fuzzy cd into a directory
# Source this file in your .zshrc/.bashrc:
#   source /path/to/fcd.sh

fcd() {
  if ! command -v fzf &>/dev/null; then
    echo "fcd: fzf is required but not installed." >&2
    echo "  Install it: brew install fzf" >&2
    return 1
  fi

  local config_file="$HOME/.fcdrc"
  local dirs=()

  if [[ -f "$config_file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      # skip empty lines and comments
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      local expanded="${line/#\~/$HOME}"
      [[ -d "$expanded" ]] && dirs+=("$expanded")
    done < "$config_file"
  fi

  # default to ~/dev if no dirs configured
  if [[ ${#dirs[@]} -eq 0 ]]; then
    if [[ -d "$HOME/dev" ]]; then
      dirs=("$HOME/dev")
    else
      echo "fcd: no directories configured and ~/dev does not exist." >&2
      echo "  Create ~/.fcdrc with one directory per line." >&2
      return 1
    fi
  fi

  # list immediate subdirectories of each configured dir (priority order preserved)
  local selection
  selection=$(
    for d in "${dirs[@]}"; do
      find "$d" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort
    done | fzf --query="${1:-}" --select-1 --exit-0
  )

  if [[ -n "$selection" ]]; then
    cd "$selection" || return 1
  fi
}
