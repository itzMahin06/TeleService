// api/contact.js
// Vercel Serverless Function. Receives the contact form POST from
// contact.html and forwards it as a message to your Telegram using a
// Telegram Bot (see README.md for how to create the bot and get the
// TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID values).

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const { name, contact, message } = req.body || {};

  if (!name || !contact || !message) {
    res.status(400).json({ ok: false, error: "নাম, যোগাযোগ ও বার্তা — সবগুলো ঘর পূরণ করুন।" });
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
    "📩 *নতুন যোগাযোগ বার্তা — মাহিন সার্ভিস*\n\n" +
    `*নামঃ* ${escapeMd(name)}\n` +
    `*যোগাযোগঃ* ${escapeMd(contact)}\n\n` +
    `*বার্তাঃ*\n${escapeMd(message)}`;

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
    res.status(500).json({ ok: false, error: "সার্ভার সমস্যা হয়েছে, আবার চেষ্টা করুন।" });
  }
};

function escapeMd(s) {
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
