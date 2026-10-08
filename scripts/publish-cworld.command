#!/bin/zsh
set -euo pipefail

REPO_ROOT="/Users/piercemakombe/Documents/Cworld"
cd "$REPO_ROOT"

clear
echo "CearaWorld publisher"
echo "===================="
echo "Repository: $REPO_ROOT"
echo

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No changes to publish."
  echo
  read -r "pause?Press Return to close..."
  exit 0
fi

echo "Changes that will be included:"
echo
git status --short
echo
echo "This will stage all listed changes, commit them, and push the current branch."
read -r "confirm?Continue? [y/N] "
if [[ "${confirm:l}" != "y" && "${confirm:l}" != "yes" ]]; then
  echo "Cancelled."
  read -r "pause?Press Return to close..."
  exit 0
fi

echo
read -r "message?Commit message [Publish CWorld changes]: "
message="${message:-Publish CWorld changes}"

git add -A
git diff --cached --check
git commit -m "$message"
git push origin HEAD

echo
echo "Published successfully."
echo "Render and the Catalyst update workflow will now process the changes."
read -r "pause?Press Return to close..."
