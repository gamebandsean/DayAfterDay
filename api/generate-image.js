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
        return res.status(error.statusCode || 500).json({
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
        });
    }
};
