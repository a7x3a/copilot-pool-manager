# Build: Copilot Pool Manager (CPM)

Build a production-quality **Windows-first CLI application** called **Copilot Pool Manager (CPM)**.

## Goal

CPM is a local CLI manager for multiple **independently authorized GitHub Copilot accounts**.

The purpose is to:

* securely manage multiple GitHub/Copilot accounts
* authenticate each account using GitHub/Copilot's supported authentication mechanisms
* launch the official GitHub Copilot CLI using a selected account
* track account health and locally observable usage information
* track temporary rate-limit/unavailable states
* provide a terminal dashboard
* manage projects
* maintain logs/history
* automatically select an available authenticated account when appropriate
* never expose credentials in plaintext

Do NOT build a web application.

Everything must run locally on the user's Windows PC.

---

# 1. Technology Stack

Use:

* Node.js
* TypeScript
* Commander.js for CLI commands
* SQLite for local persistent data
* Drizzle ORM
* Zod for validation
* `child_process` for launching Copilot CLI
* Windows Credential Manager or an equivalent secure OS credential store for credentials
* Ink + React for a rich terminal UI if useful
* otherwise use a clean terminal UI library

Use modern TypeScript with strict mode.

Target:

* Windows 11
* PowerShell
* Node.js LTS

The final application should be installable globally so the user can run:

```powershell
cpm
```

from any directory.

---

# 2. Important Authentication Rule

Use only GitHub/Copilot-supported authentication mechanisms.

Do NOT implement:

* token scraping
* browser cookie extraction
* stealing session cookies
* bypassing authentication
* bypassing GitHub security controls
* copying browser sessions
* plaintext token databases

The application must support legitimate authentication of accounts that the user owns or is authorized to use.

Support the documented Copilot CLI authentication mechanisms, including supported environment-variable authentication such as:

```text
COPILOT_GITHUB_TOKEN
```

where appropriate.

The actual credential must never be stored in:

```text
config.json
SQLite
logs
terminal output
Git repository
```

Store credentials in Windows Credential Manager or another secure OS-backed credential store.

---

# 3. Project Structure

Create a clean project:

```text
copilot-pool-manager/
│
├── src/
│   ├── cli/
│   │   ├── index.ts
│   │   ├── commands/
│   │   │   ├── accounts.ts
│   │   │   ├── auth.ts
│   │   │   ├── run.ts
│   │   │   ├── status.ts
│   │   │   ├── usage.ts
│   │   │   ├── projects.ts
│   │   │   ├── logs.ts
│   │   │   └── doctor.ts
│   │
│   ├── core/
│   │   ├── account-manager.ts
│   │   ├── account-selector.ts
│   │   ├── copilot-runner.ts
│   │   ├── health-checker.ts
│   │   ├── usage-manager.ts
│   │   ├── cooldown-manager.ts
│   │   └── project-manager.ts
│   │
│   ├── auth/
│   │   ├── credential-store.ts
│   │   ├── github-auth.ts
│   │   └── token-manager.ts
│   │
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   │
│   ├── terminal/
│   │   ├── dashboard.tsx
│   │   ├── tables.ts
│   │   ├── colors.ts
│   │   └── progress.ts
│   │
│   ├── config/
│   │   ├── config.ts
│   │   └── defaults.ts
│   │
│   ├── logging/
│   │   └── logger.ts
│   │
│   └── types/
│       └── index.ts
│
├── tests/
├── drizzle/
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

Keep modules small and testable.

---

# 4. Local Data Directory

Use:

```text
%USERPROFILE%\.cpm\
```

Structure:

```text
.cpm/
├── config.json
├── cpm.db
├── logs/
└── cache/
```

Never store raw credentials here.

---

# 5. Database

Use SQLite + Drizzle.

Create these tables.

## accounts

Fields:

```text
id
github_username
display_name
credential_reference
copilot_plan
status
last_authenticated_at
last_used_at
last_health_check_at
last_error
cooldown_until
created_at
updated_at
```

Statuses:

```text
READY
ACTIVE
LIMITED
COOLDOWN
AUTH_ERROR
OFFLINE
DISABLED
UNKNOWN
```

---

## usage

Fields:

```text
id
account_id
timestamp
project_id
model
session_id
credits
tokens
source
raw_summary
```

Do not invent usage numbers.

If the official CLI/API does not expose a particular metric, display:

```text
N/A
```

rather than guessing.

---

## events

Fields:

```text
id
account_id
timestamp
event_type
message
project_id
metadata
```

Examples:

```text
LOGIN
LOGOUT
HEALTH_CHECK
RATE_LIMIT
COOLDOWN_STARTED
COOLDOWN_FINISHED
ACCOUNT_SELECTED
ACCOUNT_SWITCHED
AUTH_ERROR
CLI_STARTED
CLI_EXITED
```

Never log credentials.

---

## projects

Fields:

```text
id
name
path
preferred_account_id
created_at
updated_at
```

---

# 6. CLI Commands

Implement:

```powershell
cpm
```

Open the interactive terminal dashboard.

```powershell
cpm accounts
```

Show all accounts.

```powershell
cpm add
```

Add/authenticate a GitHub Copilot account.

```powershell
cpm login <account>
```

Re-authenticate an account.

```powershell
cpm logout <account>
```

Remove its local authentication.

```powershell
cpm remove <account>
```

Remove an account from CPM.

```powershell
cpm status
```

Show overall system status.

```powershell
cpm usage
```

Show available usage information.

```powershell
cpm projects
```

Show projects.

```powershell
cpm project add
```

Add a project.

```powershell
cpm run
```

Run Copilot CLI in the current directory.

```powershell
cpm run <project>
```

Run Copilot CLI in a configured project.

```powershell
cpm doctor
```

Run health checks.

```powershell
cpm logs
```

Show account events and switching history.

```powershell
cpm settings
```

Show/edit configuration.

---

# 7. Interactive Dashboard

When the user runs:

```powershell
cpm
```

display a terminal dashboard.

Example:

```text
╭──────────────────────────────────────────────────────────────╮
│                  COPILOT POOL MANAGER                       │
╰──────────────────────────────────────────────────────────────╯

ACCOUNTS

 ID   ACCOUNT             STATUS       USAGE       LAST USED
 ─────────────────────────────────────────────────────────────
 01   github-user-1       READY        --          2 min ago
 02   github-user-2       ACTIVE       --          now
 03   github-user-3       LIMITED      cooldown    14 min ago
 04   github-user-4       READY        --          21 min ago


CURRENT PROJECT

 MyProject
 C:\Projects\MyProject


ACTIVE ACCOUNT

 #02 github-user-2
 Status: ACTIVE


SYSTEM

 Accounts:       4
 Available:      3
 Active:          1
 Limited:         1


[1] Run Copilot
[2] Accounts
[3] Usage
[4] Projects
[5] Health
[6] Logs
[Q] Quit
```

Make it visually clean but don't overdesign it.

---

# 8. Account Selection

Create an `AccountSelector`.

It should consider:

1. authenticated state
2. account status
3. cooldown
4. recent usage
5. project preference
6. last-used time

Never select:

```text
AUTH_ERROR
DISABLED
COOLDOWN
```

unless explicitly requested by the user.

Use a transparent selection strategy.

Example:

```text
READY
READY
ACTIVE
COOLDOWN
AUTH_ERROR
```

The selector chooses from the usable accounts.

---

# 9. Copilot Runner

Create:

```text
CopilotRunner
```

Responsibilities:

1. determine project
2. select account
3. retrieve credential securely
4. prepare environment
5. launch official Copilot CLI
6. forward stdin/stdout/stderr transparently
7. monitor exit status
8. record events
9. restore environment
10. never print credentials

Example:

```powershell
cpm run
```

should behave like the user directly launched:

```powershell
copilot
```

The user should still be able to interact normally with Copilot CLI.

---

# 10. Failure Handling

Build proper error classification.

Do NOT treat every error as a rate limit.

Classify errors into:

```text
RATE_LIMIT
AUTH_ERROR
NETWORK_ERROR
SERVICE_ERROR
MODEL_ERROR
CLI_ERROR
UNKNOWN
```

For example:

```text
RATE_LIMIT
    ↓
record event
    ↓
mark account temporarily unavailable
    ↓
respect retry/cooldown information
```

But:

```text
NETWORK_ERROR
    ↓
do not automatically assume account is limited
```

And:

```text
AUTH_ERROR
    ↓
mark AUTH_ERROR
    ↓
tell user to run:

cpm login <account>
```

---

# 11. Cooldown System

Implement:

```text
cooldown_until
```

When a temporary limit is detected, store the cooldown.

Example dashboard:

```text
03 github-user-3
STATUS: COOLDOWN
AVAILABLE IN: 07:32
```

When cooldown expires:

```text
COOLDOWN
   ↓
health check
   ↓
READY
```

Respect any retry timing provided by the service.

Do not repeatedly retry an account that has been rate limited.

---

# 12. Usage Tracking

Use official/observable Copilot CLI information where available.

Support parsing or recording information exposed by:

```text
/usage
/limits
```

when those commands are available in the installed Copilot CLI version.

Do not fabricate:

```text
remaining requests
remaining credits
percentage used
```

when the underlying value is not actually available.

Display:

```text
N/A
```

instead.

Store raw summaries so the parser can be improved later.

---

# 13. Projects

Implement:

```powershell
cpm project add
```

Example:

```text
Project name:
MyProject

Project path:
C:\Projects\MyProject
```

Then:

```powershell
cpm run MyProject
```

automatically:

```text
cd C:\Projects\MyProject
```

and starts Copilot.

Support:

```text
preferred account = AUTO
```

or a specific account.

Default should be:

```text
AUTO
```

---

# 14. Security

Security is extremely important.

Never:

* print tokens
* save tokens to SQLite
* save tokens to config.json
* write tokens to logs
* include tokens in errors
* commit tokens
* send tokens to any external service

Use OS secure credential storage.

Sanitize all subprocess output before logging.

Add:

```text
.gitignore
```

for:

```text
.cpm/
*.db
.env
.env.*
logs/
```

---

# 15. Configuration

Example:

```json
{
  "copilotCommand": "copilot",
  "selectionStrategy": "least-recently-used",
  "automaticSelection": true,
  "respectCooldown": true,
  "usageTracking": true,
  "logging": true
}
```

Never put credentials here.

---

# 16. Doctor command

Implement:

```powershell
cpm doctor
```

It should check:

```text
Node.js
Copilot CLI
SQLite
Credential store
Database
Configuration
Each account
Project paths
```

Example:

```text
CPM Doctor
────────────────────────────

Node.js             ✓
Copilot CLI         ✓
SQLite              ✓
Credential Store    ✓
Database            ✓

Accounts

01 github-user-1    ✓ authenticated
02 github-user-2    ✓ authenticated
03 github-user-3    ! limited
04 github-user-4    ✗ authentication required

Projects
DemoApp             ✓
WebPortal           ✓
ApiBackend          ✓
```

---

# 17. Logging

Create structured logs.

Example:

```text
2026-09-28 23:12:01
ACCOUNT_SELECTED
account=02
project=DemoApp

2026-09-28 23:47:22
RATE_LIMIT
account=02

2026-09-28 23:47:22
COOLDOWN_STARTED
account=02

2026-09-28 23:47:23
ACCOUNT_SELECTED
account=01
project=DemoApp
```

Never log credentials.

---

# 18. Testing

Create unit tests for:

* account selection
* cooldown
* status transitions
* project resolution
* database
* configuration
* error classification
* credential references
* logging sanitization

Create integration tests for:

```text
cpm add
cpm accounts
cpm status
cpm doctor
cpm projects
cpm run
```

Mock Copilot CLI during automated tests.

Do not make tests depend on a real GitHub account.

---

# 19. Installation

The final project should support:

```powershell
npm install
npm run build
npm link
```

Then:

```powershell
cpm
```

must work globally.

Also provide:

```powershell
npm run dev
```

for development.

---

# 20. README

Write a complete README containing:

* what CPM is
* architecture
* installation
* prerequisites
* authentication
* adding accounts
* project management
* usage
* troubleshooting
* security
* configuration
* development
* testing

Include real PowerShell examples.

---

# 21. Important design principle

Do NOT try to make CPM a replacement for Copilot CLI.

CPM is an orchestration layer:

```text
CPM
 │
 ├── accounts
 ├── credentials
 ├── health
 ├── usage
 ├── projects
 ├── selection
 ├── cooldown
 └── logging
        │
        ▼
   Official Copilot CLI
```

The actual Copilot experience should remain the normal official Copilot CLI.

---

# 22. Implementation process

Do not generate the entire project blindly in one file.

Build incrementally:

### Phase 1

Create the project and CLI foundation.

### Phase 2

Implement SQLite and account management.

### Phase 3

Implement secure credential storage.

### Phase 4

Implement Copilot CLI runner.

### Phase 5

Implement health checks and status.

### Phase 6

Implement usage tracking.

### Phase 7

Implement project management.

### Phase 8

Implement terminal dashboard.

### Phase 9

Implement error classification and cooldown handling.

### Phase 10

Write tests and documentation.

After each phase:

1. run TypeScript compiler
2. run tests
3. fix errors
4. verify functionality
5. only then continue

Do not leave TODO placeholders for core functionality.

---

# Final acceptance criteria

The project is complete when I can install it on Windows and run:

```powershell
cpm
```

and see my accounts.

I can run:

```powershell
cpm add
```

to authenticate an independently authorized GitHub/Copilot account.

I can run:

```powershell
cpm doctor
```

and see account health.

I can run:

```powershell
cpm usage
```

and see only usage information that can actually be obtained from supported Copilot interfaces.

I can run:

```powershell
cpm project add
```

to register a project.

I can run:

```powershell
cpm run DemoApp
```

and have CPM launch the official Copilot CLI in the DemoApp project using the selected authenticated account.

The terminal dashboard must clearly show:

```text
Account
Status
Usage when available
Last used
Cooldown
Current project
Active account
Recent events
```

The application must be secure, local-first, Windows-friendly, maintainable, and production-quality.
