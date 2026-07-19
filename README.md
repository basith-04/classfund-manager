# Class Fund Manager

A lightweight payment and transparency platform built for managing class fund contributions in a 63-student college class.

The application was created to replace manual cash collection, reduce confusion around payment status, and provide complete visibility into how class funds are collected and spent.

More than 60 students have successfully contributed through the platform.

---

## The Problem

Managing a class fund manually creates several issues:

* Students forget whether they have paid
* The class representative must track payments manually
* Fund balances are difficult to verify
* Expense records are scattered across chats and spreadsheets
* Transparency is limited

This project centralizes the entire process into a single web application where students can contribute, verify payments, and view fund usage.

---

## Features

### Student Portal

* Secure login using Firebase Authentication
* Roll-number-based identity system
* View current class fund balance
* View recorded expenses
* Make the fixed ₹20 class contribution through Razorpay
* View personal payment status

### Admin Portal

* View payment status of all students
* View transaction history
* Monitor overall fund collection
* Read-only transaction visibility
* Access restricted to the designated admin account

---

## Tech Stack

| Layer          | Technology                    |
| -------------- | ----------------------------- |
| Frontend       | HTML, CSS, Vanilla JavaScript |
| Authentication | Firebase Authentication       |
| Database       | Cloud Firestore               |
| Payments       | Razorpay Payment Button       |
| Backend        | Firebase Cloud Functions      |
| Hosting        | Firebase Hosting              |

---

## Why Razorpay Payment Button (not the full API)

Razorpay's standard API (Checkout + Orders API) requires a business account and formal verification — not practical for a class project. The **Razorpay Payment Button** is available to anyone with a basic Razorpay account, created directly from the dashboard with no approval process.

This project is built around that constraint: the frontend embeds a Payment Button, and a Cloud Function webhook handles settlement on the backend. No Razorpay API keys are needed anywhere in the codebase.

---

## Architecture

```
Student
   │
   ▼
Firebase Auth (roll-number-based login)
   │
   ▼
Frontend (HTML/CSS/JS)
   │
   ├── Firestore Reads (balance, expenses, payment status)
   │
   └── Razorpay Payment Button (embedded in dashboard)
           │
           ▼
       Razorpay handles the entire checkout flow
           │  student's roll number is passed as a Note on the button
           ▼
   Webhook → POST /razory-pay (Cloud Function)
           │
           ▼
   HMAC-SHA256 signature verified
           │
           ▼
   Firestore transaction:
   - writes transaction doc
   - increments user.totalPaid
   (idempotent — replaying the same event is safe)
```

---

## Payment Flow

1. Student logs in and clicks **Pay** on the dashboard
2. The embedded Razorpay Payment Button opens Razorpay's hosted checkout
3. Student completes the payment on Razorpay's side
4. Razorpay fires a `payment.captured` webhook to the Cloud Function
5. The Cloud Function verifies the request signature, then updates Firestore atomically

No payment data passes through the frontend after the button is clicked — Razorpay handles everything and notifies the backend directly.

---

## Security Model

### Authentication

Students authenticate through Firebase Authentication using a roll-number-based email pattern:

```
22bcs001@cseb.com
```

### Webhook Security

Every incoming webhook request is verified using HMAC-SHA256 against the raw request body before any processing. Requests with a missing or mismatched `X-Razorpay-Signature` header are rejected immediately.

### Idempotency

The webhook handler checks whether a payment has already been settled before writing to Firestore. Re-delivering the same event is safe and produces no duplicate records.

### Firestore Access

* Students can only read data required for the application flow
* Transaction records cannot be modified from the client
* Administrative views are restricted to:

```
admin@cseb.com
```

---

## Data Model

### users

```javascript
{
  uid,
  rollNo,    // Number — must match the roll_no Note set on the Payment Button
  name,
  totalPaid  // Incremented by the webhook on each successful payment
}
```

### expenses

```javascript
{
  title,
  amount,
  description,
  createdAt
}
```

### transactions

```javascript
{
  orderId,
  paymentId,
  rollNo,
  amount,
  status,    // "success"
  source,    // "webhook"
  createdAt,
  updatedAt
}
```

---

## Project Structure

```
public/
├── index.html
├── dashboard.html          ← Razorpay Payment Button lives here
├── admin/
│   ├── adminDashboard.html
│   ├── transactions.html
│   └── scripts/
│       ├── adminDashboard.js
│       └── transactions.js
├── js/
│   ├── pages/
│   │   ├── dashboard.js
│   │   └── login.js
│   ├── services/
│   │   ├── firebase.js
│   │   ├── balance.js
│   │   ├── expense.js
│   │   └── users.js
│   └── utils/
│       ├── navigations.js
│       └── startMusic.js
└── styles/

functions/
├── index.js     ← Webhook handler (POST /razory-pay)
└── package.json
```

---

## Setup Guide

### Prerequisites

* Node.js
* Firebase CLI (`npm install -g firebase-tools`)
* A Firebase project
* A Razorpay account (free, no business verification needed)

### 1. Clone the repo

```bash
git clone <repository-url>
cd class-fund-manager
```

### 2. Install Cloud Functions dependencies

```bash
cd functions
npm install
```

### 3. Configure Firebase

Add your Firebase project config to `public/js/services/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ...
};
```

### 4. Create a Razorpay Payment Button

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Payment Buttons** → **Create Button**
3. Set the amount to ₹20 (or your fixed contribution amount)
4. Under **Notes**, add a field named `roll_no` — this is how the webhook identifies which student paid
5. Copy the generated `data-payment_button_id`
6. Paste it into `public/dashboard.html`:

```html
<form>
  <script
    src="https://checkout.razorpay.com/v1/payment-button.js"
    data-payment_button_id="YOUR_BUTTON_ID"
    async>
  </script>
</form>
```

### 5. Register the webhook

1. In the Razorpay Dashboard, go to **Settings → Webhooks → Add New Webhook**
2. Set the URL to your deployed Cloud Function:
   ```
   https://<region>-<project>.cloudfunctions.net/api/razory-pay
   ```
3. Subscribe to the `payment.captured` event
4. Copy the **Webhook Secret** Razorpay generates

### 6. Configure the webhook secret

For local development, create `functions/.env`:

```env
RAZORPAY_WEBHOOK_SECRET=your_secret_here
```

For production:

```bash
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

### 7. Run locally

```bash
firebase emulators:start
```

> **Webhook testing:** Razorpay needs to reach your local machine to deliver webhook events. Use [ngrok](https://ngrok.com) to expose your local emulator and temporarily update the webhook URL in the Razorpay dashboard to the ngrok tunnel URL.

### 8. Deploy

```bash
firebase deploy
```

---

## Design Decisions

### Vanilla JavaScript

The project intentionally avoids frontend frameworks. For a small internal tool this means faster development, no build pipeline, minimal dependencies, and easier long-term maintenance.

### Firebase

Firebase provides authentication, database, hosting, and serverless compute without requiring any server management.

### Fixed Contribution Amount

The ₹20 amount is configured on the Payment Button in the Razorpay dashboard, not in frontend code. This means the amount cannot be tampered with from the browser.

---

## Future Improvements

- Enhanced admin panel with additional management features
- Audit logs for administrative actions and expense tracking
- Analytics dashboard with contribution and expense insights
- Improved mobile responsiveness across devices
- Automated contribution reminders for pending payments

---

## Lessons Learned

* Cloud Functions and serverless architecture
* Integrating a payment gateway without API key access
* HMAC-based webhook signature verification
* Idempotent transaction handling in Firestore
* Deploying production applications on Firebase

---

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push and open a Pull Request

Please keep contributions focused, well-documented, and aligned with the project's scope.

---

## Disclaimer

This project was built for a private college class and is not intended to operate as a public payment platform.

---

## License

MIT License. Feel free to use, modify, and learn from this project.
