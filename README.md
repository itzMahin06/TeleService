# মাহিন সার্ভিস — সেটআপ ও ডিপ্লয় গাইড

এই প্রজেক্টে আছে:
- `index.html` — মূল আবেদন ফর্ম (লগইন করা ইউজারদের জন্য, প্রোফাইল অটো-ফিল হয়)
- `login.html`, `register.html` — লগইন/রেজিস্ট্রেশন (Firebase Auth)
- `admin.html` — অ্যাডমিন প্যানেল (ব্যবহারকারী তালিকা, অর্ডার তালিকা, অনুমোদন/বাতিল)
- `css/style.css` — সব পেজের ডিজাইন
- `js/firebase-init.js` — সব পেজের জন্য শেয়ার্ড Firebase সেটআপ
- `api/config.js` — Vercel Serverless Function, যেটা Vercel এনভায়রনমেন্ট ভ্যারিয়েবল থেকে Firebase কনফিগ সাপ্লাই করে

ডেটা যেখানে জমা থাকে:
- ব্যবহারকারীর তথ্য → Firestore `users` কালেকশন
- আবেদন/অর্ডার → Firestore `orders` কালেকশন

**সাম্প্রতিক পরিবর্তনসমূহ:**
- অর্ডার তালিকায় "Firestore composite index" এরর ঠিক করা হয়েছে (ইনডেক্স ছাড়াই কাজ করবে)।
- আবেদন ফরম থেকে PDF আপলোড সিস্টেম সরিয়ে ফেলা হয়েছে; বদলে যোগ করা হয়েছে **"মন্ত্রণালয় এর শর্ট ফর্ম"** (যেমন DSS) ও **"ইউজার আইডি"** — দুটি নতুন ইনপুট।
- অ্যাডমিন প্যানেলে প্রতিটি অর্ডারের জন্য **প্রিমিয়াম ইনভয়েস প্রিন্ট** বাটন যোগ করা হয়েছে।
- লগইনের পর হেডারে **প্রোফাইল আইকন/বাটন** যোগ করা হয়েছে — ব্যবহারকারী ও অ্যাডমিন উভয়েই নিজের নাম/ফোন/পাসওয়ার্ড এডিট করতে পারবেন। অ্যাডমিন প্যানেলের ব্যবহারকারী তালিকা থেকে অ্যাডমিন অন্য যেকোনো ব্যবহারকারীর তথ্যও এডিট করতে পারবেন (ও চাইলে পাসওয়ার্ড রিসেট ইমেইল পাঠাতে পারবেন)।

---

## ধাপ ১: Firebase প্রজেক্ট তৈরি করুন

1. https://console.firebase.google.com এ যান → **Add project** → নাম দিন (যেমনঃ `mahin-service`)।
2. বাম মেনু থেকে **Build → Authentication** → **Get started** → **Sign-in method** ট্যাবে গিয়ে **Email/Password** চালু (Enable) করুন।
3. **Build → Firestore Database** → **Create database** → **Production mode** সিলেক্ট করে একটা region দিন (যেমন `asia-south1`)।
4. **Build → Storage** → **Get started** → একই region দিয়ে চালু করুন।
5. বাম মেনুর উপরে গিয়ার আইকন → **Project settings** → নিচের দিকে **Your apps** সেকশনে **Web (</>) আইকনে ক্লিক করে একটা Web App যোগ করুন** (nickname: `mahin-service-web`)। এরপর যে `firebaseConfig` অবজেক্ট দেখাবে সেখান থেকে এই মানগুলো টুকে রাখুন:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## ধাপ ২: Firestore ও Storage সিকিউরিটি রুলস বসান

**Firestore Rules** (Firestore Database → Rules ট্যাব) — এই রুলস পেস্ট করে **Publish** করুন:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == userId;
      // ব্যবহারকারী নিজের প্রোফাইল (নাম/ফোন) এডিট করতে পারবে,
      // অ্যাডমিন যেকোনো ব্যবহারকারীর প্রোফাইল এডিট করতে পারবে
      allow update: if request.auth != null &&
                       (request.auth.uid == userId || isAdmin());
      allow delete: if false;
    }

    match /orders/{orderId} {
      allow read: if request.auth != null &&
                     (resource.data.uid == request.auth.uid || isAdmin());
      allow create: if request.auth != null &&
                       request.resource.data.uid == request.auth.uid;
      // শুধু অ্যাডমিন status আপডেট করতে পারবে
      allow update: if isAdmin();
      allow delete: if false;
    }

    function isAdmin() {
      return request.auth != null &&
             request.auth.token.email in [
               "info.itzmahin@gmail.com"
               // এখানে আরও অ্যাডমিন ইমেইল যোগ করতে পারেন
             ];
    }
  }
}
```

> এই রুলসটাই `firestore.rules` ফাইলে আলাদাভাবেও দেওয়া আছে, সরাসরি কপি করে Firebase Console → Firestore Database → Rules ট্যাবে পেস্ট করে **Publish** করুন।

> **আপডেট (PDF আপলোড সিস্টেম বাদ দেওয়া হয়েছে):** ফর্ম থেকে PDF আপলোড অপশন সরিয়ে ফেলা হয়েছে, তাই এখন Firebase Storage ব্যবহার করা হয় না। Storage সেটআপ/রুলস আর লাগবে না — আগে থেকে থাকলে সেটা এমনিতেই থেকে যাবে, কোনো সমস্যা হবে না, চাইলে Firebase Console থেকে Storage বন্ধও করে দিতে পারেন।

> `js/firebase-init.js` ফাইলে `ADMIN_EMAILS` তালিকায় যে ইমেইল দেবেন, ঠিক সেই ইমেইলটাই উপরের Firestore Rules-এর `isAdmin()` ফাংশনে যোগ করুন — দুই জায়গায় মিলতে হবে।

## ধাপ ৩: GitHub-এ কোড পুশ করুন (ধাপে ধাপে)

আপনার কম্পিউটারে এই ফোল্ডারটা (ডাউনলোড করা zip আনজিপ করার পর) টার্মিনাল/কমান্ড প্রম্পটে খুলে নিচের কমান্ডগুলো একে একে চালান:

```bash
# ১) এই ফোল্ডারে ঢুকুন
cd mahin-service

# ২) গিট চালু করুন
git init

# ৩) সব ফাইল যোগ করুন
git add .

# ৪) প্রথম কমিট
git commit -m "Initial commit: Mahin Service"

# ৫) মেইন ব্রাঞ্চের নাম main রাখুন
git branch -M main

# ৬) GitHub-এ গিয়ে আগে থেকে একটা খালি (empty) রিপোজিটরি তৈরি করুন
#    (README/gitignore যোগ না করেই) — নাম দিন যেমন: mahin-service
#    তারপর সেই রিপোর URL এখানে বসান:
git remote add origin https://github.com/<আপনার-ইউজারনেম>/mahin-service.git

# ৭) পুশ করুন
git push -u origin main
```

এরপর GitHub-এ গিয়ে দেখুন সব ফাইল (`index.html`, `login.html`, `register.html`, `admin.html`, `css/`, `js/`, `api/`) আপলোড হয়ে গেছে কিনা।

## ধাপ ৪: Vercel-এ ডিপ্লয় করুন

1. https://vercel.com এ লগইন করুন (GitHub দিয়ে লগইন করাই সহজ)।
2. **Add New → Project** → আপনার `mahin-service` GitHub রিপো সিলেক্ট করে **Import** করুন।
3. Framework Preset **Other** থাকবে — এটাই ঠিক আছে, কিছু বদলাতে হবে না।
4. Deploy করার আগে **Environment Variables** সেকশনে গিয়ে নিচের ৬টা ভ্যারিয়েবল যোগ করুন (মান আসবে ধাপ ১ থেকে টুকে রাখা `firebaseConfig` থেকে):

   | Name | Value |
   |---|---|
   | `FIREBASE_API_KEY` | আপনার apiKey |
   | `FIREBASE_AUTH_DOMAIN` | আপনার authDomain |
   | `FIREBASE_PROJECT_ID` | আপনার projectId |
   | `FIREBASE_STORAGE_BUCKET` | আপনার storageBucket |
   | `FIREBASE_MESSAGING_SENDER_ID` | আপনার messagingSenderId |
   | `FIREBASE_APP_ID` | আপনার appId |

5. **Deploy** বাটনে ক্লিক করুন। ১-২ মিনিটে সাইট লাইভ হয়ে যাবে (যেমনঃ `https://mahin-service.vercel.app`)।

> পরে কখনো Environment Variable পরিবর্তন করলে Vercel প্রজেক্টের **Deployments** ট্যাব থেকে সর্বশেষ ডিপ্লয়মেন্টে গিয়ে **Redeploy** চাপতে হবে, তা না হলে নতুন মান কার্যকর হবে না।

## ধাপ ৫: Firebase Auth-এ আপনার ডোমেইন অনুমোদন করুন

1. Firebase Console → **Authentication → Settings → Authorized domains**।
2. আপনার Vercel ডোমেইন যোগ করুন (যেমনঃ `mahin-service.vercel.app`)। এটা না করলে লগইন/রেজিস্ট্রেশন কাজ করবে না।

## ধাপ ৬: অ্যাডমিন অ্যাকাউন্ট তৈরি করুন

1. লাইভ সাইটে গিয়ে `register.html` দিয়ে **আপনার নিজের** ইমেইল (`info.itzmahin@gmail.com`) দিয়ে একটা অ্যাকাউন্ট রেজিস্ট্রেশন করুন।
2. এই ইমেইলটাই `js/firebase-init.js`-এর `ADMIN_EMAILS` এবং Firestore Rules-এর `isAdmin()`-এ আগে থেকেই বসানো আছে, তাই লগইন করার পর সরাসরি `/admin.html`-এ গিয়ে অ্যাডমিন প্যানেল দেখতে পারবেন।
3. অন্য কাউকে অ্যাডমিন বানাতে চাইলে তার ইমেইল দুই জায়গায় (`js/firebase-init.js` ও Firestore Rules) যোগ করে আবার GitHub-এ পুশ করুন — Vercel নিজে থেকেই নতুন ভার্সন ডিপ্লয় করে দেবে।

---

## কাজের ধারা (Workflow)

- একজন ব্যবহারকারী রেজিস্ট্রেশন করে → নাম ও ফোন Firestore-এ সেভ হয়।
- লগইন করে আবেদন ফর্মে গেলে নাম/ফোন অটো-ফিল থাকে — শুধু ফি, PDF, পেমেন্ট মেথড, প্রেরকের নম্বর ও ট্রানজেকশন আইডি দিতে হয়।
- সাবমিট করলে PDF Firebase Storage-এ আপলোড হয় এবং একটা অর্ডার Firestore-এ `status: "pending"` অবস্থায় তৈরি হয়।
- অ্যাডমিন (`admin.html`) সব অর্ডার রিয়েল-টাইমে দেখতে পান, PDF দেখতে পারেন, এবং **অনুমোদন**/**বাতিল** বাটনে ক্লিক করে status বদলাতে পারেন।
- status বদলালেই ব্যবহারকারীর "অর্ডার তালিকা" ও রিসিট পেজে সাথে সাথে (রিয়েল-টাইম) নতুন status দেখা যায় — পেজ রিফ্রেশ করার দরকার নেই।

## সীমাবদ্ধতা যা জেনে রাখা ভালো

- ইমেইলে/হোয়াটসঅ্যাপে "পাঠান" বাটন দুটো স্বয়ংক্রিয়ভাবে কিছু "সেন্ড" করে না (এটার জন্য আলাদা ইমেইল-সার্ভিস ব্যাকএন্ড লাগবে) — বরং প্রিফিলড ইমেইল/হোয়াটসঅ্যাপ মেসেজ খুলে দেয় যাতে আপনি এক ক্লিকে পাঠাতে পারেন। PDF রিসিট ডাউনলোড করে ইমেইলে ম্যানুয়ালি সংযুক্ত করতে হবে।
- Firebase-এর ফ্রি (Spark) প্ল্যানে Storage ও Firestore-এর একটা ফ্রি লিমিট আছে, বড় পরিসরে ব্যবহার করলে Blaze (pay-as-you-go) প্ল্যানে যেতে হতে পারে।
