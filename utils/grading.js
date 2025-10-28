const sharp = require("sharp");
const Tesseract = require("tesseract.js");

async function gradeCard(imagePath, pokemonData = []) {
  try {
    console.log("📌 Grading card:", imagePath);

    // ===== 1️⃣ OCR DETECTION =====
    const image = sharp(imagePath);
    const { width, height } = await image.metadata();

    if (!width || !height) throw new Error("Invalid image metadata");

    const cropHeight = Math.floor(height * 0.25); // crop top 25%
    const buffer = await image.extract({ left: 0, top: 0, width, height: cropHeight }).toBuffer();

    const result = await Tesseract.recognize(buffer, "eng", { logger: (m) => { } });
    const text = result.data.text?.toLowerCase().trim() || "";
    const confidence = result.data.confidence || 0;

    console.log(`🔍 OCR detected text: "${text}" (conf: ${confidence})`);

    if (confidence < 25 || text.length < 2) {
      console.log("🚫 Low OCR confidence or empty text — skipping grading.");
      return { success: false, reason: "low_confidence" };
    }

    // ===== 2️⃣ INVALID WORD FILTER =====
    const invalidWords = ["trainer", "energy", "supporter", "item", "stage", "card", "terminal", "output"];
    if (invalidWords.some((w) => text.includes(w))) {
      console.log("🚫 OCR text is generic or not a Pokémon card.");
      return { success: false, reason: "invalid_text" };
    }

    // ===== 3️⃣ MATCH POKÉMON NAME =====
    const matched = pokemonData.find((p) => {
      const name = (p.Name || p.name || "").toLowerCase();
      return name && text.includes(name);
    });

    if (!matched) {
      console.log("🚫 No matching Pokémon found in dataset.");
      return { success: false, reason: "no_match" };
    }

    const detectedName = matched.Name || matched.name;
    console.log("✅ Pokémon found:", detectedName);

    // ===== 4️⃣ ASPECT RATIO VALIDATION =====
    const ratio = width / height;
    if (ratio < 0.6 || ratio > 0.8) {
      console.log(`🚫 Aspect ratio ${ratio.toFixed(2)} not card-like. Skipping.`);
      return { success: false, reason: "bad_aspect_ratio", pokemon: detectedName };
    }

    // ===== 5️⃣ VISUAL ANALYSIS =====
    const grayImage = sharp(imagePath).greyscale();
    const { data, info } = await grayImage.raw().toBuffer({ resolveWithObject: true });
    const pixels = data;
    const w = info.width;
    const h = info.height;

    let minX = w,
      minY = h,
      maxX = 0,
      maxY = 0;
    const threshold = 200;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (pixels[i] < threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      console.log("⚠️ No visible card borders detected.");
      return { success: false, reason: "no_borders", pokemon: detectedName };
    }

    // ===== 6️⃣ EDGE SCORING =====
    let lapSum = 0,
      lapCount = 0;
    for (let y = minY + 1; y < maxY - 1; y++) {
      for (let x = minX + 1; x < maxX - 1; x++) {
        const i = y * w + x;
        const center = pixels[i];
        const neighbors =
          pixels[(y - 1) * w + x] + pixels[(y + 1) * w + x] + pixels[y * w + (x - 1)] + pixels[y * w + (x + 1)];
        lapSum += Math.abs(center * 4 - neighbors);
        lapCount++;
      }
    }
    const edgeScore = Math.min((lapSum / lapCount / 20) * 10, 10);

    // ===== 7️⃣ SIMULATED SUB-SCORES =====
    const centering = 8.5 + Math.random() * 1.0;
    const surface = 9.0 + Math.random() * 0.5;
    const corners = 8.8 + Math.random() * 0.7;

    const overall = ((edgeScore + centering + surface + corners) / 4).toFixed(2);

    console.log("\n================== 🧾 CARD GRADING SUMMARY ==================");
    console.log(`📛 Pokémon: ${detectedName}`);
    console.log(`🧩 Edges: ${edgeScore.toFixed(2)}`);
    console.log(`⭐ Overall Grade: ${overall}/10`);
    console.log("==============================================================\n");

    return {
      success: true,
      pokemon: { Name: detectedName },
      edges: edgeScore.toFixed(2),
      centering: centering.toFixed(2),
      surface: surface.toFixed(2),
      corners: corners.toFixed(2),
      overall,
    };
  } catch (err) {
    console.error("❌ Error grading card:", err.message);
    return { success: false, reason: "internal_error" };
  }
}

module.exports = { gradeCard };
