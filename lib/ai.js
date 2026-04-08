require('dotenv').config();
const fetch = require('node-fetch');

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';
const GEMINI_IMAGE_MODEL =
    process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
const ELEVENLABS_MODEL_ID =
    process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';

function getEnv() {
    return {
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
        elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
        elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
    };
}

function ensureOracleEnv() {
    const { anthropicApiKey } = getEnv();
    if (!anthropicApiKey) {
        throw new Error('ANTHROPIC_API_KEY not found in environment variables.');
    }
}

function ensureImageEnv() {
    const { geminiApiKey } = getEnv();
    if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY not found in environment variables.');
    }
}

function ensureVoiceEnv() {
    const { elevenLabsApiKey, elevenLabsVoiceId } = getEnv();
    if (!elevenLabsApiKey) {
        throw new Error('ELEVENLABS_API_KEY not found in environment variables.');
    }

    if (!elevenLabsVoiceId) {
        throw new Error('ELEVENLABS_VOICE_ID not found in environment variables.');
    }
}

function ensureVoiceApiKey() {
    const { elevenLabsApiKey } = getEnv();
    if (!elevenLabsApiKey) {
        throw new Error('ELEVENLABS_API_KEY not found in environment variables.');
    }
}

function getAnthropicTextContent(content) {
    if (!Array.isArray(content)) return '';

    return content
        .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n')
        .trim();
}

function stripCodeFences(text) {
    return text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function extractJsonObject(text) {
    const cleaned = stripCodeFences(text);

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);
            return JSON.parse(possibleJson);
        }

        throw error;
    }
}

function normalizeOraclePayload(payload) {
    return {
        destiny:
            typeof payload?.destiny === 'string' && payload.destiny.trim()
                ? payload.destiny.trim()
                : 'Mysterious Soul',
        moral_alignment:
            payload?.moral_alignment === 'good' ||
            payload?.moral_alignment === 'bad' ||
            payload?.moral_alignment === 'grey'
                ? payload.moral_alignment
                : 'grey',
        justification:
            typeof payload?.justification === 'string' && payload.justification.trim()
                ? payload.justification.trim()
                : "The Oracle's vision is clouded...",
        adult_quote:
            typeof payload?.adult_quote === 'string' && payload.adult_quote.trim()
                ? payload.adult_quote.trim()
                : '"My parent sure kept things interesting."',
        image_prompt:
            typeof payload?.image_prompt === 'string' && payload.image_prompt.trim()
                ? payload.image_prompt.trim()
                : 'semi-realistic portrait, head and shoulders, moody lighting',
        physical_description:
            typeof payload?.physical_description === 'string' && payload.physical_description.trim()
                ? payload.physical_description.trim()
                : 'soft features, observant eyes',
    };
}

function normalizeDestinyPayload(payload) {
    return {
        destiny:
            typeof payload?.destiny === 'string' && payload.destiny.trim()
                ? payload.destiny.trim()
                : 'Mysterious Soul',
        moral_alignment:
            payload?.moral_alignment === 'good' ||
            payload?.moral_alignment === 'bad' ||
            payload?.moral_alignment === 'grey'
                ? payload.moral_alignment
                : 'grey',
        justification:
            typeof payload?.justification === 'string' && payload.justification.trim()
                ? payload.justification.trim()
                : "The Oracle's vision is clouded...",
    };
}

function extractGeminiImage(candidateParts) {
    if (!Array.isArray(candidateParts)) return null;

    for (const part of candidateParts) {
        const inlineData = part?.inlineData || part?.inline_data;
        if (inlineData?.data) {
            return {
                imageData: inlineData.data,
                mimeType: inlineData.mimeType || inlineData.mime_type || 'image/png',
            };
        }
    }

    return null;
}

async function callOracleJson({
    system,
    userPrompt,
    maxTokens = 1024,
    temperature = 0.9,
    normalize = normalizeOraclePayload
}) {
    ensureOracleEnv();
    const { anthropicApiKey } = getEnv();

    if (typeof system !== 'string' || typeof userPrompt !== 'string') {
        const error = new Error('Both system and userPrompt are required.');
        error.statusCode = 400;
        throw error;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: maxTokens,
            temperature,
            system,
            messages: [{
                role: 'user',
                content: userPrompt
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Anthropic API error:', response.status, errorText);
        const error = new Error('Anthropic request failed.');
        error.statusCode = 502;
        error.detail = `Upstream status ${response.status}`;
        throw error;
    }

    const data = await response.json();
    const rawText = getAnthropicTextContent(data.content);

    if (!rawText) {
        const error = new Error('Anthropic returned no text content.');
        error.statusCode = 502;
        throw error;
    }

    let parsed;
    try {
        parsed = extractJsonObject(rawText);
    } catch (error) {
        console.error('Failed to parse Anthropic JSON:', rawText);
        const parseError = new Error('Anthropic returned invalid JSON.');
        parseError.statusCode = 502;
        parseError.rawText = rawText;
        throw parseError;
    }

    return {
        oracle: normalize(parsed),
        rawText,
    };
}

async function callOracle(system, userPrompt) {
    return callOracleJson({
        system,
        userPrompt,
        maxTokens: 1024,
        temperature: 0.9,
        normalize: normalizeOraclePayload
    });
}

async function callDestinyOracle(system, userPrompt) {
    return callOracleJson({
        system,
        userPrompt,
        maxTokens: 220,
        temperature: 0.75,
        normalize: normalizeDestinyPayload
    });
}

async function generateImage(prompt) {
    ensureImageEnv();
    const { geminiApiKey } = getEnv();

    if (typeof prompt !== 'string' || !prompt.trim()) {
        const error = new Error('A prompt is required.');
        error.statusCode = 400;
        throw error;
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiApiKey
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt.trim()
                    }]
                }],
                generationConfig: {
                    responseModalities: ['IMAGE']
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini image API error:', response.status, errorText);
        const error = new Error('Gemini image generation failed.');
        error.statusCode = 502;
        error.detail = `Upstream status ${response.status}`;
        throw error;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const imageResult = extractGeminiImage(parts);

    if (!imageResult) {
        console.error('Gemini image response missing inline image data:', JSON.stringify(data));
        const error = new Error('Gemini did not return image data.');
        error.statusCode = 502;
        throw error;
    }

    return imageResult;
}

async function generateSpeech(text, voiceId = '') {
    ensureVoiceApiKey();
    const { elevenLabsApiKey, elevenLabsVoiceId } = getEnv();
    const resolvedVoiceId =
        typeof voiceId === 'string' && voiceId.trim() ? voiceId.trim() : elevenLabsVoiceId;

    if (typeof text !== 'string' || !text.trim()) {
        const error = new Error('Speech text is required.');
        error.statusCode = 400;
        throw error;
    }

    if (!resolvedVoiceId) {
        throw new Error('ELEVENLABS_VOICE_ID not found in environment variables.');
    }

    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}?output_format=mp3_22050_32`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey
            },
            body: JSON.stringify({
                text: text.trim(),
                model_id: ELEVENLABS_MODEL_ID,
                voice_settings: {
                    stability: 0.45,
                    similarity_boost: 0.72,
                    style: 0.18,
                    use_speaker_boost: true
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        const error = new Error('ElevenLabs speech generation failed.');
        error.statusCode = 502;
        error.detail = `Upstream status ${response.status}`;
        throw error;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (!audioBuffer.length) {
        const error = new Error('ElevenLabs returned empty audio.');
        error.statusCode = 502;
        throw error;
    }

    return {
        audioBase64: audioBuffer.toString('base64'),
        mimeType: 'audio/mpeg'
    };
}

async function callOracleWithPortrait(system, userPrompt) {
    const oracleResult = await callOracle(system, userPrompt);

    try {
        const imageResult = await generateImage(oracleResult.oracle.image_prompt);
        return {
            ...oracleResult,
            ...imageResult,
            usePlaceholder: false,
        };
    } catch (error) {
        console.error('Image generation fallback:', error);
        return {
            ...oracleResult,
            usePlaceholder: true,
            error: error.message,
            ...(error.detail ? { detail: error.detail } : {}),
        };
    }
}

module.exports = {
    callDestinyOracle,
    callOracle,
    callOracleWithPortrait,
    generateSpeech,
    generateImage,
    ensureOracleEnv,
    ensureImageEnv,
    ensureVoiceEnv,
};
