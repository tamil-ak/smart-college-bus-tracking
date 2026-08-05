import sharp from 'sharp';

const svgPath = './public/favicon.svg';

async function generatePNGs() {
  const sizes = [16, 32, 48];
  
  for (const size of sizes) {
    const outputPath = `./public/favicon-${size}x${size}.png`;
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Successfully generated: ${outputPath}`);
  }
}

generatePNGs().catch(err => {
  console.error('Error during PNG generation:', err);
  process.exit(1);
});
