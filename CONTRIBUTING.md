# Contributing to Copilot Pool Manager (CPM)

Thank you for your interest in contributing to CPM! We welcome community contributions, bug reports, and suggestions.

---

## Code of Conduct

Please be respectful and constructive in all issues, pull requests, and discussions.

---

## Development Setup

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9+
- **Git**
- **Windows 10/11** (recommended for full Credential Manager testing, or Linux/macOS using the secure encrypted store)

### 2. Fork and Clone

```bash
git clone https://github.com/your-username/copilot-pool-manager.git
cd copilot-pool-manager
npm install
```

### 3. Local Development

You can run CPM directly from source without rebuilding:

```bash
npm run dev -- doctor
npm run dev -- status
```

### 4. Build and Test

Before submitting a Pull Request, ensure that all tests pass and TypeScript compiles cleanly:

```bash
# Compile TypeScript
npm run build

# Run Vitest test suite
npm test
```

---

## Pull Request Guidelines

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. **Never log or commit credentials**:
   All new features must sanitize outputs and respect the `CredentialStore` design.
3. **Write Unit Tests**:
   Add test coverage in the `tests/` directory for any new logic.
4. **Adhere to Code Style**:
   Keep code typed strictly and avoid runtime dynamic reflection or inline shell scripts.
5. **Open a PR**:
   Provide a concise description of the motivation and test results in the pull request description.
