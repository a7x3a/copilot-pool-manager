# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

Security is a foundational tenet of Copilot Pool Manager. If you discover a vulnerability or potential credential exposure:

1. **Do NOT open a public issue.**
2. Send an email to the repository maintainer or use GitHub Security Advisories (`Security` tab -> `Report a vulnerability`).
3. Include details on reproduction steps, affected environment, and impact.
4. Maintainers will acknowledge reports within 48 hours and work on a fix promptly.

---

## Security Architecture Principles

- **Zero Plaintext Credentials**: Credentials are encrypted at rest using OS-level secure storage (Windows Credential Manager via native Win32 APIs) or AES-256-GCM encrypted vaults with restricted file permissions.
- **AMSI & Antivirus Safety**: CPM never executes dynamic PowerShell scripts or reflection patterns (`Add-Type`) that trigger false positives or AMSI heuristics.
- **Log Redaction**: Subprocess outputs and diagnostic logs are automatically sanitized to strip personal access tokens (`ghp_*`, `gho_*`, `github_pat_*`) and known secrets before writing to disk.
