require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Load API key from environment variable
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.error('\n❌ ERROR: ANTHROPIC_API_KEY not found in environment variables!');
    console.error('Please create a .env file with your API key.\n');
    console.error('See .env.example for the format.\n');
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Proxy endpoint for Oracle API
app.post('/api/oracle', async (req, res) => {
    try {
        const { system, userPrompt } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                temperature: 0.9,
                system: system,
                messages: [{
                    role: 'user',
                    content: userPrompt
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', response.status, errorText);
            throw new Error(`API failed: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error in oracle endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🎮 DayAfterDay server running!`);
    console.log(`\n🌐 Open your browser to: http://localhost:${PORT}`);
    console.log(`\n🔮 Oracle API proxy ready\n`);
});
