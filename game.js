// Game State
let gameState = {
    currentAge: 0,
    answers: [],
    questionsData: null,
    childDescription: '',
    destiny: 'UNKNOWN',
    score: 0
};

// API Configuration
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // User needs to add their key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// DOM Elements
const destinyValue = document.getElementById('destiny-value');
const currentAge = document.getElementById('current-age');
const questionText = document.getElementById('question-text');
const playerInput = document.getElementById('player-input');
const submitBtn = document.getElementById('submit-btn');
const childImage = document.getElementById('child-image');
const imageLoading = document.getElementById('image-loading');
const finalScore = document.getElementById('final-score');
const finalDestiny = document.getElementById('final-destiny');
const scoreDisplay = document.getElementById('score-display');
const restartBtn = document.getElementById('restart-btn');
const progressSegments = document.querySelectorAll('.progress-segment');

// Initialize Game
async function initGame() {
    try {
        const response = await fetch('questions.json');
        gameState.questionsData = await response.json();
        loadYear(0);
    } catch (error) {
        console.error('Error loading questions:', error);
        questionText.textContent = 'Error loading game data. Please refresh the page.';
    }
}

// Load a specific year
function loadYear(age) {
    const yearData = gameState.questionsData.years[age];

    if (!yearData) {
        endGame();
        return;
    }

    gameState.currentAge = age;
    currentAge.textContent = `Age: ${age}`;
    questionText.textContent = yearData.question;
    playerInput.value = '';
    playerInput.focus();

    // Update progress bar
    updateProgressBar(age);

    // Generate image for this year
    if (age === 0) {
        // First image - newborn baby
        generateChildImage(yearData.imagePrompt, '');
    }
}

// Update progress bar
function updateProgressBar(age) {
    // Fill in segments up to current age (age 0 = 1 segment, age 18 = 18 segments, etc.)
    progressSegments.forEach((segment, index) => {
        if (index < age + 1) {
            segment.classList.add('filled');
        } else {
            segment.classList.remove('filled');
        }
    });
}

// Handle answer submission
async function submitAnswer() {
    const answer = playerInput.value.trim();

    if (!answer) {
        alert('Please enter an answer!');
        return;
    }

    // Disable input while processing
    submitBtn.disabled = true;
    playerInput.disabled = true;

    // Store the answer
    gameState.answers.push({
        age: gameState.currentAge,
        answer: answer
    });

    // Update child description and destiny based on answer
    updateChildState(answer);

    // Calculate score for this answer
    calculateAnswerScore(answer);

    // Generate new image with updated description
    const nextAge = gameState.currentAge + 1;
    if (nextAge < gameState.questionsData.years.length) {
        const nextYearData = gameState.questionsData.years[nextAge];
        await generateChildImage(nextYearData.imagePrompt, gameState.childDescription);

        // Move to next year
        loadYear(nextAge);
    } else {
        // Game is over
        endGame();
    }

    // Re-enable input
    submitBtn.disabled = false;
    playerInput.disabled = false;
}

// Update child state based on answer
function updateChildState(answer) {
    // Add the answer context to the child's description
    const answerLower = answer.toLowerCase();

    // Update description for image generation
    gameState.childDescription += ` ${answer}.`;

    // Simple destiny calculation based on keywords
    // You can make this more sophisticated
    if (answerLower.includes('book') || answerLower.includes('read') || answerLower.includes('study')) {
        updateDestiny('SCHOLAR');
    } else if (answerLower.includes('sport') || answerLower.includes('athletic') || answerLower.includes('exercise')) {
        updateDestiny('ATHLETE');
    } else if (answerLower.includes('art') || answerLower.includes('music') || answerLower.includes('creative')) {
        updateDestiny('ARTIST');
    } else if (answerLower.includes('help') || answerLower.includes('kind') || answerLower.includes('care')) {
        updateDestiny('CAREGIVER');
    } else if (answerLower.includes('business') || answerLower.includes('money') || answerLower.includes('work')) {
        updateDestiny('ENTREPRENEUR');
    } else if (answerLower.includes('science') || answerLower.includes('tech') || answerLower.includes('computer')) {
        updateDestiny('SCIENTIST');
    }
}

// Update destiny display
function updateDestiny(newDestiny) {
    gameState.destiny = newDestiny;
    destinyValue.textContent = newDestiny;
}

// Calculate score for an answer
function calculateAnswerScore(answer) {
    // Simple scoring system - you can make this more sophisticated
    let points = 0;

    // Base points for answering
    points += 10;

    // Bonus points for longer, thoughtful answers
    if (answer.length > 20) points += 5;
    if (answer.length > 50) points += 10;

    // Bonus for positive keywords
    const positiveWords = ['love', 'kind', 'happy', 'help', 'learn', 'grow', 'friend', 'care'];
    positiveWords.forEach(word => {
        if (answer.toLowerCase().includes(word)) points += 5;
    });

    gameState.score += points;
}

// Generate child image using Gemini API
async function generateChildImage(basePrompt, additionalContext) {
    // Show loading state
    imageLoading.classList.remove('hidden');
    childImage.classList.remove('loaded');

    // Check if API key is configured
    if (GEMINI_API_KEY === AIzaSyD6TCmh38ldWrSf7JWyrP0w6x_sPtBaRI4) {
        console.warn('Gemini API key not configured. Using placeholder.');
        showPlaceholderImage();
        return;
    }

    try {
        // Construct the full prompt
        const fullPrompt = `Generate a photorealistic image of ${basePrompt}. ${additionalContext} The image should be appropriate for all ages, warm and friendly in tone.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Create an image: ${fullPrompt}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate image');
        }

        const data = await response.json();

        // Note: Gemini API doesn't directly generate images via this endpoint
        // You'll need to use Gemini's image generation capabilities
        // For now, we'll use a placeholder
        showPlaceholderImage();

    } catch (error) {
        console.error('Error generating image:', error);
        showPlaceholderImage();
    }
}

// Show placeholder image
function showPlaceholderImage() {
    // Create a placeholder with text
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 500, 500);

    // Draw text
    ctx.fillStyle = '#333';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Age: ${gameState.currentAge}`, 250, 250);

    // Set the image
    childImage.src = canvas.toDataURL();
    childImage.classList.add('loaded');
    imageLoading.classList.add('hidden');
}

// End game and show results
function endGame() {
    // Calculate final score
    const maxScore = gameState.questionsData.years.length * 25;
    const percentage = Math.round((gameState.score / maxScore) * 100);

    // Show final score screen
    finalDestiny.textContent = `Final Destiny: ${gameState.destiny}`;
    scoreDisplay.textContent = `Score: ${gameState.score} / ${maxScore} (${percentage}%)`;

    let message = '';
    if (percentage >= 80) {
        message = 'Exceptional! Your child has flourished under your guidance.';
    } else if (percentage >= 60) {
        message = 'Well done! Your child has grown into a capable individual.';
    } else if (percentage >= 40) {
        message = 'Your child has had some good experiences along the way.';
    } else {
        message = 'Every journey is unique. Perhaps try different choices?';
    }

    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    finalScore.insertBefore(messageElement, restartBtn);

    finalScore.classList.remove('hidden');
}

// Restart game
function restartGame() {
    // Reset game state
    gameState = {
        currentAge: 0,
        answers: [],
        questionsData: gameState.questionsData, // Keep loaded questions
        childDescription: '',
        destiny: 'UNKNOWN',
        score: 0
    };

    // Reset UI
    destinyValue.textContent = 'UNKNOWN';
    finalScore.classList.add('hidden');

    // Clear extra messages
    const messages = finalScore.querySelectorAll('p');
    messages.forEach((msg, index) => {
        if (index > 1) msg.remove();
    });

    // Start over
    loadYear(0);
}

// Event Listeners
submitBtn.addEventListener('click', submitAnswer);
playerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});
restartBtn.addEventListener('click', restartGame);

// Start the game
initGame();
