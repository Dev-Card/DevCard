# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅        |

## Reporting a Vulnerability

Please report via **GitHub Private Security Advisory**:
[Report here](https://github.com/Dev-Card/DevCard/security/advisories/new)

**Do NOT open a public issue for security vulnerabilities.**

### What to include in your report:
- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fix (optional but appreciated)

## Response Timeline

- Acknowledgement: within 48–72 hours
- Status update: within 7 days
- Patch / fix release: within 30 days

## In Scope
- Authentication bypass
- Sensitive data exposure via API endpoints
- XSS in profile/card rendering
- Unauthorized access to user contact data

## Out of Scope
- Rate limiting / brute force without impact
- Spam or social engineering
- Issues in third-party dependencies (report upstream)

## Responsible Disclosure

Please give us adequate time to patch the issue before any public disclosure.
We deeply appreciate security researchers who help keep **DevCard** safe. 🙏

## Acknowledgements

Responsible reporters will be credited in release notes (with permission).

## References
- [GitHub Security Advisories Docs](https://docs.github.com/en/code-security/security-advisories)
- [Adding a Security Policy](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)