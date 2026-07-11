/* js/profile-widget.js
   Injects a small profile icon button into the header (inside
   #profileWidgetMount) and a centered modal where the logged-in user (or
   admin) can view and edit their own name & phone number. Include this
   AFTER js/firebase-init.js on any page that has a
   <div id="profileWidgetMount"></div> in its header.

   Dispatches a "mahin:profile-updated" event on window whenever the profile
   is loaded or saved, with { detail: profileObject }, so page-specific code
   (like index.html's profile chip) can stay in sync.
*/

(function () {
  const mountId = "profileWidgetMount";

  async function boot() {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const user = await window.getCurrentUser();
    if (!user) return;

    mount.innerHTML = `
      <button class="btn-pill icon-only" id="pwOpenBtn" title="প্রোফাইল">
        <i class="fa-solid fa-circle-user"></i>
      </button>
    `;

    injectModal();

    document.getElementById("pwOpenBtn").addEventListener("click", () => openModal(user));
    document.getElementById("pwOverlay").addEventListener("click", closeModal);
    document.getElementById("pwCloseBtn").addEventListener("click", closeModal);
    document.getElementById("pwEditBtn").addEventListener("click", () => toggleEdit(true));
    document.getElementById("pwCancelBtn").addEventListener("click", () => { toggleEdit(false); loadProfile(user); });
    document.getElementById("pwSaveBtn").addEventListener("click", () => saveProfile(user));

    loadProfile(user);
  }

  function injectModal() {
    if (document.getElementById("pwOverlay")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="pw-modal" id="pwOverlay">
        <div class="pw-box" onclick="event.stopPropagation()">
          <div class="pw-head">
            <h3><i class="fa-solid fa-id-card"></i> আমার প্রোফাইল</h3>
            <button id="pwCloseBtn"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="pw-body">
            <div class="profile-chip" style="margin-bottom:18px;">
              <div class="avatar" id="pwAvatar">?</div>
              <div class="who">
                <b id="pwName2">...</b>
                <span id="pwRoleTag"></span>
              </div>
            </div>

            <div class="error-msg" id="pwError"></div>
            <div class="ok-msg" id="pwOk"></div>

            <div class="field">
              <label>নাম</label>
              <input type="text" id="pwName" readonly>
            </div>
            <div class="field">
              <label>ফোন নম্বর</label>
              <input type="tel" id="pwPhone" maxlength="11" readonly>
            </div>
            <div class="field">
              <label>ইমেইল</label>
              <input type="email" id="pwEmail" readonly>
              <div class="hint">ইমেইল পরিবর্তনযোগ্য নয়</div>
            </div>

            <div id="pwViewActions">
              <button class="submit-btn" id="pwEditBtn"><i class="fa-solid fa-pen"></i> তথ্য সম্পাদনা করুন</button>
            </div>
            <div id="pwEditActions" style="display:none; gap:12px;">
              <button class="action-btn" id="pwCancelBtn" style="flex:1;"><i class="fa-solid fa-xmark"></i> বাতিল</button>
              <button class="submit-btn" id="pwSaveBtn" style="flex:1; margin-top:0;"><i class="fa-solid fa-check"></i> সংরক্ষণ করুন</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function openModal(user) {
    document.getElementById("pwOverlay").classList.add("open");
  }
  function closeModal() {
    document.getElementById("pwOverlay").classList.remove("open");
    toggleEdit(false);
  }
  function toggleEdit(on) {
    document.getElementById("pwName").readOnly = !on;
    document.getElementById("pwPhone").readOnly = !on;
    document.getElementById("pwViewActions").style.display = on ? "none" : "block";
    document.getElementById("pwEditActions").style.display = on ? "flex" : "none";
    document.getElementById("pwError").style.display = "none";
    document.getElementById("pwOk").style.display = "none";
  }

  async function loadProfile(user) {
    document.getElementById("pwEmail").value = user.email || "";
    try {
      const snap = await window.db.collection("users").doc(user.uid).get();
      const profile = snap.exists ? snap.data() : { name: user.email, phone: "" };
      applyProfile(user, profile);
    } catch (e) {
      applyProfile(user, { name: user.email, phone: "" });
    }
  }

  function applyProfile(user, profile) {
    document.getElementById("pwName").value = profile.name || "";
    document.getElementById("pwPhone").value = profile.phone || "";
    document.getElementById("pwName2").textContent = profile.name || user.email;
    document.getElementById("pwAvatar").textContent = (profile.name || user.email || "?").trim().charAt(0).toUpperCase();
    document.getElementById("pwRoleTag").textContent = window.isAdminEmail(user.email) ? "অ্যাডমিন" : "ব্যবহারকারী";

    window.currentUserProfile = profile;
    window.dispatchEvent(new CustomEvent("mahin:profile-updated", { detail: profile }));
  }

  async function saveProfile(user) {
    const errEl = document.getElementById("pwError");
    const okEl = document.getElementById("pwOk");
    errEl.style.display = "none";
    okEl.style.display = "none";

    const name = document.getElementById("pwName").value.trim();
    const phone = document.getElementById("pwPhone").value.trim();

    if (!name) { errEl.textContent = "নাম খালি রাখা যাবে না।"; errEl.style.display = "block"; return; }
    if (!/^01[0-9]{9}$/.test(phone)) { errEl.textContent = "ফোন নম্বরটি সঠিক ফরম্যাটে দিন (উদাহরণঃ 01712345678)।"; errEl.style.display = "block"; return; }

    const saveBtn = document.getElementById("pwSaveBtn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';

    try {
      await window.db.collection("users").doc(user.uid).set({ name, phone, email: user.email }, { merge: true });
      applyProfile(user, { name, phone, email: user.email });
      toggleEdit(false);
      okEl.textContent = "তথ্য সংরক্ষণ হয়েছে ✓";
      okEl.style.display = "block";
    } catch (e) {
      errEl.textContent = "সংরক্ষণ করতে সমস্যা হয়েছে: " + (e && e.message ? e.message : "আবার চেষ্টা করুন।");
      errEl.style.display = "block";
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> সংরক্ষণ করুন';
    }
  }

  window.MahinFirebaseReady.then(boot);
})();
