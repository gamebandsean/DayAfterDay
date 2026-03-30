require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { callOracle, ensureImageEnv, ensureOracleEnv, generateImage } = require('./lib/ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

try {
    ensureOracleEnv();
    ensureImageEnv();
} catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error('Please update your .env file.');
    console.error('See .env.example for the expected format.\n');
    process.exit(1);
}

// Proxy endpoint for Oracle API
app.post('/api/oracle', async (req, res) => {
    try {
        const result = await callOracle(req.body?.system, req.body?.userPrompt);
        res.json(result);
    } catch (error) {
        console.error('Error in oracle endpoint:', error);
        res.status(error.statusCode || 500).json({
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
            ...(error.rawText ? { rawText: error.rawText } : {}),
        });
    }
});

// Proxy endpoint for Gemini native image generation
app.post('/api/generate-image', async (req, res) => {
    try {
        const result = await generateImage(req.body?.prompt);
        res.json(result);
    } catch (error) {
        console.error('Error in image generation endpoint:', error);
        res.status(error.statusCode || 500).json({
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🎮 DayAfterDay server running!`);
    console.log(`\n🌐 Open your browser to: http://localhost:${PORT}`);
    console.log(`\n🔮 Oracle API proxy ready`);
    console.log(`\n🖼️  Gemini Image generation ready\n`);
});
