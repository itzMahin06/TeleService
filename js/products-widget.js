/* js/products-widget.js
   Renders product cards (job circulars) into a mount element.
   Usage: window.renderProducts('mountId', { limit: 6 })   // recent products
          window.renderProducts('mountId')                  // all products
   Requires js/firebase-init.js to be loaded first. Products are public data —
   no login required to view them (see Firestore rules: products/{id} read:true).
*/

window.renderProducts = async function (mountId, opts) {
  opts = opts || {};
  const mount = document.getElementById(mountId);
  if (!mount) return;

  mount.innerHTML = `<div class="loading-row"><i class="fa-solid fa-circle-notch"></i>প্রোডাক্ট লোড হচ্ছে...</div>`;

  await window.MahinFirebaseReady;

  let query = window.db.collection("products").orderBy("createdAt", "desc");
  if (opts.limit) query = query.limit(opts.limit);

  query.onSnapshot(
    (snap) => {
      const products = [];
      snap.forEach((doc) => products.push({ _id: doc.id, ...doc.data() }));
      window._allProducts = products;
      paintProducts(mount, products);
    },
    (err) => {
      mount.innerHTML = `<div class="empty-orders"><i class="fa-solid fa-triangle-exclamation"></i><br>প্রোডাক্ট লোড করতে সমস্যা হয়েছে।<br><small>${err.message}</small></div>`;
    }
  );
};

function paintProducts(mount, products) {
  if (products.length === 0) {
    mount.innerHTML = `<div class="empty-orders"><i class="fa-regular fa-folder-open"></i><br>এখনো কোনো প্রোডাক্ট যোগ করা হয়নি।</div>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  mount.innerHTML = `<div class="products-grid">` + products.map((p) => {
    const expired = p.lastDate && p.lastDate < today;
    const lastDateText = p.lastDate ? formatDateBn(p.lastDate) : "উল্লেখ নেই";
    const img = p.imageUrl
      ? `<div class="product-img" style="background-image:url('${escapeAttr(p.imageUrl)}')">${expired ? '<span class="product-expired-tag">মেয়াদ শেষ</span>' : ""}</div>`
      : `<div class="product-img"><i class="fa-regular fa-image"></i>${expired ? '<span class="product-expired-tag">মেয়াদ শেষ</span>' : ""}</div>`;

    return `
    <div class="product-card">
      ${img}
      <div class="product-body">
        <div class="product-ministry">${p.ministryName || "—"}</div>
        <div class="product-meta">
          <span><i class="fa-regular fa-calendar"></i> শেষ তারিখঃ ${lastDateText}</span>
          <span class="product-price">৳${p.price || 0}</span>
        </div>
        <button class="submit-btn" ${expired ? "disabled" : ""} onclick="window.openOrderPopup('${p._id}')">
          <i class="fa-solid fa-bolt"></i> ${expired ? "মেয়াদ শেষ হয়েছে" : "অর্ডার করুন"}
        </button>
      </div>
    </div>`;
  }).join("") + `</div>`;
}

function formatDateBn(isoDate) {
  try {
    return new Date(isoDate + "T00:00:00").toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
  } catch (e) {
    return isoDate;
  }
}
function escapeAttr(str) {
  return String(str).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
}
