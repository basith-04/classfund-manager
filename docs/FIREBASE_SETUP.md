# Firebase Setup Guide

This guide covers everything you need to set up Firebase for Class Fund Manager. Firebase acts as the database (Firestore), authentication provider, and frontend host.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the prompts. (You can disable Google Analytics if you don't need it).
3. Once the project is created, click the **Web** icon (`</>`) to add a Firebase app to your project.
4. Register the app (e.g., "ClassFundFrontend").
5. Copy the provided `firebaseConfig` object. You will need to paste this into `public/js/services/firebase-config.js` later.

## 2. Enable Authentication
1. In the Firebase Console sidebar, click **Authentication**, then click **Get Started**.
2. Under the **Sign-in method** tab, click **Email/Password**.
3. Enable **Email/Password** and click **Save**.

## 3. Create Firestore Database
1. In the sidebar, click **Firestore Database**, then click **Create database**.
2. Select **Start in production mode** (this ensures all reads/writes are denied by default until we deploy our security rules).
3. Choose a location closest to your users and click **Create**.

## 4. Deploy Rules and Indexes
To secure your database, you must deploy the security rules included in this repository.

1. Ensure you have the Firebase CLI installed (`npm install -g firebase-tools`).
2. Log in to your Firebase account in your terminal:
   ```bash
   firebase login
   ```
3. Initialize your project (if not already done) and link it to the project you just created:
   ```bash
   firebase use --add
   ```
4. Deploy the rules from the root of the `classfund-manager` directory:
   ```bash
   firebase deploy --only firestore:rules
   ```

## 5. Generate a Service Account
Your Node.js backend needs administrative access to Firestore to process payments securely.

1. In the Firebase Console, go to **Project Settings** (the gear icon) -> **Service accounts**.
2. Click **Generate new private key**.
3. A JSON file will download to your computer. 

> [!CAUTION]
> **Never commit this file to GitHub!** This file grants full read/write access to your entire database. It should be kept strictly confidential.

To use this file:
- For **local development**: Save it as `service-account.json` inside the `functions/` directory of this repository (it is automatically ignored by Git). Alternatively, you can add the minified JSON string as the `FIREBASE_SERVICE_ACCOUNT` variable in your `.env` file.
- For **production deployment**: Open the file in a text editor, remove all line breaks and spaces, and paste the resulting single-line string into your hosting provider's environment variables as `FIREBASE_SERVICE_ACCOUNT`.

## 6. Create the First Admin Account
You need an initial admin account to access the Admin Dashboard.

1. Ensure your `service-account.json` is placed inside the `functions/` folder.
2. Open your terminal and navigate to the `functions/` directory:
   ```bash
   cd functions
   npm install
   ```
3. Seed the initial admin document in the database:
   ```bash
   node seed.js
   ```
   *Expected result: You should see "Seed completed!" in the console.*
4. Set the cryptographic admin claim so Firebase Authentication recognizes the user as an admin:
   ```bash
   node set-admin-claim.js
   ```
   *Expected result: You should see "Admin custom claims set successfully."*

**Common Mistakes**:
- Forgetting to place `service-account.json` in the `functions/` folder before running the scripts.
- The default credentials created are `admin@example.com` / `admin123`. **Log in immediately and change the password via the profile settings.**
