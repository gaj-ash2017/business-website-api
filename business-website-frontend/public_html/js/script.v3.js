// public_html/js/script.v3.js

// ─── Always log when this loads ───
console.log("🟢 script.v3.js loaded");

// ─── API base (dev) ───
const API_BASE = "http://localhost:3000";

// ─── Detect admin & editId ───
const params = new URLSearchParams(location.search);
const isAdmin = params.get("admin") === "true";
const editId = params.get("editId");
console.log("🌐 location.search =", location.search);
console.log("🔍 editId =", editId);

// ─── DOM ready ───
window.addEventListener("DOMContentLoaded", () => {
  // show admin‐only bits
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = isAdmin ? "inline-block" : "none";
  });

  // if editing, prefill form
  if (editId) {
    console.log("✏️ Prefilling form for", editId);
    prefillForm(editId);
    document.getElementById("page-title").textContent = "Edit Product";
    document.querySelector("button[type=submit]").textContent =
      "Update Product";
  }

  handleProductForm();
});

// ─── prefillForm ───
async function prefillForm(id) {
  const nameIn = document.getElementById("product-name");
  const descIn = document.getElementById("product-description");
  if (!nameIn || !descIn) {
    console.warn("Form inputs not found for prefill");
    return;
  }
  try {
    const products = await (await fetch(`${API_BASE}/products.json`)).json();
    const p = products.find((x) => x.id.toString() === id);
    console.log("🔎 found product", p);
    if (p) {
      nameIn.value = p.name;
      descIn.value = p.description;
    }
  } catch (err) {
    console.error("Prefill error", err);
  }
}

// ─── handle add/update ───
function handleProductForm() {
  const form = document.getElementById("product-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const desc = form.description.value.trim();
    const file = form.image.files[0];
    if (!name || !desc) return alert("Name & description required.");

    try {
      let imageUrl;
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error("Upload failed");
        imageUrl = (await res.json()).imageUrl;
      }

      if (editId) {
        // update metadata
        await fetch(`${API_BASE}/products/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: desc,
            ...(imageUrl ? { image: imageUrl.slice(1) } : {}),
          }),
        });
      } else {
        // create new
        const fd2 = new FormData();
        fd2.append("name", name);
        fd2.append("description", desc);
        fd2.append("image", file);
        const res2 = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: fd2,
        });
        if (!res2.ok) throw new Error("Upload failed");
      }

      location.href = "confirm.html";
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });
}
