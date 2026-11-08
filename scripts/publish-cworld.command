#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
SCRIPT_DIR="${0:A:h}"
python3 "$SCRIPT_DIR/publish-cworld.py"
result=$?
printf '\n'
read -r 'pause?Press Return to close...'
exit "$result"
