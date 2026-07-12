// api/config.js
// Vercel Serverless Function. Reads Firebase config from Vercel Environment
// Variables and returns it as JSON so the client-side pages can initialize
// Firebase without the values being hard-coded into the repo.
//
// NOTE: The Firebase web config (apiKey, authDomain, etc.) is not a secret —
// Firebase's own docs confirm it's safe to expose client-side. Real security
// comes from your Firestore/Storage security rules, not from hiding this
// object. We're still serving it via env vars here because that's how you
// asked to manage it, and it keeps the values in one place (Vercel) instead
// of committed to GitHub.

module.exports = (req, res) => {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  const missing = Object.entries(config)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    res.status(500).json({
      error: "Missing Firebase environment variables in Vercel: " + missing.join(", "),
    });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json(config);
};
