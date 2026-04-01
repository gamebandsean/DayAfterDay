require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { generateImage } = require('../lib/ai');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'newborns');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

const NEWBORN_VARIANTS = [
    {
        slug: 'black',
        label: 'Black',
        race: 'Black',
        physicalDescription: 'dark brown skin, soft dark curls, round cheeks, warm brown eyes',
        prompt: 'photorealistic newborn baby portrait, Black baby, peaceful expression, wrapped in a neutral swaddle, soft daylight, hospital portrait realism, head and shoulders, gentle warm tones, no text'
    },
    {
        slug: 'east-asian',
        label: 'East Asian',
        race: 'East Asian',
        physicalDescription: 'light warm skin, fine dark hair, almond-shaped brown eyes, soft round face',
        prompt: 'photorealistic newborn baby portrait, East Asian baby, peaceful expression, wrapped in a neutral swaddle, soft daylight, hospital portrait realism, head and shoulders, gentle warm tones, no text'
    },
    {
        slug: 'south-asian',
        label: 'South Asian',
        race: 'South Asian',
        physicalDescription: 'medium brown skin, thick dark hair, deep brown eyes, soft rounded features',
        prompt: 'photorealistic newborn baby portrait, South Asian baby, peaceful expression, wrapped in a neutral swaddle, soft daylight, hospital portrait realism, head and shoulders, gentle warm tones, no text'
    },
    {
        slug: 'white',
        label: 'White',
        race: 'White',
        physicalDescription: 'fair skin, light brown hair, grey-blue eyes, soft pink cheeks',
        prompt: 'photorealistic newborn baby portrait, White baby, peaceful expression, wrapped in a neutral swaddle, soft daylight, hospital portrait realism, head and shoulders, gentle warm tones, no text'
    },
    {
        slug: 'latino',
        label: 'Latino',
        race: 'Latino',
        physicalDescription: 'golden tan skin, dark wavy hair, brown eyes, soft rounded cheeks',
        prompt: 'photorealistic newborn baby portrait, Latino baby, peaceful expression, wrapped in a neutral swaddle, soft daylight, hospital portrait realism, head and shoulders, gentle warm tones, no text'
    },
    {
        slug: 'middle-eastern',
        label: 'Middle Eastern',
        race: 'Middle Eastern',
        physicalDescription: 'olive skin, dark hair, dark brown eyes, soft oval face',
        prompt: 'photorealistic newborn baby portrait, Middle Eastern baby, peaceful expression, wrapped in a neutral swaddle, soft daylight, hospital portrait realism, head and shoulders, gentle warm tones, no text'
    }
];

async function ensureOutputDir() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function writeImage(filePath, imageData) {
    const buffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(filePath, buffer);
}

async function main() {
    await ensureOutputDir();

    const manifest = [];

    for (const variant of NEWBORN_VARIANTS) {
        const file = `${variant.slug}.png`;
        const outputPath = path.join(OUTPUT_DIR, file);

        console.log(`Generating ${variant.label} newborn...`);
        const result = await generateImage(variant.prompt);
        await writeImage(outputPath, result.imageData);

        manifest.push({
            file,
            label: variant.label,
            race: variant.race,
            physicalDescription: variant.physicalDescription
        });
    }

    await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Saved ${manifest.length} newborn portraits to ${OUTPUT_DIR}`);
}

main().catch((error) => {
    console.error('Failed to generate newborn portraits:', error);
    process.exit(1);
});
