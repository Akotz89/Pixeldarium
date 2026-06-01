# Security Policy

## Scope

PixelSim is a client-side browser application with no server component.
It runs entirely in the user's browser and stores data only in local
IndexedDB. There is no backend, no authentication, and no network requests.

## Reporting a Vulnerability

If you discover a security issue (e.g., XSS via save file injection,
prototype pollution), please report it responsibly:

1. **Do not open a public issue**
2. Email: [use GitHub private vulnerability reporting](https://github.com/Akotz89/PixelSim/security/advisories/new)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment

## Response

- We will acknowledge receipt within 48 hours
- We aim to provide a fix or mitigation within 7 days
- Credit will be given in the fix commit unless you prefer anonymity

## Known Constraints

- Save files are user-controlled JSON — the game does not sanitize
  save data against malicious payloads. Only load saves you trust.
- The application uses `eval`-free code, but IndexedDB data is
  consumed without validation in persistence.js.
