"""Adapt bundled standalone theme JavaScript to Rewamore's Django data.

Run after copying a fresh theme distribution. Idempotent: patched files are not
patched again. The original source HTML and theme licences remain untouched.
"""
from pathlib import Path
import argparse

MARKER = '/* Rewamore managed runtime v1 */'


def cut(source, start, end, replacement=''):
    if start not in source or end not in source:
        raise ValueError(f'Expected source block missing: {start[:80]}')
    before, rest = source.split(start, 1)
    _, after = rest.split(end, 1)
    return before + replacement + end + after


def patch_file(path, theme):
    source = path.read_text(encoding='utf-8')
    if source.startswith(MARKER):
        return False
    if path.name == 'config.js':
        if theme in {'1', '2', '10'}:
            source = 'window.INVITATION = window.RewamoreRuntime.legacyInvitation();\n'
        elif theme in {'3', '4'}:
            source = 'window.WEDDING_CONFIG = window.RewamoreRuntime.legacyWedding();\n'
        elif theme == '5':
            source = 'window.INVITATION_CONFIG = {}; // RSVP owned by Django bridge.\n'
    elif path.name == 'guestbook.js' and theme == '5':
        source = '// Shared server guestbook is provided by static/studio/invitation.js.\n'
    elif path.name in {'app.js', 'script.js'}:
        if theme in {'1', '2', '10'}:
            source = cut(source, '    function updateCountdown() {', '    function downloadFile(')
            source = cut(source, "    $('saveCalendar')?.addEventListener('click',", '    // Reveal')
            source = source.replace('growMessage();', '')
            source = source.replace("'Foto Andi dan Sada'", "'Foto mempelai'")
            source = source.replace("config.videoId : 'wAPhVFrWLHQ'", "config.videoId : ''")
            source = source.replace('      if (frame) frame.src =', '      if (!id) return;\n      if (frame) frame.src =')
        elif theme in {'3', '4'}:
            source = cut(source, '  const eventDate = new Date(', '  function downloadFile(')
            source = cut(source, "  $('#calendar-button')?.addEventListener('click',", '  // Native dialogs supply')
            source = cut(source, '  // RSVP is deliberately local:', '  const giftDialog =')
        elif theme in {'6', '9'}:
            source = source.replace("guest: 'Iin Sinurat dan Pasangan'", "guest: window.RewamoreRuntime.guest || 'Tamu Undangan'")
            source = cut(source, '  // Dates come from the supplied invitation;', '  function download(')
            source = cut(source, "  $$('[data-calendar]').forEach(", "  $$('[data-copy]').forEach(")
            source = cut(source, '  let savedRsvp=null;', '})();')
        elif theme in {'5', '7', '8'}:
            if theme in {'7', '8'}:
                source = cut(source, '  // RSVP intentionally stays on this device', '  function makeShareURL(')
                source = source.replace(', validateWish: validateWish', '')
            source = source.replace('setupHero, setupCountdown, setupCalendar, setupNavigation', 'setupHero, setupNavigation')
            source = source.replace('setupVideo, setupCopy, setupRSVP, setupShare', 'setupVideo, setupCopy, setupShare')
            source = source.replace("guest || 'Iin Sinurat dan Pasangan'", "guest || window.RewamoreRuntime.guest || 'Tamu Undangan'")
            source = source.replace("'https://www.youtube-nocookie.com/embed/wAPhVFrWLHQ?autoplay=1&rel=0&playsinline=1'", "'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(window.RewamoreRuntime.videoId) + '?autoplay=1&rel=0&playsinline=1'")
            source = source.replace("iframe.title = 'Video pernikahan Andi dan Sada';", "iframe.title = window.RewamoreRuntime.title;")
            source = source.replace("'Kenangan Andi & Sada'", "'Kenangan mempelai'").replace("'Ilustrasi Endah & Evan'", "'Foto mempelai'")
    path.write_text(MARKER + '\n' + source, encoding='utf-8')
    return True


def patch_all(root):
    changed = []
    for theme in map(str, range(1, 11)):
        folder = Path(root) / theme
        for path in sorted(folder.rglob('*.js')):
            if patch_file(path, theme):
                changed.append(str(path))
    return changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('root', nargs='?', default=str(Path(__file__).resolve().parents[1] / 'static' / 'themes'))
    args = parser.parse_args()
    for result in patch_all(args.root):
        print(result)
