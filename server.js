require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const {
    callDestinyOracle,
    callOracle,
    callOracleWithPortrait,
    ensureImageEnv,
    ensureOracleEnv,
    generateImage,
    generateSpeech
} = require('./lib/ai');

const app = express();
const PORT = process.env.PORT || 3000;
const NEWBORNS_DIR = path.join(__dirname, 'public', 'newborns');
const LONG_CACHE = 'public, max-age=31536000, immutable';
const SHORT_CACHE = 'public, max-age=300, must-revalidate';

app.use(cors());
app.use(express.json());
app.use('/public/newborns', express.static(NEWBORNS_DIR, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('manifest.json')) {
            res.setHeader('Cache-Control', SHORT_CACHE);
            return;
        }

        res.setHeader('Cache-Control', LONG_CACHE);
    }
}));
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

app.post('/api/oracle-destiny', async (req, res) => {
    try {
        const result = await callDestinyOracle(req.body?.system, req.body?.userPrompt);
        res.json(result);
    } catch (error) {
        console.error('Error in oracle destiny endpoint:', error);
        res.status(error.statusCode || 500).json({
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
            ...(error.rawText ? { rawText: error.rawText } : {}),
        });
    }
});

// Combined endpoint to avoid a second portrait round trip after Oracle evaluation.
app.post('/api/oracle-portrait', async (req, res) => {
    try {
        const result = await callOracleWithPortrait(req.body?.system, req.body?.userPrompt);
        res.json(result);
    } catch (error) {
        console.error('Error in oracle portrait endpoint:', error);
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
        console.error('Image generation fallback:', error);
        res.status(200).json({
            usePlaceholder: true,
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
        });
    }
});

app.post('/api/voice', async (req, res) => {
    try {
        const result = await generateSpeech(req.body?.text);
        res.json(result);
    } catch (error) {
        console.error('Voice generation fallback:', error);
        res.status(200).json({
            useFallback: true,
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🎮 Minor Decisions server running!`);
    console.log(`\n🌐 Open your browser to: http://localhost:${PORT}`);
    console.log(`\n🔮 Oracle API proxy ready`);
    console.log(`\n🖼️  Gemini Image generation ready\n`);
});
