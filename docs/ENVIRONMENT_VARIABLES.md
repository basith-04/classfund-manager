# Environment Variables Reference

Class Fund Manager relies on several environment variables and configuration objects across both the frontend and backend. This guide details every required variable to ensure a successful deployment.

## Backend Variables (`functions/.env`)

These variables are required for the Node.js Express server to function. They must be set in your `.env` file locally, or in your hosting provider's dashboard (e.g., Render) for production.

| Variable | Required? | Description |
|----------|-----------|-------------|
| `PORT` | Optional | The port the Express server will listen on. Defaults to `3000` if not set. Hosting providers like Render will set this automatically. |
| `RAZORPAY_KEY_ID` | **Yes** | Your Razorpay API Key ID. Starts with `rzp_test_` or `rzp_live_`. |
| `RAZORPAY_KEY_SECRET` | **Yes** | Your Razorpay API Key Secret. Used for signature verification. **Never share this.** |
| `FIREBASE_SERVICE_ACCOUNT`| **Yes** | The full JSON string of your Firebase Service Account key. Must be minified (no line breaks) when used in production hosting dashboards. |

## Frontend Configuration (`public/js/services/firebase-config.js`)

The frontend requires the Firebase Configuration Object. This is not a traditional `.env` file, but rather a JavaScript object exported to the application. 

You can find these values in the Firebase Console under **Project Settings**.

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

*Note: It is safe for these variables to be public in your compiled frontend code. Firebase secures your data using Security Rules, not by hiding the API key.*

## Frontend Global Constants

In addition to Firebase, the frontend needs to know where your backend and payment provider are located. These must be updated in specific JavaScript files before deployment.

### `public/js/pages/dashboard.js`
- `BACKEND_URL`: Set this to your deployed backend URL (e.g., `https://classfund-backend.onrender.com`). Use `http://localhost:3000` for local development.
- `options.key`: Inside the `startRazorpay` function, set this to your `RAZORPAY_KEY_ID`.

### `public/admin/scripts/programDashboard.js`
- `BACKEND_URL`: Set this to your deployed backend URL.

## Security Reminder

1. **Never commit `.env` files** to your repository.
2. **Never expose `RAZORPAY_KEY_SECRET`** to the frontend code.
3. **Never commit `service-account.json`** to your repository. 
