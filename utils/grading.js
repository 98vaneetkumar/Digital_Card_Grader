const sharp = require("sharp");
const { extractPokemonName } = require("./ocr.js");

async function gradeCard(imagePath, pokemonData = []) {
  try {
    console.log("📌 Grading card:", imagePath);

    const detectedName = await extractPokemonName(imagePath, pokemonData);
    console.log("🔍 OCR detected name:", detectedName);

    const pokemon = detectedName
      ? pokemonData.find(
        p => (p.Name || p.name).toLowerCase() === detectedName.toLowerCase()
      )
      : null;
    console.log("📋 Pokémon found in CSV:", pokemon);

    // Load image in grayscale
    const image = sharp(imagePath).greyscale();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const width = info.width;
    const height = info.height;
    const pixels = data;

    // Detect bounding box of card with a small margin
    let minX = width, minY = height, maxX = 0, maxY = 0;
    const threshold = 200;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (pixels[i] < threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Add margin to bounding box
    const margin = 10;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(width - 1, maxX + margin);
    maxY = Math.min(height - 1, maxY + margin);

    if (maxX <= minX || maxY <= minY) {
      console.log("⚠️ No card detected visually.");
      return {
        edges: 0,
        centering: 0,
        surface: 0,
        corners: 0,
        overall: 0,
        pokemon: { Name: "Unknown" },
      };
    }

    // ----- Edge score -----
    let lapSum = 0, lapCount = 0;
    for (let y = minY + 1; y < maxY - 1; y++) {
      for (let x = minX + 1; x < maxX - 1; x++) {
        const i = y * width + x;
        const center = pixels[i];
        const neighbors =
          pixels[(y - 1) * width + x] +
          pixels[(y + 1) * width + x] +
          pixels[y * width + (x - 1)] +
          pixels[y * width + (x + 1)];
        lapSum += Math.abs(center * 4 - neighbors);
        lapCount++;
      }
    }
    const edgeScore = Math.min((lapSum / lapCount / 20) * 10, 10);

    // ----- Surface score -----
    const patchSize = 8;
    let surfaceSum = 0, patchCount = 0;
    for (let py = minY; py < maxY; py += patchSize) {
      for (let px = minX; px < maxX; px += patchSize) {
        const patchWidth = Math.min(patchSize, maxX - px);
        const patchHeight = Math.min(patchSize, maxY - py);
        const patchPixels2D = [];
        for (let y = 0; y < patchHeight; y++) {
          const row = [];
          for (let x = 0; x < patchWidth; x++) {
            row.push(pixels[(py + y) * width + (px + x)]);
          }
          patchPixels2D.push(row);
        }

        let gradSum = 0;
        for (let y = 1; y < patchHeight - 1; y++) {
          for (let x = 1; x < patchWidth - 1; x++) {
            const dx = patchPixels2D[y][x + 1] - patchPixels2D[y][x - 1];
            const dy = patchPixels2D[y + 1][x] - patchPixels2D[y - 1][x];
            gradSum += Math.sqrt(dx * dx + dy * dy);
          }
        }

        const maxGrad = patchWidth * patchHeight * 255 * 2;
        const patchScore = Math.max(0, 1 - gradSum / maxGrad);
        surfaceSum += patchScore;
        patchCount++;
      }
    }
    const surfaceScore = Math.min((surfaceSum / patchCount) * 10, 10);

    // ----- Centering score -----
    const cardCenterX = (minX + maxX) / 2;
    const cardCenterY = (minY + maxY) / 2;
    const offset = Math.hypot(cardCenterX - width / 2, cardCenterY - height / 2);
    const maxOffset = Math.hypot(width / 2, height / 2);
    const centerScore = Math.max(0, (1 - offset / maxOffset) * 10);

    // ----- Corners score -----
    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ];
    let cornerSum = 0;
    for (const corner of corners) {
      const sampleSize = 10;
      let darkSum = 0, count = 0;
      for (let dy = 0; dy < sampleSize; dy++) {
        for (let dx = 0; dx < sampleSize; dx++) {
          const px = Math.min(width - 1, Math.max(0, corner.x + dx - sampleSize / 2));
          const py = Math.min(height - 1, Math.max(0, corner.y + dy - sampleSize / 2));
          darkSum += pixels[py * width + px];
          count++;
        }
      }
      const avg = darkSum / count;
      const score = Math.max(0, 1 - avg / 255);
      cornerSum += score;
    }
    const cornerScore = Math.min((cornerSum / corners.length) * 10, 10);

    // ----- Overall -----
    const overall = (edgeScore + surfaceScore + centerScore + cornerScore) / 4;

    return {
      pokemon: pokemon ? { Name: pokemon.Name || pokemon.name } : { Name: detectedName || "Unknown" },
      edges: edgeScore.toFixed(2),
      centering: centerScore.toFixed(2),
      surface: surfaceScore.toFixed(2),
      corners: cornerScore.toFixed(2),
      overall: overall.toFixed(2),
    };

  } catch (err) {
    console.error("❌ Error grading card:", err);
    return {
      edges: 0,
      centering: 0,
      surface: 0,
      corners: 0,
      overall: 0,
      pokemon: { Name: "Unknown" },
    };
  }
}

module.exports = { gradeCard };
