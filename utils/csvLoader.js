const fs = require("fs");
const csv = require("csv-parser");

let cachedPokemonData = null;

/**
 * Load & cache Pokémon CSV (loads only once)
 */
async function loadPokemonCSV(csvPath) {
  // ✅ Return cached data if already loaded
  if (cachedPokemonData) {
    return cachedPokemonData;
  }

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

        // 🔥 Precompute lowercase name for faster matching
        if (normalized.Name) {
          normalized._nameLower = normalized.Name.toLowerCase();
        }

        results.push(normalized);
      })
      .on("end", () => {
        cachedPokemonData = results;
        console.log(`📄 Pokémon CSV cached (${results.length} rows)`);
        resolve(results);
      })
      .on("error", (err) => {
        console.error("❌ CSV load failed:", err);
        reject(err);
      });
  });
}

module.exports = { loadPokemonCSV };
