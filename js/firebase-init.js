/* js/firebase-init.js
   Shared by every page. Loads the Firebase web config from the /api/config
   serverless function (which reads your Vercel Environment Variables),
   then initializes Firebase and exposes window.auth / window.db / window.storage.

   IMPORTANT: This only works once deployed on Vercel (or run locally with
   `vercel dev`), because /api/config is a Vercel Serverless Function.
*/

// Add every email address that should have access to /admin.html here.
window.ADMIN_EMAILS = ["info.itzmahin@gmail.com"];

window.isAdminEmail = function (email) {
  if (!email) return false;
  return window.ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
};

window.MahinFirebaseReady = (async function initFirebase() {
  const res = await fetch("/api/config");
  if (!res.ok) {
    throw new Error(
      "Could not load Firebase config from /api/config. Make sure the Firebase " +
      "environment variables are set in your Vercel project settings and that " +
      "this site is running on Vercel."
    );
  }
  const firebaseConfig = await res.json();

  firebase.initializeApp(firebaseConfig);

  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.storage = (typeof firebase.storage === "function") ? firebase.storage() : null;

  return true;
})();

// Small helper: resolves once we know the current auth state (or null).
window.getCurrentUser = function () {
  return window.MahinFirebaseReady.then(
    () =>
      new Promise((resolve) => {
        const unsub = window.auth.onAuthStateChanged((user) => {
          unsub();
          resolve(user);
        });
      })
  );
};

// Redirect to login.html if nobody is signed in. Returns the user if signed in.
window.requireLogin = async function () {
  const user = await window.getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = "login.html?next=" + next;
    return null;
  }
  return user;
};

// Redirect to index.html if the signed-in user is not an admin email.
window.requireAdmin = async function () {
  const user = await window.requireLogin();
  if (!user) return null;
  if (!window.isAdminEmail(user.email)) {
    location.href = "index.html";
    return null;
  }
  return user;
};
