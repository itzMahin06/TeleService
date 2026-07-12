/* js/order-popup.js
   Shared "Order Now" popup used on index.html and products.html.
   window.openOrderPopup(productId) — opens the popup pre-filled with the
   product's ministry name & price; the person only types their Application ID
   plus payment details (method / sender number / transaction ID).

   >>> Update WHATSAPP_NUMBER / TELEGRAM_USERNAME below with your real details. <<<
*/

(function () {
  const WHATSAPP_NUMBER = "8801931923910"; // used for the wa.me contact link
  const TELEGRAM_USERNAME = "MahinServiceBD"; // <-- CHANGE THIS to your real Telegram username

  let currentProduct = null;
  let currentUser = null;
  let currentProfile = null;

  function injectModal() {
    if (document.getElementById("opOverlay")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="overlay" id="opOverlay" onclick="closeOrderPopup()"></div>
      <div class="center-modal" id="opModal">
        <div class="center-modal-card">
          <div class="cm-head">
            <h3><i class="fa-solid fa-bolt"></i> এখনই অর্ডার করুন</h3>
            <button onclick="closeOrderPopup()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="cm-body">
            <div id="opError" class="error-msg"></div>
            <div id="opOk" class="ok-msg"></div>

            <div id="opFormWrap">
              <div class="op-locked">
                <span><i class="fa-solid fa-building-columns"></i> মন্ত্রণালয়</span>
                <b id="opMinistry">—</b>
              </div>
              <div class="op-locked">
                <span><i class="fa-solid fa-sack-dollar"></i> আবেদন ফি</span>
                <b id="opPrice">৳0</b>
              </div>

              <form id="opForm">
                <div class="field">
                  <label>ইউজার / অ্যাপ্লিকেশন আইডি <i class="fa-solid fa-asterisk" style="font-size:8px;"></i></label>
                  <input type="text" id="opUserId" placeholder="আপনার আবেদনের ইউজার আইডি" required>
                </div>

                <div class="divider"><i class="fa-solid fa-wallet"></i> পেমেন্ট তথ্য</div>

                <div class="field">
                  <label>পেমেন্ট মেথড</label>
                  <div class="pay-methods">
                    <input type="radio" name="opPm" id="opPmBkash" value="বিকাশ" checked>
                    <label for="opPmBkash" class="pm-bkash"><i class="fa-solid fa-mobile-screen-button"></i> বিকাশ</label>
                    <input type="radio" name="opPm" id="opPmNagad" value="নগদ">
                    <label for="opPmNagad" class="pm-nagad"><i class="fa-solid fa-wallet"></i> নগদ</label>
                    <input type="radio" name="opPm" id="opPmRocket" value="রকেট">
                    <label for="opPmRocket" class="pm-rocket"><i class="fa-solid fa-rocket"></i> রকেট</label>
                  </div>
                </div>

                <div class="send-box">
                  <i class="fa-solid fa-circle-arrow-right"></i>
                  <div>এই নম্বরে <b>Send Money</b> করুন: <span class="num">01931923910</span></div>
                </div>

                <div class="grid2">
                  <div class="field">
                    <label>প্রেরকের নম্বর <i class="fa-solid fa-asterisk" style="font-size:8px;"></i></label>
                    <input type="tel" id="opSender" placeholder="01XXXXXXXXX" maxlength="11" required>
                  </div>
                  <div class="field">
                    <label>ট্রানজেকশন আইডি <i class="fa-solid fa-asterisk" style="font-size:8px;"></i></label>
                    <input type="text" id="opTrx" placeholder="যেমনঃ 9F3K7L2P1Q" required style="text-transform:uppercase;">
                  </div>
                </div>

                <button type="submit" class="submit-btn" id="opSubmitBtn"><i class="fa-solid fa-paper-plane"></i> অর্ডার নিশ্চিত করুন</button>
              </form>

              <div class="op-help-box">
                <i class="fa-solid fa-circle-info"></i>
                যদি আপনি নিজে আবেদন না করে থাকেন, তাহলে আমাদের দিয়ে আবেদন করিয়ে নিতে পারেন — যোগাযোগ করুন:
                <div class="op-contact-row">
                  <a class="op-btn wa" target="_blank" href="https://wa.me/${WHATSAPP_NUMBER}"><i class="fa-brands fa-whatsapp"></i> হোয়াটসঅ্যাপ</a>
                  <a class="op-btn tg" target="_blank" href="https://t.me/${TELEGRAM_USERNAME}"><i class="fa-brands fa-telegram"></i> টেলিগ্রাম</a>
                </div>
              </div>
            </div>

            <div id="opSuccessWrap" style="display:none; text-align:center; padding:10px 0;">
              <i class="fa-solid fa-circle-check" style="font-size:38px; color:var(--green); margin-bottom:10px; display:inline-block;"></i>
              <h3 style="margin-bottom:6px;">অর্ডার জমা হয়েছে ✓</h3>
              <p style="font-size:12.5px; color:var(--ink-soft); margin-bottom:16px;">অর্ডার আইডিঃ <b id="opOrderCode" style="font-family:var(--mono); color:var(--brand-deep);"></b><br>অ্যাডমিন যাচাই করলে "অর্ডার তালিকা"-তে স্ট্যাটাস দেখতে পাবেন।</p>
              <button class="submit-btn" onclick="closeOrderPopup()"><i class="fa-solid fa-check"></i> ঠিক আছে</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    document.getElementById("opForm").addEventListener("submit", submitOrder);
  }

  window.openOrderPopup = async function (productId) {
    injectModal();
    resetPopup();

    currentUser = await window.getCurrentUser();
    if (!currentUser) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = "login.html?next=" + next;
      return;
    }

    const snap = await window.db.collection("products").doc(productId).get();
    if (!snap.exists) {
      alert("এই প্রোডাক্টটি আর পাওয়া যাচ্ছে না।");
      return;
    }
    currentProduct = { _id: snap.id, ...snap.data() };

    const uSnap = await window.db.collection("users").doc(currentUser.uid).get();
    currentProfile = uSnap.exists ? uSnap.data() : { name: currentUser.email, phone: "" };

    document.getElementById("opMinistry").textContent = currentProduct.ministryName || "—";
    document.getElementById("opPrice").textContent = "৳" + (currentProduct.price || 0);

    document.getElementById("opOverlay").style.display = "block";
    document.getElementById("opModal").classList.add("open");
  };

  window.closeOrderPopup = function () {
    const overlay = document.getElementById("opOverlay");
    const modal = document.getElementById("opModal");
    if (overlay) overlay.style.display = "none";
    if (modal) modal.classList.remove("open");
  };

  function resetPopup() {
    const err = document.getElementById("opError");
    const ok = document.getElementById("opOk");
    if (err) { err.style.display = "none"; err.textContent = ""; }
    if (ok) { ok.style.display = "none"; }
    const form = document.getElementById("opForm");
    if (form) form.reset();
    const formWrap = document.getElementById("opFormWrap");
    const successWrap = document.getElementById("opSuccessWrap");
    if (formWrap) formWrap.style.display = "block";
    if (successWrap) successWrap.style.display = "none";
  }

  async function submitOrder(e) {
    e.preventDefault();
    const errEl = document.getElementById("opError");
    errEl.style.display = "none";

    const applicationUserId = document.getElementById("opUserId").value.trim();
    const method = document.querySelector('input[name=opPm]:checked').value;
    const sender = document.getElementById("opSender").value.trim();
    const trx = document.getElementById("opTrx").value.trim().toUpperCase();

    if (!applicationUserId || !sender || !trx) {
      errEl.textContent = "অনুগ্রহ করে সকল আবশ্যক ঘর পূরণ করুন।";
      errEl.style.display = "block";
      return;
    }
    if (!/^01[0-9]{9}$/.test(sender)) {
      errEl.textContent = "প্রেরকের নম্বরটি সঠিক ফরম্যাটে দিন।";
      errEl.style.display = "block";
      return;
    }

    const btn = document.getElementById("opSubmitBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> জমা হচ্ছে...';

    try {
      const orderCode = "MS" + Date.now().toString().slice(-8);
      const orderData = {
        orderCode,
        uid: currentUser.uid,
        name: (currentProfile && currentProfile.name) || currentUser.email,
        phone: (currentProfile && currentProfile.phone) || "—",
        email: currentUser.email,
        fee: currentProduct.price || 0,
        method, sender, trx,
        ministryShortForm: currentProduct.ministryName || "—",
        applicationUserId,
        productId: currentProduct._id,
        source: "product",
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await window.db.collection("orders").add(orderData);

      document.getElementById("opOrderCode").textContent = orderCode;
      document.getElementById("opFormWrap").style.display = "none";
      document.getElementById("opSuccessWrap").style.display = "block";
    } catch (err) {
      errEl.textContent = "জমা দিতে সমস্যা হয়েছে: " + (err && err.message ? err.message : "আবার চেষ্টা করুন।");
      errEl.style.display = "block";
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> অর্ডার নিশ্চিত করুন';
    }
  }
})();
