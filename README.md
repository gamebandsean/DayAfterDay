# DayAfterDay

A life-sim game where you guide a child from birth to age 18, one year at a time. Your decisions shape their appearance, personality, and ultimate destiny.

## Overview

Watch a child grow over 18 years while making meaningful choices that impact their life journey. Each year presents a question or situation, and your text-based responses influence:

- The child's visual appearance (generated via Google Gemini AI)
- Their developing destiny/career path
- Your final score based on the quality of guidance provided

## Game Features

- 19 years of gameplay (ages 0-18)
- Dynamic AI-generated images showing the child's growth
- Destiny tracking system
- Scoring based on answer quality and positive choices
- Replayable with different outcomes

## Setup Instructions

### 1. Get a Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key

### 2. Configure the Game

1. Open `game.js` in a text editor
2. Find the line: `const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';`
3. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key
4. Save the file

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

## Destiny Categories

The game tracks the child's destiny based on keywords in your answers:

- **SCHOLAR**: Study, books, learning
- **ATHLETE**: Sports, exercise, athletics
- **ARTIST**: Art, music, creativity
- **CAREGIVER**: Helping, kindness, caring
- **ENTREPRENEUR**: Business, work, money
- **SCIENTIST**: Science, technology, computers

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
