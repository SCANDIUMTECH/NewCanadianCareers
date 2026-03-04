#!/usr/bin/env python3
"""
Validate skill structure and YAML frontmatter.

Usage:
    python quick_validate.py <skill-dir>

Examples:
    python quick_validate.py .claude/skills/my-skill
    python quick_validate.py ~/.claude/skills/code-review
"""

import argparse
import re
import sys
from pathlib import Path


class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []

    def add_error(self, msg: str):
        self.errors.append(msg)

    def add_warning(self, msg: str):
        self.warnings.append(msg)

    def add_info(self, msg: str):
        self.info.append(msg)

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def print_report(self):
        if self.errors:
            print("\n❌ Errors:")
            for e in self.errors:
                print(f"   • {e}")

        if self.warnings:
            print("\n⚠️  Warnings:")
            for w in self.warnings:
                print(f"   • {w}")

        if self.info:
            print("\nℹ️  Info:")
            for i in self.info:
                print(f"   • {i}")

        if self.is_valid:
            print("\n✅ Skill is valid!")
        else:
            print(f"\n❌ Validation failed with {len(self.errors)} error(s)")


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from content. Returns (frontmatter_dict, body)."""

    if not content.startswith('---'):
        return None, content

    end_index = content.find('---', 3)
    if end_index == -1:
        return None, content

    frontmatter_text = content[3:end_index].strip()
    body = content[end_index + 3:].strip()

    # Simple YAML parsing (key: value pairs)
    frontmatter = {}
    for line in frontmatter_text.split('\n'):
        line = line.strip()
        if ':' in line:
            key, value = line.split(':', 1)
            frontmatter[key.strip()] = value.strip()

    return frontmatter, body


def validate_skill_name(name: str) -> list[str]:
    """Validate skill name follows conventions."""
    errors = []

    if not name:
        errors.append("Skill name is empty")
        return errors

    if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', name):
        errors.append(
            f"Skill name '{name}' must be kebab-case "
            "(lowercase letters, numbers, and hyphens only)"
        )

    if len(name) > 50:
        errors.append(f"Skill name '{name}' is too long (max 50 characters)")

    return errors


def validate_skill(skill_dir: Path) -> ValidationResult:
    """Validate a skill directory."""

    result = ValidationResult()
    skill_dir = skill_dir.resolve()

    # Check directory exists
    if not skill_dir.exists():
        result.add_error(f"Directory does not exist: {skill_dir}")
        return result

    if not skill_dir.is_dir():
        result.add_error(f"Not a directory: {skill_dir}")
        return result

    # Check SKILL.md exists
    skill_md = skill_dir / 'SKILL.md'
    if not skill_md.exists():
        result.add_error("Missing required file: SKILL.md")
        return result

    result.add_info(f"Found SKILL.md ({skill_md.stat().st_size} bytes)")

    # Read and parse SKILL.md
    content = skill_md.read_text()

    if not content.strip():
        result.add_error("SKILL.md is empty")
        return result

    # Parse frontmatter
    frontmatter, body = parse_frontmatter(content)

    if frontmatter is None:
        result.add_error(
            "SKILL.md must start with YAML frontmatter "
            "(--- at start and end)"
        )
        return result

    # Validate required frontmatter fields
    if 'name' not in frontmatter:
        result.add_error("Frontmatter missing required 'name' field")
    else:
        name = frontmatter['name']
        name_errors = validate_skill_name(name)
        for e in name_errors:
            result.add_error(e)

        # Check name matches directory name
        if name != skill_dir.name:
            result.add_warning(
                f"Skill name '{name}' doesn't match directory name '{skill_dir.name}'"
            )

    if 'description' not in frontmatter:
        result.add_error("Frontmatter missing required 'description' field")
    else:
        desc = frontmatter['description']
        if len(desc) < 10:
            result.add_warning("Description is very short (< 10 characters)")
        if len(desc) > 200:
            result.add_warning("Description is very long (> 200 characters)")

    # Check body content
    if not body.strip():
        result.add_warning("SKILL.md has no content after frontmatter")
    else:
        # Check for basic structure
        if '#' not in body:
            result.add_warning("SKILL.md has no headings")

        word_count = len(body.split())
        result.add_info(f"Content: ~{word_count} words")

    # Check for optional directories
    resources_dir = skill_dir / 'resources'
    if resources_dir.exists():
        resource_count = len(list(resources_dir.rglob('*')))
        result.add_info(f"Found resources/ directory ({resource_count} files)")

    scripts_dir = skill_dir / 'scripts'
    if scripts_dir.exists():
        script_count = len(list(scripts_dir.glob('*.py')))
        result.add_info(f"Found scripts/ directory ({script_count} Python files)")

    # Check for README
    readme = skill_dir / 'README.md'
    if readme.exists():
        result.add_info("Found README.md")

    return result


def main():
    parser = argparse.ArgumentParser(
        description='Validate Claude Code skill structure and frontmatter'
    )
    parser.add_argument(
        'skill_dir',
        type=Path,
        help='Path to the skill directory to validate'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Only show errors (no warnings or info)'
    )

    args = parser.parse_args()

    print(f"Validating skill: {args.skill_dir}")

    result = validate_skill(args.skill_dir)

    if args.quiet:
        if result.errors:
            print("Errors:")
            for e in result.errors:
                print(f"  - {e}")
            sys.exit(1)
        else:
            print("Valid")
    else:
        result.print_report()

    sys.exit(0 if result.is_valid else 1)


if __name__ == '__main__':
    main()
