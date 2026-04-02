# Minor Decisions

A life-sim game where you guide a child from birth to age 18, one year at a time. Your decisions shape their appearance, personality, and ultimate destiny.

## Overview

Watch a child grow over 18 years while making meaningful choices that impact their life journey. Each year presents a question or situation, and your text-based responses influence:

- The child's visual appearance (generated via AI)
- Their developing destiny/career path (powered by Claude's "Oracle of Fates")
- Your final score based on the quality of guidance provided

## Game Features

- 19 years of gameplay (ages 0-18)
- **The Oracle of Fates**: AI-powered destiny system that evolves based on ALL your answers
- Dynamic AI-generated images showing the child's growth
- Darkly comedic destiny tracking with justifications
- Moral alignment system (good/bad/grey)
- Scoring based on answer quality and positive choices
- Replayable with different outcomes

## Setup Instructions

### 1. Get your API keys

#### Anthropic

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Open the API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

#### Gemini

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a Gemini API key
3. Copy the key

This project uses the standard Gemini API for native image generation via `gemini-3.1-flash-image-preview`.

### 2. Configure the Game

1. Create a `.env` file in the project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in a text editor
3. Set both API keys:

   ```env
   ANTHROPIC_API_KEY=your_real_anthropic_key
   GEMINI_API_KEY=your_real_gemini_key
   ```

4. Optional: override the default models if you want to experiment:

   ```env
   ANTHROPIC_MODEL=claude-opus-4-6
   GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
   ```

5. Save the file

**Note**: The `.env` file is git-ignored for security. Never commit API keys to version control!

### 3. Install Dependencies and Run

```bash
# Install dependencies (first time only)
npm install

# Start the server
npm start
```

Then open your browser to **http://localhost:3000**

The server:

- serves the static game files
- proxies Anthropic Oracle requests through `/api/oracle`
- proxies Gemini image generation through `/api/generate-image`

There is no build step. This is a plain Node + Express + vanilla JS app.

### Deploying to Vercel

This repo is set up to deploy as:

- static frontend files from the project root
- Vercel serverless functions in `api/oracle.js` and `api/generate-image.js`

Set these environment variables in Vercel before using the deployed app:

```env
ANTHROPIC_API_KEY=your_real_anthropic_key
GEMINI_API_KEY=your_real_gemini_key
ANTHROPIC_MODEL=claude-opus-4-6
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
```

After the project is imported into Vercel, redeploy once the env vars are saved.

## Customizing Questions

Edit `questions.json` to customize the questions for each year. Each year has:

- `age`: The child's age (0-18)
- `question`: The question or prompt shown to the player
- `imagePrompt`: Base description for AI image generation

## How Scoring Works

- Base points per answer: 10
- Bonus for thoughtful answers (length): 5-15 points
- Bonus for positive keywords: 5 points each
- Maximum possible score depends on answer quality

## The Oracle of Fates System

Instead of simple keyword matching, destinies are determined by an AI "Oracle" that analyzes ALL your answers holistically:

- **Evolving Destinies**: The child's path can shift dramatically based on new answers
- **Darkly Comedic**: Expect bold, funny destinies like "LinkedIn Influencer With No Friends" or "Benevolent Warlord"
- **Morally Aligned**: Each destiny is classified as good, bad, or grey
- **Grounded in Choices**: The Oracle draws specific conclusions from your actual parenting decisions
- **Unique Every Time**: No two playthroughs will have the same destiny trajectory

The Oracle provides a justification for each destiny update, explaining how your choices led to this path.

### Example Destiny Archetypes

The Oracle creates unique destinies (1-5 words) that fuse career with character judgment:
- "Emotionally Unavailable Astronaut"
- "World's Okayest Surgeon"
- "Dog Whisperer, Human Ignorer"
- "Whistleblower Living in Exile"

**Note**: These are examples of the STYLE. The Oracle generates fresh, context-specific destinies based on your unique answers.

## Project Structure

```
MinorDecisions/
├── index.html          # Main HTML structure
├── styles.css          # Game styling
├── game.js            # Frontend game logic
├── server.js          # Backend API proxy server
├── package.json       # Node.js dependencies
├── questions.json     # Question data for each year
├── destiny_prompt.md  # Oracle system specification
└── README.md         # This file
```

## Future Enhancements

- More sophisticated destiny calculation
- Achievement system
- Multiple child profiles
- Save/load game state
- More detailed scoring metrics
- Social sharing of results

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Oracle**: Anthropic Claude Messages API
- **Images**: Google Gemini API (`gemini-3.1-flash-image-preview`)

## License

This is a personal project. Feel free to modify and customize as needed.
