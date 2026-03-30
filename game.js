// Game State
let gameState = {
    currentAge: 0,
    answers: [], // Will store {age, question, answer}
    questionsData: null,
    physicalDescription: 'newborn baby with soft features',
    destiny: 'UNKNOWN',
    moralAlignment: null,
    justification: '',
    score: 0
};

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

// Debug Modal Elements
const debugModal = document.getElementById('debug-modal');
const closeDebugBtn = document.getElementById('close-debug');
const debugDestiny = document.getElementById('debug-destiny');
const debugAlignment = document.getElementById('debug-alignment');
const debugJustification = document.getElementById('debug-justification');
const debugPhysical = document.getElementById('debug-physical');

// Oracle System Prompt (from destiny_prompt.md)
const ORACLE_SYSTEM_PROMPT = `You are The Oracle of Fates — an all-knowing, darkly comedic soothsayer who can read a child's destiny from the choices their parent makes. You speak with absolute conviction. You do not hedge. You do not say "it depends." You see the thread of fate clearly, and you call it like it is.

Your job: after each parenting decision, synthesize EVERY answer given so far and declare what this child is destined to become. The destiny EVOLVES — it can shift dramatically between rounds as new information changes the trajectory. A child headed for "Beloved Kindergarten Teacher" can pivot to "Charismatic Cult Leader" in a single answer.

## Rules for Destinies

1. A Destiny is 1–5 words describing both WHAT they become and WHO they are. It's a career fused with a character judgment.
2. Commit to a moral stance. The child is either:
   - Clearly good (generous, kind, heroic)
   - Clearly bad (corrupt, cruel, destructive)
   - Morally grey (well-intentioned but flawed, successful but hollow)
   Pick a lane. Do NOT sit on the fence with safe, neutral destinies.
3. Be funny. Be bold. Exaggerate for comedic effect. These should be destinies people screenshot and share with friends.
4. Ground every destiny in the actual answers. The humor comes from drawing absurd-but-defensible conclusions from real parenting choices. Never make it random.
5. Vary your range. Don't default to the same archetypes. Pull from unexpected careers, niche lifestyles, historical parallels, and modern absurdity. Think beyond "doctor/lawyer/criminal."

### Destiny examples (for tone calibration only — do NOT reuse these):
- "Benevolent Warlord"
- "LinkedIn Influencer With No Friends"
- "Undercover Nun"
- "World's Okayest Surgeon"
- "Emotionally Unavailable Astronaut"
- "Dog Whisperer, Human Ignorer"
- "Billionaire Who Tips Poorly"
- "Whistleblower Living in Exile"
- "Competitive Eating Champion, Lonely"
- "Objectively Correct Dictator"

## Rules for Justification

Write 1–2 sentences explaining WHY this destiny emerged from the answers. Be specific — reference the actual answers, not vague generalities. The tone should feel like a fortune teller delivering prophecy with unsettling confidence.

## Rules for the Image Prompt

After determining the Destiny and Justification, generate an image prompt for image generation. This prompt must:

1. Describe a semi-realistic portrait/headshot of this person at the age specified in the input.
2. Translate the Destiny and Justification into VISUAL storytelling — their expression, clothing, setting, lighting, and small details should all hint at who they are and what they've become.
3. Preserve physical continuity: use the provided current physical description as a base. Core features (eye color, skin tone, hair color, face shape, distinguishing marks) should carry through, adapted appropriately for the target age.
4. Include age-appropriate details. A 5-year-old "Future Dictator" might have an eerily composed expression and a too-neat outfit. A 35-year-old version would look very different.
5. Keep it as a headshot/portrait — head and shoulders, direct or 3/4 angle, with enough background to set a mood but not a full scene.

## Response Format

You MUST respond with valid JSON and nothing else. No markdown, no commentary outside the JSON.

{
  "destiny": "string — 1 to 5 words, the Destiny",
  "moral_alignment": "good" | "bad" | "grey",
  "justification": "string — 1-2 sentences, the Oracle's reasoning",
  "image_prompt": "string — the full image generation prompt",
  "physical_description": "string — updated physical description of the child for continuity"
}`;

// Call the Oracle to determine destiny
async function consultOracle(currentQuestion, currentAnswer) {
    // Build previous Q&A history
    let previousRounds = '';
    gameState.answers.forEach((qa, index) => {
        previousRounds += `Q${index + 1}: "${qa.question}"\n`;
        previousRounds += `A${index + 1}: "${qa.answer}"\n\n`;
    });

    // Build user prompt
    const userPrompt = `Here is the current state of the game:

CHILD'S CURRENT AGE: ${gameState.currentAge}
CHILD'S CURRENT PHYSICAL DESCRIPTION: ${gameState.physicalDescription}

PREVIOUS QUESTIONS AND ANSWERS (in order):
${previousRounds}
NEW QUESTION JUST ASKED:
Q${gameState.answers.length + 1}: "${currentQuestion}"

PLAYER'S NEW ANSWER:
A${gameState.answers.length + 1}: "${currentAnswer}"

Based on ALL of the above — every answer, not just the latest — determine this child's evolving Destiny. Respond with the JSON object only.`;

    try {
        // Call our backend server instead of Anthropic directly (avoids CORS issues)
        const response = await fetch('http://localhost:3000/api/oracle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system: ORACLE_SYSTEM_PROMPT,
                userPrompt: userPrompt
            })
        });

        if (!response.ok) {
            throw new Error(`Oracle API failed: ${response.status}`);
        }

        const data = await response.json();
        const oracleResponse = JSON.parse(data.content[0].text);

        return oracleResponse;

    } catch (error) {
        console.error('Error consulting Oracle:', error);
        // Return fallback response
        return {
            destiny: 'Mysterious Soul',
            moral_alignment: 'grey',
            justification: 'The Oracle\'s vision is clouded...',
            image_prompt: `portrait of a ${gameState.currentAge} year old child`,
            physical_description: gameState.physicalDescription
        };
    }
}

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
        // First image - newborn baby with simple prompt
        const initialPrompt = 'photorealistic portrait of a peaceful newborn baby, soft lighting, warm tones, innocent expression';
        generateChildImage(initialPrompt);
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

    // Get current question
    const currentQuestion = gameState.questionsData.years[gameState.currentAge].question;

    // Consult the Oracle
    const oracleResponse = await consultOracle(currentQuestion, answer);

    // Store the answer with question
    gameState.answers.push({
        age: gameState.currentAge,
        question: currentQuestion,
        answer: answer
    });

    // Update game state from Oracle
    gameState.destiny = oracleResponse.destiny;
    gameState.moralAlignment = oracleResponse.moral_alignment;
    gameState.justification = oracleResponse.justification;
    gameState.physicalDescription = oracleResponse.physical_description;

    // Update destiny display
    updateDestiny(oracleResponse.destiny, oracleResponse.justification);

    // Calculate score for this answer
    calculateAnswerScore(answer);

    // Generate new image using Oracle's prompt
    await generateChildImage(oracleResponse.image_prompt);

    // Move to next year or end game
    const nextAge = gameState.currentAge + 1;
    if (nextAge < gameState.questionsData.years.length) {
        loadYear(nextAge);
    } else {
        endGame();
    }

    // Re-enable input
    submitBtn.disabled = false;
    playerInput.disabled = false;
}

// Update destiny display
function updateDestiny(newDestiny, justification) {
    destinyValue.textContent = newDestiny;

    // Update debug modal content (but don't show it)
    if (debugDestiny) debugDestiny.textContent = newDestiny || '-';
    if (debugJustification) debugJustification.textContent = justification || '-';
    if (debugAlignment) debugAlignment.textContent = gameState.moralAlignment || '-';
    if (debugPhysical) debugPhysical.textContent = gameState.physicalDescription || '-';
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

// Generate child image using AI
async function generateChildImage(imagePrompt) {
    // Show loading state
    imageLoading.classList.remove('hidden');
    childImage.classList.remove('loaded');

    try {
        // Call backend to generate image with Gemini
        const response = await fetch('http://localhost:3000/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: imagePrompt
            })
        });

        if (!response.ok) {
            throw new Error(`Image generation failed: ${response.status}`);
        }

        const data = await response.json();

        // Extract the base64 image from Gemini response
        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
            const imageData = data.predictions[0].bytesBase64Encoded;
            childImage.src = `data:image/png;base64,${imageData}`;
            childImage.classList.add('loaded');
            imageLoading.classList.add('hidden');
        } else {
            throw new Error('No image data in response');
        }

    } catch (error) {
        console.error('Error generating image:', error);
        showPlaceholderImage(imagePrompt);
    }
}

// Show placeholder image
function showPlaceholderImage(prompt) {
    // Create a visually appealing placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Gradient background based on moral alignment
    const gradient = ctx.createLinearGradient(0, 0, 800, 800);
    if (gameState.moralAlignment === 'good') {
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
    } else if (gameState.moralAlignment === 'bad') {
        gradient.addColorStop(0, '#cc2b5e');
        gradient.addColorStop(1, '#753a88');
    } else {
        gradient.addColorStop(0, '#36d1dc');
        gradient.addColorStop(1, '#5b86e5');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 800);

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, 800, 800);

    // Draw age in large text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`AGE ${gameState.currentAge}`, 400, 300);

    // Draw destiny
    if (gameState.destiny && gameState.destiny !== 'UNKNOWN') {
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

        // Word wrap destiny if too long
        const words = gameState.destiny.split(' ');
        let line = '';
        let y = 450;

        words.forEach((word, index) => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > 700 && index > 0) {
                ctx.fillText(line, 400, y);
                line = word + ' ';
                y += 40;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, 400, y);
    }

    // Draw decorative circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(400, 400, 350, 0, 2 * Math.PI);
    ctx.stroke();

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
        physicalDescription: 'newborn baby with soft features',
        destiny: 'UNKNOWN',
        moralAlignment: null,
        justification: '',
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

// Debug Modal Functions
function openDebugModal() {
    debugModal.classList.remove('hidden');
}

function closeDebugModal() {
    debugModal.classList.add('hidden');
}

// Debug Modal Event Listeners
closeDebugBtn.addEventListener('click', closeDebugModal);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Press D to toggle debug modal
    if (e.key === 'd' || e.key === 'D') {
        if (debugModal.classList.contains('hidden')) {
            openDebugModal();
        } else {
            closeDebugModal();
        }
    }

    // Press ESC to close debug modal
    if (e.key === 'Escape') {
        closeDebugModal();
    }
});

// Click outside modal to close
debugModal.addEventListener('click', (e) => {
    if (e.target === debugModal) {
        closeDebugModal();
    }
});

// Start the game
initGame();
