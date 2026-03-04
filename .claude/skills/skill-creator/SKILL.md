---
name: skill-creator
description: Create new Claude Code skills following best practices and standard structure
---

# Skill Creator

This skill guides you through creating new skills for Claude Code. Skills are reusable instruction sets that extend Claude's capabilities for specific tasks.

## What is a Skill?

A skill is a directory containing:
- **SKILL.md** (required): The main instruction file with YAML frontmatter
- **resources/** (optional): Supporting files, templates, examples
- **scripts/** (optional): Automation scripts for the skill

## Skill Anatomy

### SKILL.md Structure

```markdown
---
name: my-skill
description: Brief description of what the skill does
---

# Skill Title

Instructions for Claude when this skill is invoked...
```

### YAML Frontmatter (Required)
- `name`: Skill identifier (kebab-case, e.g., `code-review`)
- `description`: One-line description shown in skill listings

## Design Principle: Progressive Disclosure

Skills should reveal complexity gradually:
1. **Entry point**: Clear, simple starting instruction
2. **Core workflow**: Step-by-step process
3. **Advanced options**: Only when needed
4. **Reference material**: At the end for lookup

## Creating a New Skill

### Step 1: Define the Purpose
Answer these questions:
- What specific task does this skill help with?
- Who will use it (developers, writers, analysts)?
- What's the expected input and output?

### Step 2: Choose a Name
- Use kebab-case: `my-skill-name`
- Be descriptive but concise
- Avoid generic names like `helper` or `utils`

### Step 3: Create the Directory Structure

```
.claude/skills/your-skill-name/
├── SKILL.md              # Required: Main instructions
├── resources/            # Optional: Templates, examples
│   ├── template.md
│   └── examples/
└── scripts/              # Optional: Automation
    └── validate.py
```

### Step 4: Write SKILL.md

Start with the frontmatter:
```yaml
---
name: your-skill-name
description: What this skill does in one sentence
---
```

Then write clear instructions:
1. **Overview**: What the skill does (2-3 sentences)
2. **When to use**: Trigger conditions
3. **Process**: Step-by-step workflow
4. **Examples**: Concrete usage examples
5. **Reference**: Additional details (if needed)

### Step 5: Add Resources (Optional)

Include helpful files:
- Templates for common outputs
- Example files showing expected format
- Reference documentation

### Step 6: Validate

Run the validation script:
```bash
python .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/your-skill-name
```

## Bundled Scripts

This skill includes helper scripts in the `scripts/` directory:

### init_skill.py
Initialize a new skill from a template:
```bash
python .claude/skills/skill-creator/scripts/init_skill.py my-new-skill
```

### package_skill.py
Package a skill into a distributable zip:
```bash
python .claude/skills/skill-creator/scripts/package_skill.py .claude/skills/my-skill
```

### quick_validate.py
Validate skill structure and frontmatter:
```bash
python .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/my-skill
```

## Best Practices

### DO
- Keep instructions focused and actionable
- Use concrete examples
- Structure with clear headings
- Include validation criteria
- Test the skill before sharing

### DON'T
- Overload with too many features
- Use vague language
- Skip the frontmatter
- Forget to document edge cases
- Create overly complex workflows

## Example Skills

### Simple Skill (Minimal)
```markdown
---
name: greet
description: Generate personalized greetings
---

# Greeting Generator

When asked to greet someone, create a warm, personalized message.

## Process
1. Note the recipient's name
2. Consider the context (formal/casual)
3. Generate an appropriate greeting

## Examples
- Formal: "Dear Dr. Smith, I hope this message finds you well."
- Casual: "Hey Alex! Great to hear from you!"
```

### Complex Skill (With Resources)
```
.claude/skills/api-client/
├── SKILL.md
├── resources/
│   ├── templates/
│   │   ├── client.ts.template
│   │   └── types.ts.template
│   └── examples/
│       └── stripe-client.ts
└── scripts/
    └── generate_client.py
```

## Skill Discovery

Skills are discovered from:
1. `.claude/skills/` in the current project
2. `~/.claude/skills/` for global skills

To make a skill available globally, place it in your home directory's `.claude/skills/` folder.
