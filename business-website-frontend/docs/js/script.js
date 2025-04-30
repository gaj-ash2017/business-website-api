// docs/js/script.js

// ─── API Base URL (production) ───
const API_BASE = "https://business-website-api.onrender.com";

// ─── URL Parameters & Admin Detection ───
const urlParams = new URLSearchParams(window.location.search);
// allow an explicit global override:
const isAdmin =
  window.IS_ADMIN === true ||
  urlParams.get("admin") === "true" ||
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

// ─── DOM Ready ───
window.addEventListener("DOMContentLoaded", () => {
  // Show or hide admin-only UI
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = isAdmin ? "inline-block" : "none";
  });

  // If edit mode, prefill the form
  const editId = urlParams.get("editId");
  if (editId) {
    prefillForm(editId).then(() => {
      const titleEl = document.getElementById("page-title");
      if (titleEl) titleEl.textContent = "Edit Product";
      const btn = document.querySelector("button[type=submit]");
      if (btn) btn.textContent = "Update Product";
    });
  }

  // Wire up form, sorting, and initial display
  handleProductForm();
  setupSorting();
  displayProducts();
});

// ─── Prefill Form for Edit ───
async function prefillForm(id) {
  const nameIn = document.getElementById("product-name");
  const descIn = document.getElementById("product-description");
  if (!nameIn || !descIn) return;

  try {
    const resp = await fetch(`${API_BASE}/products.json`);
    const products = await resp.json();
    const idNum = Number(id);
    let prod =
      products.find((p) => p.id === idNum) ||
      products.find((p) => p.id.toString() === id);
    if (prod) {
      nameIn.value = prod.name;
      descIn.value = prod.description;
    }
  } catch (err) {
    console.error("prefillForm error", err);
  }
}

// ─── Form Submit Handler ───
async function onSubmit(e) {
  e.preventDefault();
  const form = document.getElementById("product-form");
  form.removeEventListener("submit", onSubmit);
  const submitBtn = form.querySelector("button[type=submit]");
  if (submitBtn) submitBtn.disabled = true;

  const name = form.name.value.trim();
  const desc = form.description.value.trim();
  const file = form.image.files[0];
  if (!name || !desc) return alert("Name & description required.");

  try {
    const editId = urlParams.get("editId");
    if (editId) {
      // Update existing product
      let imagePath;
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        const upl = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: fd,
        });
        if (!upl.ok) throw new Error("Image upload failed");
        imagePath = (await upl.json()).imageUrl.slice(1);
      }
      const payload = { name, description: desc };
      if (imagePath) payload.image = imagePath;
      const upd = await fetch(`${API_BASE}/products/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!upd.ok) throw new Error("Update failed");
    } else {
      // Create new product
      if (!file) return alert("Please select an image.");
      const fd2 = new FormData();
      fd2.append("name", name);
      fd2.append("description", desc);
      fd2.append("image", file);
      const newp = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: fd2,
      });
      if (!newp.ok) throw new Error("Upload failed");
    }
    window.location.href = "confirm.html";
  } catch (err) {
    console.error("Form submit error", err);
    alert(err.message);
  }
}

// ─── Attach Form Handler ───
function handleProductForm() {
  const form = document.getElementById("product-form");
  if (!form) return;
  form.removeEventListener("submit", onSubmit);
  form.addEventListener("submit", onSubmit);
}

// ─── Sorting Setup ───
function setupSorting() {
  const sel = document.getElementById("sort-select");
  if (!sel) return;
  sel.addEventListener("change", () => displayProducts(sel.value));
}

// ─── Display Products ───
async function displayProducts(sortKey = "newest") {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";

  try {
    const resp = await fetch(`${API_BASE}/products.json`);
    const productsArray = await resp.json();

    // Deduplicate by ID
    const map = new Map();
    productsArray.forEach((p) => map.set(p.id, p));
    let products = Array.from(map.values()).filter(
      (p) =>
        p &&
        typeof p.id === "number" &&
        p.name?.trim() &&
        p.description?.trim() &&
        p.image
    );

    // Sort
    products.sort((a, b) => {
      if (sortKey === "newest") return b.id - a.id;
      if (sortKey === "oldest") return a.id - b.id;
      return a.name.localeCompare(b.name);
    });

    // Render
    const html = products
      .map(
        (p) => `
      <div class="product">
        <img 
  src="${API_BASE}/uploads/${p.image.split("/").pop()}" 
  alt="${p.name}"
>
        <div class="product-content"><h3>${p.name}</h3><p>${
          p.description
        }</p></div>
        ${
          isAdmin
            ? `<div class="product-buttons"><button onclick="editProduct(${
                p.id
              })">Edit</button><button onclick="deleteProduct('${p.image
                .split("/")
                .pop()}')">Delete</button></div>`
            : ""
        }
      </div>
    `
      )
      .join("");

    container.innerHTML = html;
  } catch (err) {
    console.error("displayProducts error", err);
    container.innerHTML = "<p>Error loading products.</p>";
  }
}

// ─── Delete Handler ───
async function deleteProduct(filename) {
  if (!confirm("Delete?")) return;
  await fetch(`${API_BASE}/upload/${filename}`, { method: "DELETE" });
  displayProducts();
}
window.deleteProduct = deleteProduct;

// ─── Edit Handler ───
function editProduct(id) {
  window.location.href = `add-product.html?admin=true&editId=${id}`;
}
window.editProduct = editProduct;
