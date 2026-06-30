# GitHub Actions Keep-Awake Workflow

If you deploy your backend to the Render Free Tier, your service will automatically spin down (sleep) after 15 minutes of inactivity. To mitigate the resulting "cold starts" for your users, this repository includes a GitHub Actions workflow: `.github/workflows/keep-awake.yml`.

## What It Does
The Keep-Awake workflow is an automated script that runs on GitHub's servers every 10 minutes. It sends a simple HTTP `GET` request (a "ping") to your backend's `/hello` endpoint. 

## How It Works
Because the backend receives a request every 10 minutes, the 15-minute inactivity timer on Render is continuously reset. This significantly reduces the chances of your backend going to sleep during the day.

To enable it:
1. Open `.github/workflows/keep-awake.yml` in your repository.
2. Replace `YOUR_BACKEND_URL` with your actual Render URL (e.g., `https://classfund-backend.onrender.com`).
3. Commit and push the changes.
4. Go to the **Actions** tab in your GitHub repository and ensure workflows are enabled.

## Limitations

> [!WARNING]  
> This workflow does **NOT** guarantee 100% uptime. It is a helpful workaround, not a silver bullet.

You must understand the following limitations before relying on this for critical production usage:

1. **GitHub Actions Can Fail/Delay**: GitHub Actions free tier may queue your scheduled tasks during peak hours. If the queue delays the ping by more than 15 minutes, your Render service *will* go to sleep.
2. **Render Monthly Limits**: Render provides 500 free hours per month. If you keep the service awake 24/7 (which requires ~730 hours/month), you **will run out of free hours** before the end of the month, and your service will be suspended until the next billing cycle.
3. **Render Policy Changes**: Free tier policies change frequently. Render may implement strict sleeping policies that ignore automated pings.

## Alternative Solutions

If your class or organization requires reliable, instant performance without cold starts or month-end suspensions, consider the following alternatives:

- **Render Paid Plan**: Upgrade your Web Service on Render to the "Starter" plan ($7/month). This completely removes the sleep limitation.
- **Railway / Fly.io**: Explore other platform-as-a-service providers that may have different free tier structures, though most have implemented similar sleep policies.
- **Self-Hosting**: If your university provides free Linux servers to student clubs, you can easily host the Node.js backend there using PM2 or Docker.
