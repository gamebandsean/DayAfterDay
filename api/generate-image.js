const { generateImage } = require('../lib/ai');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const result = await generateImage(req.body?.prompt);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Image generation fallback:', error);
        return res.status(200).json({
            usePlaceholder: true,
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
        });
    }
};
