# Render Deployment Guide

This guide explains how to deploy the Class Fund Manager backend to Render.com using the included `render.yaml` Blueprint.

## 1. Deploy From GitHub Using Blueprint

The easiest way to deploy is by using the Render Blueprint. This automatically configures your build and start commands.

1. Create a free account on [Render.com](https://render.com).
2. Go to your Dashboard and click **New** -> **Blueprint**.
3. Connect your GitHub account and select your `classfund-manager` fork.
4. Render will automatically detect the `render.yaml` file in the root directory.
5. Provide a name for your service (e.g., `classfund-backend`).
6. Click **Apply**.

## 2. Environment Variables

During the initial deployment or immediately after, you **must** configure your environment variables. 
In the Render Dashboard, go to your newly created Web Service, click **Environment**, and add the following variables:

### Backend Variables
These are required for the Node.js backend to connect to external services.

- `RAZORPAY_KEY_ID`: Your Razorpay Key ID (Start with the Test Mode key: `rzp_test_...`).
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret.
- `FIREBASE_SERVICE_ACCOUNT`: The **minified JSON string** of your Firebase Service Account key. 
  - *Tip: Open your `service-account.json`, minify it (remove all line breaks and spaces between keys), and paste it directly into Render.*

## 3. Updating Deployments

By default, Render is configured to automatically deploy whenever you push changes to your `main` branch. 
- If you make a change to the backend code, simply `git push` to `main`, and Render will build and deploy the new version.
- You can disable **Auto-Deploy** in your Web Service settings if you prefer manual deployments.

## 4. Logs and Troubleshooting

- **Logs**: View live application logs directly in the Render Dashboard under the **Logs** tab of your Web Service. This is where you will see any API errors or `console.log` output.
- **Port Binding**: The `render.yaml` uses `node index.js`. Express automatically binds to the `$PORT` environment variable provided by Render.
- **Service Fails to Start**: If the service crashes on startup, check your logs. The most common cause is a malformed `FIREBASE_SERVICE_ACCOUNT` string (e.g., missing quotes or incorrect minification).

## 5. Health Check

Render health checks will repeatedly call the following endpoint to verify the service is running correctly:

**GET /health**

Response:
```json
{
  "status": "ok"
}
```

---

> [!WARNING]  
> If you are on the Render Free Tier, your backend will sleep after a period of inactivity. Read the [Free Tier Limitations](FREE_TIER_LIMITATIONS.md) and [Keep Awake Action](GITHUB_ACTIONS_KEEP_AWAKE.md) guides for more information.
