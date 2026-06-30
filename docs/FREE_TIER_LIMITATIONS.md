# Free Tier Limitations

Class Fund Manager is designed to be hosted entirely on free-tier services. However, it is important to understand the limitations of these free services so you can set expectations for your users and administrators.

## 1. Render Free Tier (Backend)

The backend Express application is hosted on Render's Free Web Service tier.

- **Inactivity Sleeping**: Render will spin down (put to sleep) your free web service after **15 minutes of inactivity**. 
- **Cold Starts**: When a user attempts to make a payment or fetch data while the service is asleep, they will experience a **cold start**. This means the backend will take a few seconds (usually 10-30 seconds) to boot up before it can respond to the request. Users might experience a short loading delay on their first interaction.
- **Monthly Hours**: Render provides a specific amount of free usage hours per month (typically 500 hours across all free services on your account). If you exceed this, your service will be suspended until the next billing cycle.

*Workaround*: We provide a [GitHub Actions Keep-Awake](GITHUB_ACTIONS_KEEP_AWAKE.md) workflow to periodically ping the service and minimize sleeping, though it does not eliminate cold starts entirely.

## 2. Firebase Spark Plan (Frontend, Auth, Database)

The frontend hosting, user authentication, and Firestore database run on the Firebase Spark Plan (100% Free, no credit card required).

- **Authentication Limits**: 
  - 50,000 Monthly Active Users (MAU) for Email/Password authentication. This is virtually impossible to hit for a typical class or student organization.
- **Firestore (Database) Limits**:
  - **Stored Data**: 1 GB total.
  - **Document Reads**: 50,000 per day.
  - **Document Writes**: 20,000 per day.
  - **Document Deletes**: 20,000 per day.
  - *Note: These daily limits reset every day at midnight Pacific Time.*
- **Firebase Hosting**:
  - **Storage**: 10 GB.
  - **Data Transfer**: 360 MB per day.

## 3. Razorpay (Payments)

Razorpay allows you to test your integration completely for free.

- **Test Mode**: In Test Mode, you can simulate successful and failed payments using test card numbers. No real money is transferred, and no KYC (Know Your Customer) or business registration is required.
- **Live Mode**: To collect real funds, you must complete Razorpay's KYC process, verify your identity/organization, and submit your website for approval. Razorpay charges standard transaction fees (typically ~2% per transaction) on Live Mode payments.

---

> [!TIP]
> If your organization grows and you need to bypass Render's sleeping limitations, upgrading to the Render Starter Plan ($7/month) is the easiest way to guarantee 100% uptime for your backend without migrating your infrastructure.
