# Razorpay Setup Guide

Class Fund Manager uses [Razorpay](https://razorpay.com/) to process student contributions securely via UPI, NetBanking, Cards, and Wallets.

## 1. Account Creation
1. Go to the [Razorpay Sign Up page](https://dashboard.razorpay.com/signup).
2. Create an account using your email address or Google account.
3. Once logged in, you will be placed in the Razorpay Dashboard.

## 2. Test Mode vs Live Mode
Razorpay operates in two distinct modes, accessible via a toggle switch at the top right of the dashboard:

- **Test Mode**: Active by default. This allows you to simulate payments using fake credit card numbers and UPI IDs provided by Razorpay. No real money changes hands, and you **do not** need to submit business KYC documents to use Test Mode. It is highly recommended to complete your initial deployment and testing in this mode.
- **Live Mode**: Required to collect real money from students. You must complete your KYC (Know Your Customer) and business verification process before Live Mode is activated.

## 3. Generating API Keys
You need two pieces of information to connect your backend to Razorpay: the Key ID and the Key Secret.

1. In the Razorpay Dashboard, navigate to **Account & Settings** -> **API Keys**.
2. Click **Generate Key** (or Generate Test Key if you are in Test Mode).
3. A modal will display your `Key Id` and `Key Secret`.
   - **Important**: The Key Secret is only shown once. Save it securely.

## 4. Required Environment Variables
You must inject these keys into your backend environment (either via the `.env` file locally, or in Render's dashboard for production).

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID (Starts with `rzp_test_` in Test Mode, or `rzp_live_` in Live Mode). This must also be placed in your frontend `dashboard.js` file. |
| `RAZORPAY_KEY_SECRET` | Your private Key Secret used by the backend to verify payment signatures cryptographically. Never expose this to the frontend. |

## 5. Live Mode Business Verification
To accept real payments, Razorpay requires compliance with Indian financial regulations. You must provide:
- A bank account in your name (or your organization's name).
- PAN Card details.
- A functional website URL (your deployed Firebase Hosting URL).

### Required Website Pages
Razorpay will manually review your website before approving Live Mode. Your website **must** contain links to the following pages in the footer:
- **Privacy Policy**
- **Terms & Conditions**
- **Refund & Cancellation Policy**
- **Contact Us**

*Class Fund Manager includes templates for these pages out of the box. Ensure you update the placeholder text (e.g., `[Your Organization Name]`) with your actual details before submitting your website for Razorpay review.*

## 6. Common Approval Issues
- **Missing Footer Links**: Ensure the legal links in your footer are clearly visible and navigate to the correct pages.
- **Incomplete Contact Details**: Razorpay requires a valid email address and phone number on the Contact Us page.
- **Vague Purpose**: Ensure your website clearly explains what the funds are being collected for (e.g., "Class of 2026 Graduation Fund"). Razorpay rejects generic payment collection sites to prevent fraud.
