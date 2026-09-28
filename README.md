# Copilot Pool Manager (CPM)

A production-quality, Windows-first CLI application for managing multiple independently authorized GitHub Copilot accounts with secure credential storage, automatic health monitoring, rate-limit cooldown management, and official Copilot CLI orchestration.

---

## Overview

**Copilot Pool Manager (CPM)** acts as a local orchestration layer for GitHub Copilot. It allows developers working on multiple projects or across organizations to pool and switch authorized GitHub Copilot accounts seamlessly while running the official GitHub Copilot CLI.

```text
               ┌──────────────────────────────┐
               │  Copilot Pool Manager (CPM)  │
               └──────────────┬───────────────┘
                              │
       ┌───────────────┬──────┴────────┬──────────────┐
       ▼               ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Accounts   │ │ Credentials │ │  Cooldown   │ │  Projects   │
│ & Selection │ │   WinCred   │ │  & Status   │ │  & Usage    │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │               │
       └───────────────┼───────────────┴───────────────┘
                       │ Environment Injection (COPILOT_GITHUB_TOKEN)
                       ▼
         ┌───────────────────────────┐
         │ Official Copilot CLI Tool │
         └───────────────────────────┘
```

CPM is **not** a Copilot emulator or replacement—it is a wrapper and orchestration tool that launches the official GitHub Copilot CLI transparently, forwarding all standard I/O directly to your terminal.

---

## Key Features

- **Windows Credential Manager Integration**: All sensitive credentials are encrypted and stored in the native Windows Credential store via Win32 C APIs (`CredReadW`, `CredWriteW`, `CredDeleteW`). Zero plaintext tokens in SQLite, config files, or logs.
- **AMSI & Antivirus Safe**: Employs strictly direct N-API / native system interfaces. Never executes dynamic reflection or PowerShell cryptographic one-liners that could trigger Defender or AMSI heuristics (`Trojan:Win32/Commando.A!ml`).
- **Transparent CLI Forwarding**: Standard input, output, and error streams are forwarded transparently. The native Copilot experience remains completely unchanged.
- **Intelligent Selection Strategies**:
  - `least-recently-used` (default)
  - `round-robin`
  - `priority`
  - Project-level preferred account binding
- **Automated Cooldown & Rate-Limit Tracking**: Detects rate limits and server errors, temporarily cooling accounts down with countdown timers while auto-switching to ready accounts.
- **Accurate Observable Metrics**: Never fabricates numbers. Displays only authentic metrics reported by Copilot sessions or `/usage` commands (`N/A` when unavailable).
- **Interactive Terminal Dashboard**: Single-glance status overview with quick keyboard shortcuts.

---

## Prerequisites

- **Windows 11 / Windows 10**
- **Node.js**: v18.0.0 or higher (LTS recommended)
- **PowerShell** 5.1+ or PowerShell 7+
- **GitHub Copilot CLI** (install via GitHub CLI: `gh extension install github/gh-copilot` or standalone installer)

---

## Installation

Clone the repository and install dependencies:

```powershell
git clone https://github.com/your-username/copilot-pool-manager.git cpm
cd cpm
npm install
npm run build
npm link
```

Now you can invoke `cpm` globally from any PowerShell or Command Prompt window:

```powershell
cpm --help
```

---

## Quick Start

### 1. Check System Health

Run the built-in diagnostic tool to ensure your environment is ready:

```powershell
cpm doctor
```

Output:
```text
CPM Doctor
────────────────────────────────────────
 Node.js             ✓  v22.22.3
 Copilot CLI         ✓  copilot version 1.0.0
 SQLite & Database   ✓  C:\Users\A\.cpm\cpm.db
 Credential Store    ✓  Windows Credential Manager
 Configuration       ✓  C:\Users\A\.cpm\config.json

Accounts
────────────────────────────────────────
 Accounts            !  No accounts registered. Run "cpm add" to add an account.

Projects
────────────────────────────────────────
 Projects            ✓  No projects registered (cpm run works in current directory)
```

### 2. Add an Account

Add your GitHub Copilot account using either a Personal Access Token (PAT) or the official GitHub OAuth Device Flow:

```powershell
cpm add
```

Follow the on-screen prompt:
- Choose **GitHub Personal Access Token** to paste an existing token with `copilot` access.
- Choose **GitHub OAuth Device Flow** to authenticate interactively via your browser at `https://github.com/login/device`.

### 3. Launch Copilot

Launch Copilot in the current directory:

```powershell
cpm run
```

Or pass any standard Copilot CLI arguments:

```powershell
cpm run -- explain "what does this script do?"
```

---

## CLI Command Reference

### Accounts Management

| Command | Description |
|---|---|
| `cpm accounts` | List all registered accounts with status, plan, cooldown, and last used time |
| `cpm add` | Add and authenticate a new GitHub account |
| `cpm login [account]` | Re-authenticate an existing account |
| `cpm logout <account>` | Clear stored credentials for an account |
| `cpm remove <account>` | Delete an account registration and associated credentials from CPM |

### Project Management

Register specific folders with preferred accounts:

```powershell
# Register a project
cpm project add QTrade D:\Projects\QTrade

# List registered projects
cpm projects

# Run Copilot directly in project directory with its configured account
cpm run QTrade

# Remove a registered project
cpm project remove QTrade
```

### Diagnostics & Monitoring

| Command | Description |
|---|---|
| `cpm status` | Summary of active accounts, pool availability, and project binding |
| `cpm usage` | Observable token counts and session statistics |
| `cpm doctor` | System, database, credential, and account diagnostics |
| `cpm logs [-n lines]` | Chronological audit log of account selection, switches, and cooldowns |
| `cpm settings [key] [val]` | View or update configuration settings |

### Interactive Dashboard

Launch without arguments to enter the terminal dashboard:

```powershell
cpm
```

```text
╭──────────────────────────────────────────────────────────────╮
│                  COPILOT POOL MANAGER                       │
╰──────────────────────────────────────────────────────────────╯

ACCOUNTS

 ID   ACCOUNT             STATUS       USAGE       LAST USED
 ─────────────────────────────────────────────────────────────
 01   github-user-1       ACTIVE       --          now
 02   github-user-2       READY        --          12 min ago
 03   github-user-3       COOLDOWN     07:32       14 min ago

CURRENT PROJECT

 (No project matched current directory)

ACTIVE ACCOUNT

 #01 github-user-1
 Status: ACTIVE

SYSTEM

 Accounts:       3
 Available:      2
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

---

## Security Architecture

1. **Operating System Credential Storage**: CPM delegates secret storage directly to the Windows Credential Manager. Secrets are never saved to SQLite, never committed to Git, and never written to configuration files.
2. **Log Sanitization**: Every log output, error trace, and subprocess output is filtered through a sanitization pipeline that redacts GitHub tokens (`ghp_*`, `gho_*`, `github_pat_*`) and any known runtime secrets before writing to disk.
3. **Subprocess Isolation**: Authentication tokens are passed exclusively in-memory through the spawned child process's environment variables (`COPILOT_GITHUB_TOKEN`, `GH_TOKEN`). When the process terminates, memory is freed immediately.

---

## Configuration

CPM configuration is stored at `%USERPROFILE%\.cpm\config.json`.

```json
{
  "copilotCommand": "copilot",
  "selectionStrategy": "least-recently-used",
  "automaticSelection": true,
  "respectCooldown": true,
  "usageTracking": true,
  "logging": true,
  "defaultCooldownMinutes": 15
}
```

View or edit settings through the CLI:

```powershell
cpm settings selectionStrategy round-robin
cpm settings defaultCooldownMinutes 20
```

---

## Development & Testing

### Development Mode

Run directly with `tsx` without re-compiling:

```powershell
npm run dev -- status
```

### Running Tests

Execute the complete test suite:

```powershell
npm test
```

### Database Migrations

Generate or inspect SQLite migrations via Drizzle Kit:

```powershell
npm run generate
```

---

## License

MIT
