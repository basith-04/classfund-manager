# Security Policy

Security is a primary priority for Class Fund Manager, as it deals directly with financial ledgers, student data, and payment processing. This document outlines our security policies and disclosure process.

## 1. Supported Versions

Only the latest release (`main` branch) is officially supported with security updates. If you have deployed an older version, we strongly recommend pulling the latest changes regularly.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## 2. Responsible Disclosure

If you discover a security vulnerability in this repository, **do NOT open a public issue.** 

We take vulnerabilities seriously and will work with you to resolve them quickly. Please report any potential security issues via email to:

**classfundmanager@gmail.com**

Please include the following in your report:
- A clear description of the vulnerability.
- Step-by-step instructions to reproduce it.
- The potential impact on users or the system.
- Suggested mitigations or fixes (if you have them).

### Response Timeline
- **Acknowledgment**: Within 48 hours.
- **Assessment**: Within 7 days.
- **Fix/Patch Release**: As soon as reasonably possible, prioritized by severity.

## 3. Secret Management & Environment Variables

Deployers and contributors **must** adhere to strict secret management policies:

1. **Never commit `.env` files**: Ensure `.env` remains in your `.gitignore` file.
2. **Never expose Backend Secrets to the Frontend**: Your `RAZORPAY_KEY_SECRET` must only live in your backend environment (Render or `.env`). Exposing this secret to the frontend compromises the cryptographic integrity of the payment system.

## 4. Service Account Security

Your Firebase Service Account JSON file grants **full, unrestricted read/write access** to your entire Firestore database, bypassing all Security Rules.

- **Never commit `service-account.json`**: This file is explicitly ignored in the repository's `.gitignore`. Do not override this.
- **Production Usage**: In production (e.g., Render), inject the service account as a minified string via the `FIREBASE_SERVICE_ACCOUNT` environment variable. Delete any local copies on your machine that are no longer needed.
- **Rotation**: If you suspect your Service Account key has been leaked, immediately delete it from the Firebase Console and generate a new one.

## 5. Dependency Update Policy

We strive to keep dependencies up to date to minimize vulnerabilities (e.g., via Dependabot). 

- Minor version bumps for dependencies are merged regularly.
- Critical vulnerabilities in transitive dependencies (e.g., npm audit warnings) are addressed promptly via `overrides` or direct package upgrades.

## 6. Security Checklist For Deployers

If you are deploying your own instance of Class Fund Manager, review this checklist before going live:

- [ ] I have not committed any `.env` or `service-account.json` files to my public repository.
- [ ] I have deployed `firestore.rules` to my Firebase project to secure the database.
- [ ] I have changed the default admin password (`admin123`) immediately after running the seed script.
- [ ] I have enabled Two-Factor Authentication (2FA) on my GitHub, Firebase, and Razorpay accounts.
- [ ] I have set up branch protection on my `main` branch to prevent unauthorized code pushes.
- [ ] I have verified that my Render Web Service correctly handles the `FIREBASE_SERVICE_ACCOUNT` and `RAZORPAY_KEY_SECRET` exclusively as secure environment variables.
