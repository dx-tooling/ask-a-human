// Firebase Admin SDK for Node.js
// SDK Version: 12.8.0 - https://firebase.google.com/support/release-notes/js
// npm install firebase-admin@12.8.0

const admin = require("firebase-admin");

// Service account key: secrets/ask-a-human-poc-firebase-adminsdk-fbsvc-3a666671a0.json
// See: planning/fundamentals/01-available-infrastructure-accounts-and-services.md
const serviceAccount = require("../../secrets/ask-a-human-poc-firebase-adminsdk-fbsvc-3a666671a0.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
