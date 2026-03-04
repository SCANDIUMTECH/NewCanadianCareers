#!/usr/bin/env python3
"""
Package a skill into a distributable zip file.

Usage:
    python package_skill.py <skill-dir> [--output <path>]

Examples:
    python package_skill.py .claude/skills/my-skill
    python package_skill.py .claude/skills/my-skill --output ~/Desktop/my-skill.zip
"""

import argparse
import os
import sys
import zipfile
from pathlib import Path
from datetime import datetime

# Files/patterns to exclude from package
EXCLUDE_PATTERNS = [
    '__pycache__',
    '.DS_Store',
    '*.pyc',
    '.git',
    '.gitignore',
    'node_modules',
    '.env',
    '*.log',
]


def should_exclude(path: Path) -> bool:
    """Check if a path should be excluded from the package."""
    name = path.name

    for pattern in EXCLUDE_PATTERNS:
        if pattern.startswith('*'):
            # Suffix match
            if name.endswith(pattern[1:]):
                return True
        elif pattern in str(path):
            return True

    return False


def validate_skill(skill_dir: Path) -> list[str]:
    """Validate skill structure and return list of errors."""
    errors = []

    skill_md = skill_dir / 'SKILL.md'
    if not skill_md.exists():
        errors.append("Missing required file: SKILL.md")
        return errors

    content = skill_md.read_text()

    # Check for frontmatter
    if not content.startswith('---'):
        errors.append("SKILL.md must start with YAML frontmatter (---)")
        return errors

    # Find end of frontmatter
    end_index = content.find('---', 3)
    if end_index == -1:
        errors.append("SKILL.md frontmatter not properly closed (missing ---)")
        return errors

    frontmatter = content[3:end_index].strip()

    # Check required fields
    if 'name:' not in frontmatter:
        errors.append("SKILL.md frontmatter missing 'name' field")
    if 'description:' not in frontmatter:
        errors.append("SKILL.md frontmatter missing 'description' field")

    return errors


def package_skill(skill_dir: Path, output_path: Path = None) -> Path:
    """Package a skill directory into a zip file."""

    skill_dir = skill_dir.resolve()

    if not skill_dir.is_dir():
        raise ValueError(f"Not a directory: {skill_dir}")

    # Validate skill
    errors = validate_skill(skill_dir)
    if errors:
        raise ValueError("Skill validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

    skill_name = skill_dir.name

    # Determine output path
    if output_path is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = skill_dir.parent / f"{skill_name}_{timestamp}.zip"
    else:
        output_path = output_path.resolve()

    # Create zip file
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in skill_dir.rglob('*'):
            if file_path.is_file() and not should_exclude(file_path):
                arcname = file_path.relative_to(skill_dir.parent)
                zf.write(file_path, arcname)

    return output_path


def list_contents(zip_path: Path):
    """List contents of a skill zip file."""
    print(f"\nPackage contents ({zip_path.name}):")
    with zipfile.ZipFile(zip_path, 'r') as zf:
        for info in zf.infolist():
            size = info.file_size
            if size < 1024:
                size_str = f"{size}B"
            elif size < 1024 * 1024:
                size_str = f"{size / 1024:.1f}KB"
            else:
                size_str = f"{size / (1024 * 1024):.1f}MB"
            print(f"  {info.filename:<50} {size_str:>10}")


def main():
    parser = argparse.ArgumentParser(
        description='Package a Claude Code skill into a distributable zip file'
    )
    parser.add_argument(
        'skill_dir',
        type=Path,
        help='Path to the skill directory'
    )
    parser.add_argument(
        '--output', '-o',
        type=Path,
        default=None,
        help='Output zip file path (default: <skill-name>_<timestamp>.zip)'
    )
    parser.add_argument(
        '--list', '-l',
        action='store_true',
        help='List package contents after creation'
    )

    args = parser.parse_args()

    try:
        zip_path = package_skill(args.skill_dir, args.output)
        print(f"✓ Packaged skill: {zip_path}")
        print(f"  Size: {zip_path.stat().st_size / 1024:.1f} KB")

        if args.list:
            list_contents(zip_path)

        print(f"\nTo install:")
        print(f"  unzip {zip_path.name} -d ~/.claude/skills/")

    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
