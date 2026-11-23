"""Bundle existing native card thumbnails; no SVG conversion or network requests."""
import json, pathlib, shutil
from PIL import Image, ImageDraw, ImageOps
root = pathlib.Path(__file__).resolve().parent
repo = root.parent
native = repo / 'ios/CWorldIOS/Resources/MobileArtwork'
manifest = json.loads((native / 'manifest.json').read_text())['assets']
catalog = json.loads((repo / 'backend/uploadtest/catalog_v1.json').read_text())['items']
out = root / 'images/library'
out.mkdir(parents=True, exist_ok=True)
mapping = {}
for item in catalog:
    url = item.get('artwork', {}).get('card', '')
    asset = manifest.get(url)
    source = native / asset['image'] if asset else repo / 'frontend/public' / url.split('cearaworld.com/')[-1]
    if source.is_file() and source.suffix.lower() in ('.jpg', '.jpeg', '.png'):
        name = item['id'] + '.png'
        image = ImageOps.fit(Image.open(source).convert('RGBA'), (512, 512))
        mask = Image.new('L', (512, 512), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 511, 511), radius=38, fill=255)
        image.putalpha(mask)
        image.save(out / name, optimize=True)
        for suffix in ('.jpg', '.jpeg'):
            previous_copy = out / (item['id'] + suffix)
            if previous_copy.is_file(): previous_copy.unlink()
        mapping[item['id']] = 'pkg:/images/library/' + name
(root / 'images/card-map.json').write_text(json.dumps(mapping, indent=2) + '\n')
print(f'Prepared {len(mapping)}/{len(catalog)} library cards; remaining titles use catalog posters.')

desktop = repo / 'ios/CWorldIOS/Resources/DesktopArtwork'
details = json.loads((desktop / 'manifest.json').read_text())['assets']
detail_map = {}
for media_id, asset in details.items():
    source = desktop / asset['image']
    if source.is_file():
        name = 'detail-' + media_id + source.suffix
        shutil.copy2(source, out / name)
        detail_map[media_id] = 'pkg:/images/library/' + name
(root / 'images/detail-map.json').write_text(json.dumps(detail_map, indent=2) + '\n')
reference = json.loads((repo / 'ios/CWorldIOS/Resources/desktop-reference.json').read_text())
(root / 'images/new-media.json').write_text(json.dumps(reference['newMedia'][:10]) + '\n')
