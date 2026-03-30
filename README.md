# DayAfterDay

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

### 1. Get an Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### 2. Configure the Game

1. Open `game.js` in a text editor
2. Find line 12: `const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY_HERE';`
3. Replace `YOUR_ANTHROPIC_API_KEY_HERE` with your actual API key
4. Save the file

**Note**: Images are generated using Pollinations.ai (free, no API key needed)

### 3. Run the Game

**Option A: Using a local server (recommended)**

```bash
# If you have Python 3 installed:
python3 -m http.server 8000

# Or if you have Python 2:
python -m SimpleHTTPServer 8000

# Or if you have Node.js:
npx http-server
```

Then open your browser to `http://localhost:8000`

**Option B: Using VS Code Live Server**

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

**Option C: Direct file opening**

You can also just open `index.html` directly in your browser, though API calls may be restricted.

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
DayAfterDay/
├── index.html          # Main HTML structure
├── styles.css          # Game styling
├── game.js            # Game logic and API integration
├── questions.json     # Question data for each year
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

- HTML5
- CSS3
- Vanilla JavaScript
- Google Gemini AI API

## License

This is a personal project. Feel free to modify and customize as needed.
