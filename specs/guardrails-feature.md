# Guardrails Feature

## Overview

Guardrails are pre-configured hooks that prevent common mistakes when using AI-assisted development. Instead of building hooks from scratch, users can enable guardrails from a library of templates.

**Guardrails = Hooks with pre-built logic for safety/quality**

---

## Why This Feature

Claude Code is powerful but risky. A developer with Claude Code can:
- Accidentally commit secrets
- Delete hundreds of lines of code
- Modify production configs
- Break architectural patterns

Hooks can prevent this, but:
1. Most users don't know how to write hooks
2. Writing validation logic is tedious
3. Common patterns should be reusable

---

## User Experience

### In Labforge UI

New section in sidebar: **Guardrails** (between Hooks and MCPs)

```
┌─────────────────────────────────────────────────────────────┐
│  GUARDRAILS                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Security                                                   │
│  ┌────────────────────────────────────────────┬──────────┐ │
│  │ ☑ Block hardcoded secrets                  │ Edit →   │ │
│  │   Prevents API keys, passwords in code     │          │ │
│  ├────────────────────────────────────────────┼──────────┤ │
│  │ ☑ Block production URLs                    │ Edit →   │ │
│  │   No hardcoded prod endpoints              │          │ │
│  ├────────────────────────────────────────────┼──────────┤ │
│  │ ☐ Protected paths                          │ Edit →   │ │
│  │   Block edits to specified directories     │          │ │
│  └────────────────────────────────────────────┴──────────┘ │
│                                                             │
│  Code Quality                                               │
│  ┌────────────────────────────────────────────┬──────────┐ │
│  │ ☐ No console.log                           │ Edit →   │ │
│  │   Block debug statements in production     │          │ │
│  ├────────────────────────────────────────────┼──────────┤ │
│  │ ☐ Limit deletions                          │ Edit →   │ │
│  │   Require confirmation for large deletes   │          │ │
│  ├────────────────────────────────────────────┼──────────┤ │
│  │ ☐ Require tests                            │ Edit →   │ │
│  │   New functions must have test files       │          │ │
│  └────────────────────────────────────────────┴──────────┘ │
│                                                             │
│  Architecture                                               │
│  ┌────────────────────────────────────────────┬──────────┐ │
│  │ ☐ Import rules                             │ Edit →   │ │
│  │   Enforce module boundaries                │          │ │
│  ├────────────────────────────────────────────┼──────────┤ │
│  │ ☐ File creation paths                      │ Edit →   │ │
│  │   Only allow new files in certain dirs     │          │ │
│  └────────────────────────────────────────────┴──────────┘ │
│                                                             │
│  [+ Create Custom Guardrail]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Panel (when clicking "Edit →")

```
┌─────────────────────────────────────────────────────────────┐
│  Block Hardcoded Secrets                          [x]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Patterns to block:                                         │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ☑ API keys (api_key, apiKey, API_KEY)                  ││
│  │ ☑ AWS credentials (AKIA*, aws_secret)                  ││
│  │ ☑ Passwords (password=, passwd=)                       ││
│  │ ☑ Private keys (-----BEGIN.*PRIVATE)                   ││
│  │ ☐ Custom pattern: [____________________]               ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Exclude paths:                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ .env.example                                           ││
│  │ **/*.test.ts                                           ││
│  │ [+ Add exclusion]                                      ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Action when triggered:                                     │
│  ○ Block (prevent the edit)                                │
│  ○ Warn (allow but show warning)                           │
│                                                             │
│                              [Cancel]  [Save Guardrail]     │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Data Model

```typescript
interface Guardrail {
  id: string;
  type: GuardrailType;
  name: string;
  description: string;
  enabled: boolean;
  config: GuardrailConfig;
}

type GuardrailType =
  | "block-secrets"
  | "block-urls"
  | "protected-paths"
  | "no-console"
  | "limit-deletions"
  | "require-tests"
  | "import-rules"
  | "file-paths"
  | "custom";

interface GuardrailConfig {
  patterns?: string[];           // regex patterns to match
  excludePaths?: string[];       // glob patterns to exclude
  paths?: string[];              // paths to protect/allow
  maxLines?: number;             // for limit-deletions
  action: "block" | "warn";
  customScript?: string;         // for custom guardrails
}
```

### Generated Output

Guardrails generate to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/guardrails/block-secrets.js $TOOL_INPUT"
          }
        ]
      }
    ]
  }
}
```

Plus validation scripts in `.claude/guardrails/`:

```javascript
// .claude/guardrails/block-secrets.js
const input = JSON.parse(process.argv[2]);
const content = input.content || input.new_string || "";

const PATTERNS = [
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /AKIA[0-9A-Z]{16}/,
  /password\s*[:=]\s*["'][^"']+["']/i,
  /-----BEGIN.*PRIVATE.*KEY-----/,
];

const EXCLUDE = [".env.example", "**/*.test.ts"];

// Check if file is excluded
const filePath = input.file_path || "";
if (EXCLUDE.some(pattern => minimatch(filePath, pattern))) {
  process.exit(0); // Allow
}

// Check for patterns
for (const pattern of PATTERNS) {
  if (pattern.test(content)) {
    console.error(`Blocked: Found potential secret matching ${pattern}`);
    process.exit(2); // Block
  }
}

process.exit(0); // Allow
```

---

## Guardrail Templates

### Security

#### 1. Block Hardcoded Secrets
- **Event:** PreToolUse (Edit, Write)
- **Logic:** Regex match for API keys, passwords, tokens
- **Config:** Pattern list, exclusions

#### 2. Block Production URLs
- **Event:** PreToolUse (Edit, Write)
- **Logic:** Match production domains
- **Config:** Domain list (e.g., `api.production.com`, `*.prod.*`)

#### 3. Protected Paths
- **Event:** PreToolUse (Edit, Write, Bash)
- **Logic:** Block operations on certain paths
- **Config:** Path patterns (e.g., `config/production/*`, `.env`)

### Code Quality

#### 4. No Console Statements
- **Event:** PreToolUse (Edit, Write)
- **Logic:** Block `console.log`, `console.debug`, `print()`
- **Config:** Statement patterns, file exclusions (allow in tests)

#### 5. Limit Deletions
- **Event:** PreToolUse (Edit)
- **Logic:** Count deleted lines, block if > threshold
- **Config:** Max lines (default: 50), exclusions

#### 6. Require Tests
- **Event:** PostToolUse (Edit, Write)
- **Logic:** If new function created, check for corresponding test
- **Config:** Test file patterns, function detection

### Architecture

#### 7. Import Rules
- **Event:** PreToolUse (Edit, Write)
- **Logic:** Enforce module boundaries
- **Config:** Rules like `{ "in": "src/ui/**", "cannot_import": "src/api/**" }`

#### 8. File Creation Paths
- **Event:** PreToolUse (Write)
- **Logic:** Only allow new files in specified directories
- **Config:** Allowed paths (e.g., `src/**`, `tests/**`)

#### 9. Module Ownership
- **Event:** PostToolUse (Edit)
- **Logic:** Notify when critical modules are modified
- **Config:** Owner mapping `{ "src/payments/**": ["team-payments"] }`

---

## Export Format

When exporting a plugin with guardrails:

```
my-plugin/
├── .claude/
│   ├── settings.local.json    # Hook registrations
│   └── guardrails/
│       ├── block-secrets.js
│       ├── protected-paths.js
│       └── limit-deletions.js
├── commands/
├── skills/
└── README.md                   # Documents active guardrails
```

---

## MVP Scope

### Phase 1 (MVP)
- [ ] Guardrails section in sidebar
- [ ] 3 pre-built guardrails:
  - Block hardcoded secrets
  - Protected paths
  - Limit deletions
- [ ] Enable/disable toggle
- [ ] Basic configuration (patterns, paths)
- [ ] Export to `.claude/` directory

### Phase 2
- [ ] Full template library (all 9 guardrails)
- [ ] Custom guardrail builder
- [ ] Import/export guardrail configs
- [ ] Guardrail presets (e.g., "Strict Security", "Enterprise")

### Phase 3
- [ ] Community guardrail registry
- [ ] Team guardrail sharing
- [ ] Guardrail analytics (how often triggered)

---

## Open Questions

1. **Claude Code hook format** - Need to verify exact format for settings.local.json hooks
2. **Exit codes** - Confirm exit code 2 blocks, exit 0 allows
3. **Tool input format** - How is $TOOL_INPUT structured for each tool?
4. **Performance** - Running JS scripts for every edit could be slow
5. **Warn vs Block** - How to show warnings without blocking?
