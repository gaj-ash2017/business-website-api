// public_html/js/script.v4.js

// Core functionality for product form and display — debug logs removed for production

const API_BASE = "https://business-api.onrender.com";
const urlParams = new URLSearchParams(window.location.search);
const isAdmin =
  urlParams.get("admin") === "true" ||
  ["localhost", "127.0.0.1"].includes(location.hostname);

window.addEventListener("DOMContentLoaded", () => {
  // show/hide admin-only UI
  document
    .querySelectorAll(".admin-only")
    .forEach((el) => (el.style.display = isAdmin ? "inline-block" : "none"));

  const editId = urlParams.get("editId");
  if (editId) {
    prefillForm(editId).then(() => {
      const title = document.getElementById("page-title");
      if (title) title.textContent = "Edit Product";
      const btn = document.querySelector("button[type=submit]");
      if (btn) btn.textContent = "Update Product";
    });
  }

  handleProductForm();
  setupSorting();
  displayProducts();
});

async function prefillForm(id) {
  const nameIn = document.getElementById("product-name");
  const descIn = document.getElementById("product-description");
  if (!nameIn || !descIn) return;

  try {
    const resp = await fetch(`${API_BASE}/products.json`);
    const productsArray = await resp.json();
    const idNum = Number(id);
    let prod =
      productsArray.find((p) => p.id === idNum) ||
      productsArray.find((p) => p.id.toString() === id);
    if (prod) {
      nameIn.value = prod.name;
      descIn.value = prod.description;
    }
  } catch (_) {}
}

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
    alert(err.message);
  }
}

function handleProductForm() {
  const form = document.getElementById("product-form");
  if (!form) return;
  form.removeEventListener("submit", onSubmit);
  form.addEventListener("submit", onSubmit);
}

function setupSorting() {
  const sel = document.getElementById("sort-select");
  if (!sel) return;
  sel.addEventListener("change", () => displayProducts(sel.value));
}

async function displayProducts(sortKey = "newest") {
  const c = document.getElementById("product-list");
  if (!c) return;
  c.innerHTML = "";
  try {
    const resp = await fetch(`${API_BASE}/products.json`);
    const productsArray = await resp.json();
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
    products.sort((a, b) =>
      sortKey === "newest"
        ? b.id - a.id
        : sortKey === "oldest"
        ? a.id - b.id
        : a.name.localeCompare(b.name)
    );
    const html = products
      .map(
        (p) =>
          `<div class="product"><img src="${API_BASE}/${p.image}" alt="${
            p.name
          }" onerror="this.closest('.product').remove()"><div class="product-content"><h3>${
            p.name
          }</h3><p>${p.description}</p></div>${
            isAdmin
              ? `<div class="product-buttons"><button onclick="editProduct(${
                  p.id
                })">Edit</button><button onclick="deleteProduct('${p.image
                  .split("/")
                  .pop()}')">Delete</button></div>`
              : ""
          }</div>`
      )
      .join("");
    c.innerHTML = html;
  } catch (_) {
    c.innerHTML = "<p>Error loading products.</p>";
  }
}

async function deleteProduct(fn) {
  if (!confirm("Delete?")) return;
  await fetch(`${API_BASE}/upload/${fn}`, { method: "DELETE" });
  displayProducts();
}
window.deleteProduct = deleteProduct;

function editProduct(id) {
  window.location.href = `add-product.html?admin=true&editId=${id}`;
}
window.editProduct = editProduct;
