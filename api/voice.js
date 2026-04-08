const { generateSpeech } = require('../lib/ai');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const result = await generateSpeech(req.body?.text, req.body?.voiceId);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Voice generation fallback:', error);
        return res.status(200).json({
            useFallback: true,
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
        });
    }
};
