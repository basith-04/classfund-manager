# Troubleshooting Guide

This guide covers the most common errors you might encounter while deploying or using Class Fund Manager.

## 1. Firebase & Access Errors

### "Permission Denied" or "Missing Permissions"
- **Symptom**: You see a red error toast on the frontend saying "Missing or insufficient permissions."
- **Cause**: The Firestore Security Rules have not been deployed, or your user account does not have the correct role (admin vs student) to perform the action.
- **Fix**:
  1. Run `firebase deploy --only firestore:rules` from the root directory.
  2. If trying to access the admin dashboard, ensure you have run `node set-admin-claim.js` and have logged out and logged back in.

### Admin Claim Missing
- **Symptom**: You ran the setup scripts, but clicking "Admin Dashboard" redirects you back to the student view.
- **Cause**: Firebase caches ID tokens (and custom claims) locally for up to an hour. Your browser is still using the old token from before you ran the setup script.
- **Fix**: Click your profile picture in the top right and click **Logout**. Log back in.

## 2. Backend & Deployment Errors (Render)

### Render Deployment Failures
- **Symptom**: In the Render Dashboard, your build fails with an error like `missing package.json` or `command not found`.
- **Cause**: Render is trying to build the root directory instead of the `functions/` directory.
- **Fix**: Ensure your Render Web Service settings have the **Root Directory** set to `functions`. If you used the Blueprint (`render.yaml`), this is handled automatically.

### Environment Variable Issues
- **Symptom**: The backend logs show `Error: Service account object must contain a string "project_id" property.`
- **Cause**: The `FIREBASE_SERVICE_ACCOUNT` environment variable is malformed.
- **Fix**: Open your `service-account.json` file. Remove *all* line breaks, spaces, and formatting so it becomes a single continuous string. Paste exactly that string into the Render Dashboard.

### 502 Bad Gateway / Connection Refused
- **Symptom**: The frontend fails to fetch data with a `Failed to fetch` or `502 Bad Gateway` error.
- **Cause**: The backend is asleep (cold start) or crashed.
- **Fix**: Wait 30 seconds and refresh the page (if asleep). If it still fails, check the Render logs for crash reports.

## 3. Payment Errors

### Razorpay Signature Verification Failed
- **Symptom**: A student pays successfully on the Razorpay popup, but the website shows "Payment Verification Failed" and their contribution is not recorded.
- **Cause**: Your backend's `RAZORPAY_KEY_SECRET` environment variable is incorrect or missing. The backend relies on this secret to cryptographically verify that the payment was genuinely processed by Razorpay and not forged by a malicious user.
- **Fix**: Verify your Razorpay Secret Key in your backend environment variables (`.env` or Render Dashboard).

### Manual Contribution Errors
- **Symptom**: An admin tries to record a cash contribution but receives an error.
- **Cause**: The student is likely not registered in the system, or the program has been marked as "Completed".
- **Fix**: Ensure the student has logged in at least once (which creates their user profile) and verify that the program's status is still "Active".
