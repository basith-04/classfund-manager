# Contributing to Class Fund Manager

First off, thank you for considering contributing to Class Fund Manager! It's people like you that make open-source software a reality. This document provides guidelines to ensure a smooth contribution process.

## 1. Local Development Setup

To run the project locally for development:

1. **Fork and Clone**:
   ```bash
   git clone <your-fork-url>
   cd classfund-manager
   ```
2. **Setup Backend**:
   Navigate to the `functions/` directory, install dependencies, and configure your `.env` file.
   ```bash
   cd functions
   npm install
   cp .env.example .env
   # Add your Razorpay test keys and Firebase Service Account JSON
   ```
3. **Setup Frontend**:
   Configure your Firebase connection variables.
   ```bash
   cd public/js/services
   cp firebase-config.example.js firebase-config.js
   # Paste your Firebase config object here
   ```
4. **Run the Servers**:
   Run the backend and frontend simultaneously.
   ```bash
   # Terminal 1: Backend
   cd functions
   node index.js
   
   # Terminal 2: Frontend
   # From the project root
   firebase serve --only hosting
   ```

## 2. Branch Naming Conventions

Please create a new branch for your work from `main`. Use the following prefixes to categorize your branch:

- `feature/` - For new features or enhancements (e.g., `feature/export-csv-function`).
- `fix/` - For bug fixes (e.g., `fix/razorpay-signature-validation`).
- `docs/` - For documentation updates (e.g., `docs/update-readme`).
- `chore/` - For maintenance tasks, dependency updates, or refactoring.

## 3. Coding Standards

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, and CSS3. Avoid adding heavyweight frameworks unless absolutely necessary for a major feature. Keep logic modular in `public/js/`.
- **Backend**: Node.js (Express). Keep routes clean and delegate complex business logic to the `services/` directory.
- **Formatting**: Use consistent indentation (2 spaces). Leave meaningful comments for complex asynchronous logic or transaction blocks.

## 4. Commit Standards

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Please ensure your commit messages follow this format:

- `feat: add PDF export to transactions`
- `fix: resolve overdraft bug in expenses`
- `docs: update setup guide for Razorpay`
- `style: fix CSS alignment in dashboard`
- `refactor: clean up accounting service`

## 5. Testing Requirements

- **Local Testing**: Before opening a PR, ensure your changes work locally. Test both the "happy path" and potential failure states (e.g., simulating a failed Razorpay payment).
- **Security Rules**: If you change how data is stored or accessed, ensure `firestore.rules` is updated and tested. Do not open read/write access globally.

## 6. Pull Request Checklist

When submitting a Pull Request, ensure you have:
- [ ] Created your branch from `main`.
- [ ] Followed the branch naming conventions.
- [ ] Used Conventional Commits format.
- [ ] Tested your changes locally.
- [ ] Checked for console errors or broken UI layouts.
- [ ] Updated any relevant documentation in the `docs/` directory.

## 7. Good First Issues

If you are new to the project or to open-source in general, check the **Issues** tab and filter by the `good first issue` label. These are typically smaller UI tweaks or documentation fixes designed to help you get familiar with the codebase.

## 8. Reporting Bugs

If you find a bug:
1. Check existing issues to avoid duplicates.
2. Open a new issue with the `bug` label.
3. Include clear steps to reproduce, expected behavior, actual behavior, and screenshots if applicable.

**Note**: If you discover a security vulnerability, please refer to our [Security Policy](SECURITY.md) and do **NOT** open a public issue.
