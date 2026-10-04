"""Verify the delivered source archive without trusting archive paths."""
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
import argparse
import hashlib
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
parser.add_argument('--checksum', type=Path)
parser.add_argument('--blueprint', type=Path)
parser.add_argument('--original', type=Path, help='Also verify the first ten migrations are unchanged')
args = parser.parse_args()
archive = args.archive.resolve()
checksum = args.checksum or archive.with_suffix('.sha256')
blueprint = args.blueprint or archive.parent / 'HBI_ZERO_COST_V1_BLUEPRINT_UPDATED.md'
expected = checksum.read_text(encoding='utf-8').split()[0]
assert hashlib.sha256(archive.read_bytes()).hexdigest() == expected, 'Checksum mismatch'
forbidden = {'.git', 'node_modules', '.next', '.vinext', '.wrangler', '.cloudflare',
             'dist', 'coverage', 'playwright-report', 'test-results', '__pycache__'}
with zipfile.ZipFile(archive) as package, TemporaryDirectory(prefix='hbi-verify-') as temp:
    assert package.testzip() is None, 'Archive CRC mismatch'
    names = package.namelist()
    assert len(names) == len(set(names)), 'Duplicate archive entries'
    for name in names:
        path = PurePosixPath(name)
        assert path.parts[0] == 'hbi-starter' and not path.is_absolute()
        assert '..' not in path.parts and '\\' not in name and ':' not in name
        assert not forbidden.intersection(path.parts), f'Build/dependency artifact: {name}'
        assert not path.name.endswith(('.tsbuildinfo', '.log', '.zip', '.pyc'))
        assert not path.name.startswith('.env') or path.name == '.env.example'
    package.extractall(temp)
    extracted = Path(temp) / 'hbi-starter'
    assert (extracted / 'BLUEPRINT.md').read_bytes() == blueprint.read_bytes(), 'Blueprint mismatch'
    assert (extracted / 'pnpm-lock.yaml').is_file()
    assert (extracted / 'CHANGELOG.md').is_file()
    assert (extracted / 'VALIDATION.md').is_file()
    if args.original:
        with zipfile.ZipFile(args.original) as original:
            old = [n for n in original.namelist() if '/migrations/' in n and n.endswith('.sql')]
            assert len(old) == 10
            for name in old:
                suffix = name[name.index('supabase/migrations/'):]
                assert package.read('hbi-starter/' + suffix) == original.read(name), suffix
        print('PASS: original migrations 0001-0010 preserved byte for byte')
print('PASS: SHA256, CRC, safe extraction, Blueprint parity and clean source-only package')
