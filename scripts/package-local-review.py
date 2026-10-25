"""Package tracked/unignored source with a verified checksum; never include media/secrets/builds."""
import argparse
import hashlib
from pathlib import Path
import shutil
import subprocess
import zipfile


def package(output, name="SESEN_LOCAL_ANALYSIS_V1_2026-10-20"):
    root = Path(__file__).resolve().parents[1]
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    names = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=root).decode("utf-8").split("\0")
    excluded = {".git", "node_modules", ".next", "dist", ".vinext", ".cloudflare", ".wrangler", "coverage", "playwright-report", "__pycache__"}
    files = []
    for source_name in sorted(set(filter(None, names))):
        relative = Path(source_name)
        source = root / relative
        if (any(part in excluded or part.startswith("test-results") for part in relative.parts)
            or relative.name == ".npmrc"
            or (relative.name.startswith(".env") and relative.name != ".env.example")
            or relative.suffix in {".zip", ".log", ".pyc", ".mp4", ".onnx", ".tsbuildinfo"}):
            continue
        if source.is_symlink() or not source.is_file() or not source.resolve().is_relative_to(root):
            raise ValueError(f"Unexpected source path: {source_name}")
        files.append(relative)
    (root / "TREE.md").write_text("# Source tree\n\nPackaged source inventory; credentials, dependencies, media and generated output are excluded.\n\n```text\n" + "\n".join(path.as_posix() for path in files) + "\n```\n", encoding="utf-8")
    if not name or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in name):
        raise ValueError("Package name must be a simple ASCII basename")
    archive = output / (name + ".zip")
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for relative in files:
            info = zipfile.ZipInfo("hbi-starter/" + relative.as_posix(), date_time=(2026, 10, 20, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            bundle.writestr(info, (root / relative).read_bytes())
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None:
            raise ValueError("ZIP CRC verification failed")
        for relative in files:
            if bundle.read("hbi-starter/" + relative.as_posix()) != (root / relative).read_bytes():
                raise ValueError("ZIP differs from source")
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".sha256").write_text(f"{digest}  {archive.name}\n", encoding="ascii")
    shutil.copyfile(root / "BLUEPRINT.md", output / "SESEN_BLUEPRINT.md")
    with zipfile.ZipFile(archive) as bundle:
        if bundle.read("hbi-starter/BLUEPRINT.md") != (output / "SESEN_BLUEPRINT.md").read_bytes():
            raise ValueError("Blueprint parity failure")
    print(f"Verified {len(files)} source files; SHA256 {digest}; {archive}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--name", default="SESEN_LOCAL_ANALYSIS_V1_2026-10-20")
    args = parser.parse_args()
    package(args.output, args.name)
