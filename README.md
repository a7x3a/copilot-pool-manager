# Copilot Pool Manager (CPM) 🚀

> **Never get stopped by rate limits again.** Pool, rotate, and automatically switch between multiple authorized GitHub Copilot accounts right from your Windows terminal.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6.svg)](https://microsoft.com)

---

## ⚡ 30-Second Quick Start

### 1. Install & Link Globally
```powershell
git clone https://github.com/a7x3a/copilot-pool-manager.git
cd copilot-pool-manager
npm install
npm run build
npm link
```

### 2. Run the Setup Wizard
```powershell
cpm setup
```
Follow the interactive wizard:
* Choose how many accounts to pool (e.g. 2 or 3).
* Authenticate each account with either a **Personal Access Token** or via your browser (**Device Flow**).

### 3. Start Coding!
```powershell
cpm run
```
CPM automatically picks the best available account and starts Copilot CLI.

---

## 🖥️ Terminal Dashboard

Just type `cpm` from any terminal:

```powershell
cpm
```

```text
╭──────────────────────────────────────────────────────────────╮
│                  COPILOT POOL MANAGER                       │
╰──────────────────────────────────────────────────────────────╯

ACCOUNTS POOL

 ID   ACCOUNT             STATUS       USAGE       LAST USED
 ─────────────────────────────────────────────────────────────
 01   work-user           ACTIVE       --          now
 02   personal-user       READY        --          12 min ago
 03   backup-user         COOLDOWN     08:15       25 min ago

CURRENT PROJECT
 QTrade (D:\Projects\QTrade)

ACTIVE ACCOUNT
 #01 work-user (ACTIVE)

ACTIONS / COMMANDS
  [1] Run Copilot           (/run)
  [2] Accounts Pool         (/accounts)
  [3] Switch Account        (/switch)
  [4] Usage & Limits        (/usage)
  [5] Projects              (/projects)
  [6] Health Doctor         (/doctor)
  [7] Logs & Events         (/logs)
  [8] Setup Wizard          (/setup)
  [Q] Quit                  (/quit)
```

---

## ⌨️ Command Cheatsheet

| Command | What it does |
|---|---|
| `cpm` | Opens the interactive visual dashboard |
| `cpm setup` | First-time setup wizard to connect accounts |
| `cpm run` | Launches official Copilot CLI with the active account |
| `cpm run <project>` | Jumps to a project folder and runs Copilot |
| `cpm switch` | Interactively switch your active account |
| `cpm switch <id>` | Instantly switch to a specific account (e.g. `cpm switch 02`) |
| `cpm ide code .` | Launches **VS Code** with the active Copilot account |
| `cpm ide cursor .` | Launches **Cursor** with the active Copilot account |
| `cpm doctor` | Self-diagnostic check (Node, Copilot CLI, Windows Vault, DB) |
| `cpm accounts` | Lists all accounts, statuses, and cooldowns |
| `cpm project add` | Saves a folder as a named project |
| `cpm usage` | Shows observed token counts & sessions |

---

## 💻 IDE Integration (VS Code, Cursor, JetBrains)

CPM can launch your favorite IDE with the pooled Copilot token automatically injected:

```powershell
# Open VS Code
cpm ide code .

# Open Cursor
cpm ide cursor .

# Open Windsurf
cpm ide windsurf .
```

Or export the token into your current PowerShell session:
```powershell
cpm env powershell
```

---

## 🔄 Automatic Rate-Limit Switching

You don't have to worry about running into rate limits:

1. **Detection**: If GitHub returns a rate limit (HTTP 429), CPM puts that account on a temporary cooldown (e.g. 15 minutes).
2. **Auto-Switch**: CPM immediately switches to your next available, healthy account.
3. **Recovery**: When the cooldown timer reaches zero, the account becomes `READY` again automatically.

---

## 🔒 Security & Antivirus Safe

* **Windows Credential Manager**: Tokens are stored securely in Windows' built-in OS vault via native Win32 C APIs (`CredReadW` / `CredWriteW`). No plaintext passwords in files or databases.
* **AMSI Safe**: Never executes suspicious PowerShell one-liners or dynamic in-memory crypto (`Add-Type`). 100% clean with Windows Defender.
* **Redacted Logs**: Secrets and token patterns (`ghp_*`, `gho_*`, `github_pat_*`) are automatically stripped before writing to any log.

---

## 🧪 Testing

Run the full test suite with Vitest:

```powershell
npm test
```

---

## 📄 License

[MIT](LICENSE) © 2026 Copilot Pool Manager Contributors
