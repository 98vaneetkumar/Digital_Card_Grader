const path = require("path");
const loadPokemonCSV = require("./csvLoader").loadPokemonCSV;

let cachedPokemonData = null;

async function getPokemonData() {
    if (!cachedPokemonData) {
        const csvPath = path.join(__dirname, "..", "data", "all_cards.csv");
        cachedPokemonData = await loadPokemonCSV(csvPath);
        console.log("✅ Pokémon CSV loaded & cached");
    }
    return cachedPokemonData;
}

module.exports = getPokemonData;
