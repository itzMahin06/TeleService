// api/order-notify.js
// Vercel Serverless Function. Called right after an order is saved to
// Firestore (from index.html's manual form and js/order-popup.js). Sends the
// order number, phone, ministry, and application ID to Telegram using the
// SAME bot as api/contact.js — reuses TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.
//
// To post into a GROUP instead of your personal chat: add the bot to the
// group, send any message in the group, then set TELEGRAM_CHAT_ID to that
// group's chat id (it will be a negative number, e.g. -1001234567890).
// See README.md for how to find it.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { orderCode, name, phone, ministryShortForm, applicationUserId, fee, method } = req.body || {};

  if (!orderCode) {
    res.status(400).json({ ok: false, error: "orderCode missing" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    res.status(500).json({
      ok: false,
      error: "Telegram bot configured হয়নি। Vercel-এ TELEGRAM_BOT_TOKEN ও TELEGRAM_CHAT_ID এনভায়রনমেন্ট ভ্যারিয়েবল যোগ করুন।",
    });
    return;
  }

  const text =
    "🧾 *নতুন অর্ডার জমা হয়েছে — মাহিন সার্ভিস*\n\n" +
    `*অর্ডার আইডিঃ* ${escapeMd(orderCode)}\n` +
    `*নামঃ* ${escapeMd(name || "—")}\n` +
    `*ফোন নম্বরঃ* ${escapeMd(phone || "—")}\n` +
    `*মন্ত্রণালয়ঃ* ${escapeMd(ministryShortForm || "—")}\n` +
    `*অ্যাপ্লিকেশন আইডিঃ* ${escapeMd(applicationUserId || "—")}` +
    (fee ? `\n*ফিঃ* ৳${escapeMd(String(fee))}` : "") +
    (method ? `\n*পেমেন্ট মেথডঃ* ${escapeMd(method)}` : "");

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      res.status(502).json({ ok: false, error: "Telegram-এ বার্তা পাঠাতে ব্যর্থ হয়েছে।" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "সার্ভার সমস্যা হয়েছে।" });
  }
};

function escapeMd(s) {
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
