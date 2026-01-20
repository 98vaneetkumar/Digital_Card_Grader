const fs = require('fs');
const csv = require('csv-parser');

function loadPokemonCSV(csvPath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        // Normalize key names like Name, Type, HP, etc.
        const normalized = {};
        for (let key in data) {
          normalized[key.trim()] = data[key]?.trim();
        }
        results.push(normalized);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

module.exports = { loadPokemonCSV };
