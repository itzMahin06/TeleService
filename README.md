# মাহিন সার্ভিস — সেটআপ ও ডিপ্লয় গাইড

এই প্রজেক্টে আছে:
- `index.html` — মূল আবেদন ফর্ম (লগইন করা ইউজারদের জন্য, প্রোফাইল অটো-ফিল হয়)
- `login.html`, `register.html` — লগইন/রেজিস্ট্রেশন (Firebase Auth)
- `admin.html` — অ্যাডমিন প্যানেল (ব্যবহারকারী তালিকা, অর্ডার তালিকা, অনুমোদন/বাতিল, প্রিমিয়াম প্রিন্টযোগ্য ইনভয়েস)
- `privacy.html`, `refund.html`, `contact.html` — গোপনীয়তা নীতি, রিফান্ড নীতি (রিফান্ড দেওয়া হয় না), ও যোগাযোগ পেজ (ফর্ম সরাসরি টেলিগ্রামে পাঠায়)
- `css/style.css` — সব পেজের ডিজাইন (সবুজ + গাঢ় থিম)
- `js/firebase-init.js` — সব পেজের জন্য শেয়ার্ড Firebase সেটআপ
- `js/profile-widget.js` — হেডারের প্রোফাইল আইকন + নিজের তথ্য দেখা/সম্পাদনা করার মডাল (ইউজার ও অ্যাডমিন দুজনের জন্যই)
- `api/config.js` — Vercel Serverless Function, যেটা Vercel এনভায়রনমেন্ট ভ্যারিয়েবল থেকে Firebase কনফিগ সাপ্লাই করে
- `api/contact.js` — Vercel Serverless Function, যেটা যোগাযোগ ফর্মের বার্তা Telegram বটের মাধ্যমে আপনার টেলিগ্রামে পাঠায়

ডেটা যেখানে জমা থাকে:
- ব্যবহারকারীর তথ্য → Firestore `users` কালেকশন
- আবেদন/অর্ডার → Firestore `orders` কালেকশন (মন্ত্রণালয়ের শর্ট ফর্ম ও ইউজার আইডি সহ — এখন আর PDF আপলোডের দরকার নেই, তাই Firebase Storage ব্যবহার করা হয় না)

---

## ধাপ ১: Firebase প্রজেক্ট তৈরি করুন

1. https://console.firebase.google.com এ যান → **Add project** → নাম দিন (যেমনঃ `mahin-service`)।
2. বাম মেনু থেকে **Build → Authentication** → **Get started** → **Sign-in method** ট্যাবে গিয়ে **Email/Password** চালু (Enable) করুন।
3. **Build → Firestore Database** → **Create database** → **Production mode** সিলেক্ট করে একটা region দিন (যেমন `asia-south1`)।
4. (ঐচ্ছিক) **Build → Storage** — এই ভার্সনে PDF আপলোড না থাকায় Storage ব্যবহার হচ্ছে না, তাই এই ধাপটা বাদ দিতে পারেন। ভবিষ্যতে ফাইল আপলোড ফিরিয়ে আনতে চাইলে তখন চালু করবেন।
5. বাম মেনুর উপরে গিয়ার আইকন → **Project settings** → নিচের দিকে **Your apps** সেকশনে **Web (</>) আইকনে ক্লিক করে একটা Web App যোগ করুন** (nickname: `mahin-service-web`)। এরপর যে `firebaseConfig` অবজেক্ট দেখাবে সেখান থেকে এই মানগুলো টুকে রাখুন:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## ধাপ ২: Firestore সিকিউরিটি রুলস বসান

**Firestore Rules** (Firestore Database → Rules ট্যাব) — এই রুলস পেস্ট করে **Publish** করুন:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == userId;
      // ব্যবহারকারী শুধু নিজের নাম/ফোন নিজে এডিট করতে পারবেন (প্রোফাইল আইকন থেকে)
      allow update: if request.auth != null && request.auth.uid == userId;
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

> `js/firebase-init.js` ফাইলে `ADMIN_EMAILS` তালিকায় যে ইমেইল দেবেন, ঠিক সেই ইমেইলটাই উপরের Firestore Rules-এর `isAdmin()` ফাংশনে যোগ করুন — দুই জায়গায় মিলতে হবে।

> **Storage Rules লাগবে না** — এই ভার্সনে PDF আপলোড ফিচারটি সরিয়ে ফেলা হয়েছে (এর বদলে মন্ত্রণালয়ের শর্ট ফর্ম ও ইউজার আইডি নেওয়া হয়), তাই Firebase Storage ব্যবহার হচ্ছে না।

### "The query requires an index" এরর কেন হয়েছিল, ও এখন কীভাবে ঠিক আছে

আগের ভার্সনে ব্যবহারকারীর নিজের অর্ডার লোড করার সময় একসাথে `where('uid', '==', ...)` এবং `orderBy('createdAt', 'desc')` ব্যবহার করা হচ্ছিল — Firestore-এ এই কম্বিনেশনের জন্য একটা কম্পোজিট (composite) ইনডেক্স ম্যানুয়ালি তৈরি করতে হয়, যেটা তৈরি না থাকায় এই এরর দেখাচ্ছিল।

এখন `index.html`-এ শুধু `where('uid', '==', ...)` কুয়েরি করা হয় এবং তারিখ অনুযায়ী সাজানোটা ব্রাউজারের জাভাস্ক্রিপ্টে (client-side) করা হয় — তাই **কোনো ইনডেক্স তৈরি করার দরকার নেই**, এবং এই সমস্যা আর হবে না। আগে যদি Firebase Console-এ কোনো আধা-তৈরি (building) ইনডেক্স থেকে থাকে, সেটা **Firestore Database → Indexes** ট্যাবে গিয়ে চাইলে ডিলিট করে দিতে পারেন — এটা ঐচ্ছিক, রেখে দিলেও সমস্যা নেই।

## ধাপ ৩: যোগাযোগ ফর্মের জন্য Telegram Bot তৈরি করুন

যোগাযোগ পেজের ফর্ম পূরণ করলে বার্তাটি আপনার টেলিগ্রামে পৌঁছানোর জন্য একটা Telegram Bot লাগবে (এটা `t.me/teletalkpayment`-এর মতো পাবলিক চ্যানেল লিংক থেকে আলাদা — বটটাই বার্তা পাঠানোর মাধ্যম)।

1. টেলিগ্রামে **@BotFather**-কে মেসেজ দিন → `/newbot` কমান্ড দিন → একটা নাম ও ইউজারনেম দিন (যেমনঃ `MahinServiceBot`)।
2. BotFather যে **টোকেন** (token) দেবে সেটা টুকে রাখুন — এটাই `TELEGRAM_BOT_TOKEN`।
3. এবার আপনার তৈরি করা বটটাকে টেলিগ্রামে খুঁজে বের করে **Start** চাপুন (একটা মেসেজ পাঠান, যেমন "হ্যালো")।
4. এই লিংকে ব্রাউজারে গিয়ে (নিজের টোকেন বসিয়ে) চেক করুনঃ
   `https://api.telegram.org/bot<আপনার-টোকেন>/getUpdates`
   এখানে JSON রেসপন্সে `"chat":{"id": ...}` এর মধ্যে যে নম্বরটা পাবেন সেটাই আপনার `TELEGRAM_CHAT_ID`।

## ধাপ ৪: GitHub-এ কোড পুশ করুন (ধাপে ধাপে)

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

এরপর GitHub-এ গিয়ে দেখুন সব ফাইল (`index.html`, `login.html`, `register.html`, `admin.html`, `privacy.html`, `refund.html`, `contact.html`, `css/`, `js/`, `api/`) আপলোড হয়ে গেছে কিনা।

## ধাপ ৫: Vercel-এ ডিপ্লয় করুন

1. https://vercel.com এ লগইন করুন (GitHub দিয়ে লগইন করাই সহজ)।
2. **Add New → Project** → আপনার `mahin-service` GitHub রিপো সিলেক্ট করে **Import** করুন।
3. Framework Preset **Other** থাকবে — এটাই ঠিক আছে, কিছু বদলাতে হবে না।
4. Deploy করার আগে **Environment Variables** সেকশনে গিয়ে নিচের ভ্যারিয়েবলগুলো যোগ করুন:

   | Name | Value |
   |---|---|
   | `FIREBASE_API_KEY` | আপনার apiKey |
   | `FIREBASE_AUTH_DOMAIN` | আপনার authDomain |
   | `FIREBASE_PROJECT_ID` | আপনার projectId |
   | `FIREBASE_STORAGE_BUCKET` | আপনার storageBucket |
   | `FIREBASE_MESSAGING_SENDER_ID` | আপনার messagingSenderId |
   | `FIREBASE_APP_ID` | আপনার appId |
   | `TELEGRAM_BOT_TOKEN` | ধাপ ৩ থেকে পাওয়া বট টোকেন |
   | `TELEGRAM_CHAT_ID` | ধাপ ৩ থেকে পাওয়া chat id |

5. **Deploy** বাটনে ক্লিক করুন। ১-২ মিনিটে সাইট লাইভ হয়ে যাবে (যেমনঃ `https://mahin-service.vercel.app`)।

> পরে কখনো Environment Variable পরিবর্তন করলে Vercel প্রজেক্টের **Deployments** ট্যাব থেকে সর্বশেষ ডিপ্লয়মেন্টে গিয়ে **Redeploy** চাপতে হবে, তা না হলে নতুন মান কার্যকর হবে না।

## ধাপ ৬: Firebase Auth-এ আপনার ডোমেইন অনুমোদন করুন

1. Firebase Console → **Authentication → Settings → Authorized domains**।
2. আপনার Vercel ডোমেইন যোগ করুন (যেমনঃ `mahin-service.vercel.app`)। এটা না করলে লগইন/রেজিস্ট্রেশন কাজ করবে না।

## ধাপ ৭: অ্যাডমিন অ্যাকাউন্ট তৈরি করুন

1. লাইভ সাইটে গিয়ে `register.html` দিয়ে **আপনার নিজের** ইমেইল (`info.itzmahin@gmail.com`) দিয়ে একটা অ্যাকাউন্ট রেজিস্ট্রেশন করুন।
2. এই ইমেইলটাই `js/firebase-init.js`-এর `ADMIN_EMAILS` এবং Firestore Rules-এর `isAdmin()`-এ আগে থেকেই বসানো আছে, তাই লগইন করার পর সরাসরি `/admin.html`-এ গিয়ে অ্যাডমিন প্যানেল দেখতে পারবেন।
3. অন্য কাউকে অ্যাডমিন বানাতে চাইলে তার ইমেইল দুই জায়গায় (`js/firebase-init.js` ও Firestore Rules) যোগ করে আবার GitHub-এ পুশ করুন — Vercel নিজে থেকেই নতুন ভার্সন ডিপ্লয় করে দেবে।

---

## কাজের ধারা (Workflow)

- একজন ব্যবহারকারী রেজিস্ট্রেশন করে → নাম ও ফোন Firestore-এ সেভ হয়।
- লগইন করে আবেদন ফর্মে গেলে নাম/ফোন অটো-ফিল থাকে — শুধু ফি, মন্ত্রণালয়ের শর্ট ফর্ম, ইউজার আইডি, পেমেন্ট মেথড, প্রেরকের নম্বর ও ট্রানজেকশন আইডি দিতে হয়।
- সাবমিট করলে একটা অর্ডার Firestore-এ `status: "pending"` অবস্থায় তৈরি হয় (কোনো ফাইল আপলোড লাগে না)।
- অ্যাডমিন (`admin.html`) সব অর্ডার রিয়েল-টাইমে দেখতে পান, এবং **অনুমোদন**/**বাতিল** বাটনে ক্লিক করে status বদলাতে পারেন।
- status বদলালেই ব্যবহারকারীর "অর্ডার তালিকা" ও রিসিট পেজে সাথে সাথে (রিয়েল-টাইম) নতুন status দেখা যায় — পেজ রিফ্রেশ করার দরকার নেই।
- অ্যাডমিন যেকোনো অর্ডারের পাশে **"ইনভয়েস"** বাটনে ক্লিক করলে একটা প্রিমিয়াম-ডিজাইনের ইনভয়েস খুলবে (ইনভয়েস নম্বর, বিল প্রাপকের তথ্য, স্ট্যাটাস স্ট্যাম্প-সহ) — সেখান থেকে **প্রিন্ট করুন** বাটনে ক্লিক করে সরাসরি প্রিন্ট করা যায়, অথবা প্রিন্ট ডায়ালগে "Save as PDF" বেছে নিয়ে পিডিএফ হিসেবেও সংরক্ষণ করা যায়।
- ব্যবহারকারীর রিসিট পেজেও একই রকম **"প্রিন্ট করুন"** বাটন আছে — এটা ব্রাউজারের নিজস্ব প্রিন্ট ফিচার ব্যবহার করে বলে বাংলা লেখা সবসময় ঠিকভাবে দেখায় ও পুরো রিসিট এক পেজে সম্পূর্ণ দেখা যায়।
- হেডারের **প্রোফাইল আইকনে** ক্লিক করলে ব্যবহারকারী বা অ্যাডমিন নিজের নাম/ফোন নম্বর দেখতে ও এডিট করতে পারেন (ইমেইল পরিবর্তনযোগ্য নয়)। এটা `index.html` ও `admin.html` — দুই পেজেই কাজ করে।
- ফুটারের **যোগাযোগ** পেজে ফর্ম পূরণ করলে বার্তাটি সরাসরি আপনার টেলিগ্রামে পৌঁছে যায় (`api/contact.js` দিয়ে)।

## সীমাবদ্ধতা যা জেনে রাখা ভালো

- Firebase-এর ফ্রি (Spark) প্ল্যানে Firestore-এর একটা ফ্রি লিমিট আছে, বড় পরিসরে ব্যবহার করলে Blaze (pay-as-you-go) প্ল্যানে যেতে হতে পারে।
- "প্রিন্ট করুন" বাটন ব্রাউজারের প্রিন্ট ডায়ালগ খোলে — ফাইল হিসেবে সরাসরি সংরক্ষণ করতে চাইলে প্রিন্ট ডায়ালগে Destination হিসেবে **Save as PDF** বেছে নিতে হবে (এটা প্রায় সব ব্রাউজারেই বিল্ট-ইন থাকে)।

## লোগো ও রঙের থিম নিয়ে একটা ছোট নোট

আপনি যে লোগোটা পাঠিয়েছিলেন সেটাতে টেলিটকের নিজস্ব "টেলিটক / TeleTalk" ওয়ার্ডমার্ক ও ভিজ্যুয়াল আইডেন্টিটি হুবহু ব্যবহার করা হয়েছে — সেটা এই সাইটে বসালে মনে হবে এটা টেলিটকের অফিশিয়াল সেবা, যেটা আমরা শুরুতেই এড়াতে চেয়েছিলাম ("Payment by Teletalk" নাম বাদ দিয়ে "মাহিন সার্ভিস" রাখার সময়)। তাই সেই নির্দিষ্ট লোগোটা ব্যবহার না করে, একই রকম **সবুজ + গাঢ় রঙের থিম** ও একটা নতুন, নিজস্ব শিল্ড-আইকন লোগো বসানো হয়েছে (`css/style.css`-এর `.brand-mark`)। চাইলে `js/firebase-init.js`-এর পাশে থাকা এই আইকনটা পরে সহজেই বদলে নিজের ডিজাইন করা লোগো (PNG/SVG ফাইল) দিয়ে প্রতিস্থাপন করতে পারবেন — `<div class="brand-mark">` এর ভেতরের `<i>` ট্যাগের বদলে `<img src="logo.png">` বসিয়ে দিলেই হবে।
