const fs = require("fs");
const csv = require("csv-parser");

let cachedPokemonData = null;
let cachedMtime = null;

/**
 * Load & cache Pokémon CSV
 * Auto-reloads when CSV file is updated
 */
async function loadPokemonCSV(csvPath) {
  // 🔍 Get last modified time of CSV
  const { mtimeMs } = fs.statSync(csvPath);

  // ✅ Use cache only if file has NOT changed
  if (cachedPokemonData && cachedMtime === mtimeMs) {
    return cachedPokemonData;
  }

  // 🔄 CSV is new or updated → reload
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (data) => {
        const normalized = {};

        // Normalize keys + values
        for (const key in data) {
          const cleanKey = key.trim();
          const value = data[key];

          normalized[cleanKey] =
            typeof value === "string" ? value.trim() : value;
        }

        // 🔥 Precompute lowercase name for fast OCR matching
        if (normalized.Name) {
          normalized._nameLower = normalized.Name.toLowerCase();
        }

        results.push(normalized);
      })
      .on("end", () => {
        cachedPokemonData = results;
        cachedMtime = mtimeMs;

        console.log(`🔄 Pokémon CSV loaded (${results.length} rows)`);
        resolve(results);
      })
      .on("error", (err) => {
        console.error("❌ CSV load failed:", err);
        reject(err);
      });
  });
}

module.exports = { loadPokemonCSV };
