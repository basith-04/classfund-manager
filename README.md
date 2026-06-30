# Class Fund Manager

A transparent, open-source payment and fund management platform built for managing class contributions in educational institutions. 

This platform allows non-technical class representatives, college clubs, and student organizations to collect and manage funds transparently, securely, and **100% for free**.

---

## 🌟 Features

### Student Features
- Secure login using Firebase Authentication.
- View current fund balance and program details transparently.
- Make contributions through Razorpay (UPI, Cards, NetBanking).
- View personal payment history and transaction status.
- Change email and password after the first login.

### Admin Features
- Create and manage distinct fund collection programs (e.g., "Graduation Party", "Exam Fees").
- Record manual contributions (cash, direct UPI, bank transfer) to maintain an accurate ledger.
- Log and categorize expenses to maintain full transparency.
- Complete programs when finished to freeze the ledger.
- Exempt specific students from individual programs.

### Financial & Security Features
- Real-time financial dashboards per program.
- Full, immutable audit trail of all transactions and expenses.
- Role-based authorization using Firebase Custom Claims.
- Server-side Razorpay signature verification to prevent payment forgery.

---

## 🏗 Architecture Overview

Class Fund Manager uses a modern, decoupled, and free-tier-friendly architecture:

- **Frontend**: [Firebase Hosting] - Static HTML, CSS, JS interacting directly with Firestore.
- **Backend**: [Render.com] - Node.js Express server handling secure payment verifications and atomic ledger updates.
- **Database**: [Cloud Firestore] - Real-time NoSQL database.
- **Authentication**: [Firebase Auth] - Secure identity management.
- **Payments**: [Razorpay] - Payment gateway processing.

Read the full [Architecture Guide](docs/ARCHITECTURE.md).

---

## 🚀 Quick Start: 10-Minute Deployment

You can deploy your own instance of Class Fund Manager completely for free.

1. **Fork this repository** to your own GitHub account.
2. **Create a Firebase Project** (Spark Plan - Free) and configure your frontend. See [Firebase Setup](docs/FIREBASE_SETUP.md).
3. **Create a Razorpay Account** and generate your Test Keys. See [Razorpay Setup](docs/RAZORPAY_SETUP.md).
4. **Deploy the Backend** to Render using the included `render.yaml` Blueprint. See [Render Deployment](docs/RENDER_DEPLOYMENT.md).
5. **Configure Environment Variables** in the Render Dashboard and your frontend JS files. See [Environment Variables](docs/ENVIRONMENT_VARIABLES.md).
6. **Create your Admin Account** to access the dashboard. See [Admin Setup](docs/ADMIN_SETUP.md).
7. **Go Live!** 

---

## 📚 Documentation Index

For detailed instructions, limitations, and contributor guidelines, refer to the full documentation:

### Deployment & Setup
- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [Razorpay Setup Guide](docs/RAZORPAY_SETUP.md)
- [Render Deployment Guide](docs/RENDER_DEPLOYMENT.md)
- [Admin Setup & Usage Guide](docs/ADMIN_SETUP.md)
- [Environment Variables Reference](docs/ENVIRONMENT_VARIABLES.md)

### Operations & Maintenance
- [Free Tier Limitations](docs/FREE_TIER_LIMITATIONS.md)
- [GitHub Actions Keep-Awake](docs/GITHUB_ACTIONS_KEEP_AWAKE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

### Community & Policies
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License (MIT)](LICENSE)

---

## Contact
For questions or support: classfundmanager@gmail.com
