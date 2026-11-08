#!/usr/bin/env python3
"""Interactive Desktop publisher; message generation stays local."""
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

def git(*args, capture=True):
    result = subprocess.run(['git', *args], cwd=REPO, text=True,
                            stdout=subprocess.PIPE if capture else None, check=True)
    return result.stdout.strip() if capture else ''

def paths_changed():
    tracked = subprocess.check_output(['git', 'diff', 'HEAD', '--name-only', '-z'], cwd=REPO)
    untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=REPO)
    return sorted({p.decode() for p in (tracked + untracked).split(b'\0') if p})

def message_for(paths):
    groups = set()
    for p in paths:
        low = p.lower()
        if 'subtitle' in low or 'roku-captions' in low: groups.add('subtitles')
        elif 'skiptime' in low or 'episode-markers' in low: groups.add('skip timings')
        elif 'catalog' in low or 'mediaregistry' in low or 'episodemetadata' in low or 'episodetitles' in low: groups.add('media catalog')
        elif '/images/' in low or 'artwork' in low or 'assetmanifest' in low or '.xcassets/' in low: groups.add('artwork')
        elif p.startswith('ios/'): groups.add('iOS and Catalyst app')
        elif p.startswith('roku/'): groups.add('Roku app')
        elif p.startswith('frontend/'): groups.add('browser app')
        elif p.startswith('backend/'): groups.add('backend')
        elif p.startswith('docs/') or low.endswith('.md'): groups.add('documentation')
        elif p.startswith('scripts/') or p.startswith('.github/'): groups.add('publishing tools')
        else: groups.add('project configuration')
    ordered = sorted(groups)
    summary = ', '.join(ordered[:3])
    if len(ordered) > 3: summary += ' and related files'
    return 'Update CWorld ' + (summary or 'project files')

def check_sensitive(paths):
    suspicious = []
    for p in paths:
        name = Path(p).name.lower()
        if (name == '.env' or (name.startswith('.env.') and not name.endswith(('.example', '.sample', '.template')))
            or name.endswith(('.pem', '.p12', '.pfx', '.key')) or name in {'id_rsa', 'id_ed25519', 'credentials'}):
            suspicious.append(p)
    if suspicious:
        raise RuntimeError('Potential credential files found. Exclude or review them before publishing:\n' + '\n'.join(suspicious))

def main():
    os.environ['PATH'] = '/opt/homebrew/bin:/usr/local/bin:' + os.environ.get('PATH', '')
    branch = git('symbolic-ref', '--quiet', '--short', 'HEAD')
    paths = paths_changed()
    suggestion = message_for(paths)
    if '--preview' in sys.argv:
        print(suggestion)
        print('\n'.join(paths))
        return
    if git('diff', '--name-only', '--diff-filter=U'):
        raise RuntimeError('Resolve merge conflicts before publishing.')
    print(f'CearaWorld Publisher\nRepository: {REPO}\nBranch: {branch}\n')
    git('status', '--short', capture=False)
    if paths:
        check_sensitive(paths)
        git('diff', '--check', capture=False)
        git('diff', '--cached', '--check', capture=False)
        print(f'\nSuggested message: {suggestion}')
        print('This includes all changes shown above. Publishing may trigger deployment workflows.')
        if input('Commit and push these changes? [y/N] ').strip().lower() not in {'y', 'yes'}:
            print('Cancelled.'); return
        message = input('Press Return to use the suggested message, or enter your own: ').strip() or suggestion
        git('add', '-A', capture=False)
        git('diff', '--cached', '--check', capture=False)
        # Include the actual file summary in the body without sending code to an AI service.
        body = git('diff', '--cached', '--stat')
        git('commit', '-m', message, '-m', body, capture=False)
    else:
        print('No uncommitted changes. Checking for commits that still need pushing…')
    # Fetch first: never force-push or automatically merge someone else's changes.
    git('fetch', 'origin', branch, capture=False)
    remote = 'FETCH_HEAD'
    ahead, behind = map(int, git('rev-list', '--left-right', '--count', f'HEAD...{remote}').split())
    if behind:
        raise RuntimeError('The remote branch has newer commits. Your local commits are saved; synchronize the branch before retrying.')
    if not ahead:
        print('Everything is already published.'); return
    if not paths:
        git('log', '--oneline', f'{remote}..HEAD', capture=False)
        if input(f'Push these {ahead} saved commit(s)? [y/N] ').strip().lower() not in {'y', 'yes'}:
            print('Cancelled.'); return
    git('push', 'origin', f'HEAD:refs/heads/{branch}', capture=False)
    print('\nPublished successfully. Applicable GitHub/Render workflows can now run.')

if __name__ == '__main__':
    try:
        main()
    except (subprocess.CalledProcessError, RuntimeError, OSError) as error:
        print(f'\nPublish stopped: {error}\nAny completed local commit is saved. You can retry from the Desktop app.', file=sys.stderr)
        sys.exit(1)
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled.'); sys.exit(1)
