#!/usr/bin/env python3
"""
Initialize a new skill from a template.

Usage:
    python init_skill.py <skill-name> [--output-dir <path>]

Examples:
    python init_skill.py my-new-skill
    python init_skill.py code-formatter --output-dir ~/.claude/skills
"""

import argparse
import os
import sys
from pathlib import Path

SKILL_TEMPLATE = '''---
name: {name}
description: {description}
---

# {title}

Brief description of what this skill does.

## When to Use

Use this skill when:
- Condition 1
- Condition 2

## Process

1. **Step 1**: Description
2. **Step 2**: Description
3. **Step 3**: Description

## Examples

### Example 1
```
Input: ...
Output: ...
```

## Reference

Additional details and documentation.
'''

README_TEMPLATE = '''# {title}

{description}

## Installation

Copy this skill to your `.claude/skills/` directory:

```bash
cp -r {name} ~/.claude/skills/
```

## Usage

Invoke the skill in Claude Code:

```
/{name}
```

## Files

- `SKILL.md` - Main skill instructions
- `resources/` - Supporting files and templates
'''


def to_title_case(name: str) -> str:
    """Convert kebab-case to Title Case."""
    return ' '.join(word.capitalize() for word in name.split('-'))


def validate_skill_name(name: str) -> bool:
    """Validate skill name follows conventions."""
    if not name:
        return False
    # Must be kebab-case
    if not all(c.islower() or c.isdigit() or c == '-' for c in name):
        return False
    # Can't start or end with hyphen
    if name.startswith('-') or name.endswith('-'):
        return False
    # No double hyphens
    if '--' in name:
        return False
    return True


def create_skill(name: str, output_dir: Path, description: str = None) -> Path:
    """Create a new skill directory with template files."""

    if not validate_skill_name(name):
        raise ValueError(
            f"Invalid skill name '{name}'. Use kebab-case (e.g., 'my-skill-name')"
        )

    skill_dir = output_dir / name

    if skill_dir.exists():
        raise FileExistsError(f"Skill directory already exists: {skill_dir}")

    # Create directory structure
    skill_dir.mkdir(parents=True)
    (skill_dir / 'resources').mkdir()

    # Generate description if not provided
    if not description:
        description = f"Description for {to_title_case(name)} skill"

    # Create SKILL.md
    skill_md = SKILL_TEMPLATE.format(
        name=name,
        title=to_title_case(name),
        description=description
    )
    (skill_dir / 'SKILL.md').write_text(skill_md)

    # Create README.md
    readme = README_TEMPLATE.format(
        name=name,
        title=to_title_case(name),
        description=description
    )
    (skill_dir / 'README.md').write_text(readme)

    # Create example resource
    example_content = f"# Example Resource for {to_title_case(name)}\n\nAdd your templates and examples here.\n"
    (skill_dir / 'resources' / 'example.md').write_text(example_content)

    return skill_dir


def main():
    parser = argparse.ArgumentParser(
        description='Initialize a new Claude Code skill from a template'
    )
    parser.add_argument(
        'name',
        help='Skill name in kebab-case (e.g., my-new-skill)'
    )
    parser.add_argument(
        '--output-dir', '-o',
        type=Path,
        default=None,
        help='Output directory (default: .claude/skills in current directory)'
    )
    parser.add_argument(
        '--description', '-d',
        type=str,
        default=None,
        help='Skill description'
    )

    args = parser.parse_args()

    # Determine output directory
    if args.output_dir:
        output_dir = args.output_dir
    else:
        # Default to .claude/skills in current directory
        output_dir = Path.cwd() / '.claude' / 'skills'

    output_dir = output_dir.resolve()

    try:
        skill_dir = create_skill(args.name, output_dir, args.description)
        print(f"✓ Created skill: {skill_dir}")
        print(f"\nFiles created:")
        for f in skill_dir.rglob('*'):
            if f.is_file():
                print(f"  - {f.relative_to(skill_dir)}")
        print(f"\nNext steps:")
        print(f"  1. Edit {skill_dir / 'SKILL.md'} with your instructions")
        print(f"  2. Add resources to {skill_dir / 'resources'}/")
        print(f"  3. Validate with: python quick_validate.py {skill_dir}")
    except (ValueError, FileExistsError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
