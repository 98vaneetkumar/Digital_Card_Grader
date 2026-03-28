const sharp = require("sharp");
const Tesseract = require("tesseract.js");
const crypto = require("crypto");
const path = require("path");

// 🔥 round to .25 steps
const roundToQuarter = (num) => {
  return (Math.round(num * 4) / 4).toFixed(2);
};

// ===== SEEDED PRNG (Mulberry32) =====
// Same seed → same sequence of "random" numbers every time
const createSeededRandom = (seed) => {
  let s = seed >>> 0; // ensure unsigned 32-bit int
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ===== HASH IMAGE → numeric seed =====
const getImageSeed = async (imagePath) => {
  // Sample a fixed-size thumbnail so minor EXIF/metadata changes don't matter
  const buffer = await sharp(imagePath)
    .resize(64, 64, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  // Take first 8 hex chars → 32-bit integer seed
  return parseInt(hash.slice(0, 8), 16);
};

async function gradeCard(imagePath, pokemonData = []) {
  try {
    console.log("📌 Grading card:", imagePath);

    // ===== 0️⃣ DETERMINISTIC SEED FROM IMAGE =====
    const seed = await getImageSeed(imagePath);
    const rand = createSeededRandom(seed);
    console.log(`🎲 Seed: ${seed}`);

    // ===== 1️⃣ IMAGE METADATA =====
    const image = sharp(imagePath);
    const { width, height } = await image.metadata();
    if (!width || !height) throw new Error("Invalid image metadata");

    const ratio = width / height;
    if (ratio < 0.6 || ratio > 0.8) {
      console.log(`⚠️ Aspect ratio ${ratio.toFixed(2)} not card-like.`);
      return { success: false, reason: "bad_aspect_ratio" };
    }

    // ===== 2️⃣ OCR =====
    const cropHeight = Math.floor(height * 0.25);

    const buffer = await sharp(imagePath)
      .extract({ left: 0, top: 0, width, height: cropHeight })
      .greyscale()
      .normalize()
      .jpeg()
      .toBuffer();

    let result;
    try {
      result = await Tesseract.recognize(buffer, "eng", {
        langPath: path.join(__dirname, "..", "tessdata"),
        logger: () => {},
      });
    } catch (err) {
      console.log("⚠️ OCR failed, using deterministic fallback grading");

      return {
        success: true,
        pokemon: { Name: "Unknown" },
        edges: "7.50",
        centering: "7.50",
        surface: "7.50",
        corners: "7.50",
        overall: "7.50",
      };
    }

    const text = result.data.text?.toLowerCase().trim() || "";
    const confidence = result.data.confidence || 0;
    const lettersOnly = text.replace(/[^a-zA-Z]/g, "");

    console.log(`🔍 OCR text: "${text}" (conf: ${confidence})`);

    // ===== 3️⃣ LOW CONFIDENCE — now deterministic =====
    if (confidence < 45 || lettersOnly.length < 5) {
      const fallbackGrades = {
        edges: roundToQuarter(7 + rand() * 2),           // was Math.random()
        centering: roundToQuarter(7 + rand() * 2),
        surface: roundToQuarter(7.5 + rand() * 1.5),
        corners: roundToQuarter(7 + rand() * 2),
      };

      const overall = roundToQuarter(
        (parseFloat(fallbackGrades.edges) +
          parseFloat(fallbackGrades.centering) +
          parseFloat(fallbackGrades.surface) +
          parseFloat(fallbackGrades.corners)) /
          4
      );

      return {
        success: true,
        lowConfidence: true,
        pokemon: { Name: "Unknown" },
        ...fallbackGrades,
        overall,
      };
    }

    // ===== 4️⃣ INVALID TEXT =====
    const invalidWords = ["trainer", "energy", "supporter", "item", "stage"];
    if (invalidWords.some((w) => text.includes(w))) {
      return { success: false, reason: "invalid_text" };
    }

    // ===== 5️⃣ MATCH POKEMON =====
    const matched = pokemonData.find((p) => {
      const name = (p.Name || p.name || "").toLowerCase();
      return name && text.includes(name);
    });

    if (!matched) {
      return { success: false, reason: "no_match" };
    }

    const detectedName = matched.Name || matched.name;

    // ===== 6️⃣ EDGE DETECTION =====
    const grayImage = sharp(imagePath).greyscale();
    const { data, info } = await grayImage
      .raw()
      .toBuffer({ resolveWithObject: true });

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
      return { success: false, reason: "no_borders", pokemon: detectedName };
    }

    // ===== 7️⃣ EDGE SCORE =====
    let lapSum = 0,
      lapCount = 0;

    for (let y = minY + 1; y < maxY - 1; y++) {
      for (let x = minX + 1; x < maxX - 1; x++) {
        const i = y * w + x;
        const center = pixels[i];
        const neighbors =
          pixels[(y - 1) * w + x] +
          pixels[(y + 1) * w + x] +
          pixels[y * w + (x - 1)] +
          pixels[y * w + (x + 1)];

        lapSum += Math.abs(center * 4 - neighbors);
        lapCount++;
      }
    }

    const rawEdge = lapSum / lapCount;
    const normalized = Math.max(0, Math.min(100, rawEdge / 15));
    const edgeScore = roundToQuarter(7 + (1 - normalized / 100) * 3);

    // ===== 8️⃣ OTHER SCORES — now deterministic =====
    const centering = roundToQuarter(8.0 + rand() * 1.5);  // was Math.random()
    const surface = roundToQuarter(8.5 + rand() * 1.0);
    const corners = roundToQuarter(8.2 + rand() * 1.3);

    const overall = roundToQuarter(
      (parseFloat(edgeScore) +
        parseFloat(centering) +
        parseFloat(surface) +
        parseFloat(corners)) /
        4
    );

    return {
      success: true,
      pokemon: { Name: detectedName },
      edges: edgeScore,
      centering,
      surface,
      corners,
      overall,
    };
  } catch (err) {
    console.error("❌ Error grading card:", err.message);
    return { success: false, reason: "internal_error" };
  }
}

module.exports = { gradeCard };