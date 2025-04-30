// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
// products.json lives in public_html
const dataPath = path.join(__dirname, "public_html", "products.json");

// Enable CORS
app.use(cors());
app.options("*", cors());

// Parse JSON and form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup: store uploads in public_html/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "public_html/uploads")),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// Serve static front-end and uploads
app.use(express.static(path.join(__dirname, "public_html")));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "public_html/uploads"))
);

// GET products.json
app.get("/products.json", (req, res) => {
  res.sendFile(dataPath);
});

// POST /upload → save image & append product
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  const imagePath = `/uploads/${req.file.filename}`;
  let products = [];
  try {
    products = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {}
  products.push({
    id: Date.now(),
    name: req.body.name || "",
    description: req.body.description || "",
    image: imagePath.slice(1),
  });
  fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
  res.json({ imageUrl: imagePath });
});

// DELETE /upload/:filename → remove image file & JSON entry
app.delete("/upload/:filename", (req, res) => {
  const fname = req.params.filename;
  fs.unlink(path.join(__dirname, "public_html/uploads", fname), () => {
    let products = [];
    try {
      products = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    } catch {}
    products = products.filter((p) => !p.image.endsWith(fname));
    fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
    res.json({ success: true });
  });
});

// PUT /products/:id → update name/description/image
app.put("/products/:id", (req, res) => {
  const id = Number(req.params.id);
  let products = [];
  try {
    products = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {}
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  products[idx].name = req.body.name ?? products[idx].name;
  products[idx].description = req.body.description ?? products[idx].description;
  if (req.body.image) products[idx].image = req.body.image;
  fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
