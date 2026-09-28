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
The wizard will ask you how many accounts to pool. Simply paste each account's **GitHub Copilot Token / API Key** (no OAuth or browser logins needed).

> **How to get your API key / token:**
> 1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
> 2. Click **Generate new token (classic)**
> 3. Select the `copilot` and `repo` scopes
> 4. Copy the generated token (`ghp_...`) and paste it into CPM.

### 3. Open VS Code with Your Active Account
```powershell
cpm code .
```
CPM injects your authenticated Copilot session and launches VS Code!

---

## 💻 VS Code & Cursor Integration

CPM makes it effortless to launch your editor with the active pooled Copilot account:

```powershell
# Open VS Code in current directory
cpm code .

# Open Cursor in current directory
cpm cursor .

# Or launch any custom editor
cpm ide windsurf .
cpm ide nvim .
```

### How `cpm code .` works:
1. CPM checks your account pool and picks the best available account (skipping any in cooldown).
2. It retrieves the API key securely from **Windows Credential Manager**.
3. It spawns VS Code passing `COPILOT_GITHUB_TOKEN` directly into VS Code's environment.
4. VS Code's Copilot extension automatically authenticates with that account!

---

## 🖥️ Terminal Dashboard

Type `cpm` from any terminal to open the live visual dashboard:

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
 MyProject (C:\Projects\MyProject)

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

You can press **1-8** or type slash commands like **`/switch`**, **`/run`**, **`/doctor`**, or **`/usage`**.

---

## ⌨️ Command Cheatsheet

| Command | What it does |
|---|---|
| `cpm code .` | Launches **VS Code** with the active Copilot account |
| `cpm cursor .` | Launches **Cursor** with the active Copilot account |
| `cpm` | Opens the interactive visual dashboard |
| `cpm setup` | First-time setup wizard to connect account API keys |
| `cpm switch` | Interactively switch your active account |
| `cpm switch <id>` | Instantly switch to an account (e.g. `cpm switch 02`) |
| `cpm doctor` | Self-diagnostic check (Node, Windows Vault, DB) |
| `cpm accounts` | Lists all accounts, statuses, and cooldowns |
| `cpm run` | Launches official Copilot CLI in your terminal |
| `cpm run <project>` | Jumps to a project folder and runs Copilot |
| `cpm project add` | Saves a folder as a named project |
| `cpm usage` | Shows observed token counts & sessions |

---

## 🛠️ Optional: Using Copilot in Terminal (`cpm run`)

If you want to use Copilot directly in your terminal via `cpm run`, install the official GitHub Copilot CLI extension:

```powershell
# 1. Install GitHub CLI (if you don't have it)
winget install --id GitHub.cli

# 2. Install Copilot extension
gh extension install github/gh-copilot
```

*(Note: If you only code inside VS Code with `cpm code .`, you do not need to install the terminal CLI!)*

---

## 🔄 Automatic Rate-Limit Switching

Never worry about rate limits interrupting your workflow:

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

[MIT](LICENSE) © 2026 Ahmad
