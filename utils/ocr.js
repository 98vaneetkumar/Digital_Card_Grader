const sharp = require("sharp");
const Tesseract = require("tesseract.js");

async function extractPokemonName(imagePath, pokemonData = []) {
  try {
    const image = sharp(imagePath);
    const { width, height } = await image.metadata();

    // Crop top 20% where card name usually is
    const cropHeight = Math.floor(height * 0.2);
    const buffer = await image
      .extract({ left: 0, top: 0, width, height: cropHeight })
      .toBuffer();

    // OCR only top region
    const result = await Tesseract.recognize(buffer, 'eng');
    const text = result.data.text?.toLowerCase() || "";

    if (!text.trim()) return null;

    // Safe check for Name field & fuzzy match
    const matched = pokemonData.find(p => {
      const name = p.Name || p.name;
      if (!name) return false;
      return text.includes(name.toLowerCase());
    });

    return matched ? matched.Name || matched.name : null;

  } catch (err) {
    console.error("❌ OCR error:", err);
    return null;
  }
}

module.exports = { extractPokemonName };
