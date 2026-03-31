const ATTRIBUTE_LIST = [
    { key: 'intelligence', label: 'Intelligence' },
    { key: 'looks', label: 'Looks' },
    { key: 'money', label: 'Money' },
    { key: 'charisma', label: 'Charisma' },
    { key: 'honesty', label: 'Honesty' },
    { key: 'loyalty', label: 'Loyalty' },
    { key: 'empathy', label: 'Empathy' },
    { key: 'strength', label: 'Strength' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'authority', label: 'Authority' },
    { key: 'humor', label: 'Humor' },
    { key: 'temper', label: 'Temper' }
];
const ATTRIBUTE_AGE_THRESHOLD = 6;
const ATTRIBUTE_POINTS_PER_ROUND = 3;
const ATTRIBUTE_MAX = 10;
const BUILD_NUMBER = 20;

function createDefaultAttributes() {
    return ATTRIBUTE_LIST.reduce((attributes, attribute) => {
        attributes[attribute.key] = 0;
        return attributes;
    }, {});
}

// Game State
let gameState = {
    currentAge: 0,
    answers: [], // Will store {age, question, answer}
    questionsData: null,
    physicalDescription: 'newborn baby with soft features',
    destiny: 'UNKNOWN',
    moralAlignment: null,
    justification: '',
    score: 0,
    attributes: createDefaultAttributes(),
    pointsToAllocate: 0
};

const FALLBACK_ORACLE_RESPONSE = {
    destiny: 'Mysterious Soul',
    moral_alignment: 'grey',
    justification: "The Oracle's vision is clouded...",
    image_prompt: 'semi-realistic portrait of a child, head and shoulders',
    physical_description: 'newborn baby with soft features'
};

// DOM Elements
const gameContainer = document.querySelector('.game-container');
const gameTitle = document.querySelector('.game-title');
const destinyValue = document.getElementById('destiny-value');
const questionContainer = document.querySelector('.question-container');
const questionEyebrow = document.querySelector('.question-eyebrow');
const questionText = document.getElementById('question-text');
const sampleOptions = document.getElementById('sample-options');
const inputContainer = document.querySelector('.input-container');
const playerInput = document.getElementById('player-input');
const submitBtn = document.getElementById('submit-btn');
const inputFeedback = document.getElementById('input-feedback');
const childImage = document.getElementById('child-image');
const imageLoading = document.getElementById('image-loading');
const finalScore = document.getElementById('final-score');
const finalDestiny = document.getElementById('final-destiny');
const scoreDisplay = document.getElementById('score-display');
const restartBtn = document.getElementById('restart-btn');
const progressSegments = document.querySelectorAll('.progress-segment');
const attributeOverlay = document.getElementById('attribute-overlay');
const attributeGrid = document.getElementById('attribute-grid');
const attributeFeedback = document.getElementById('attribute-feedback');
const viewStatsBtn = document.getElementById('view-stats-btn');
const statsModal = document.getElementById('stats-modal');
const closeStatsBtn = document.getElementById('close-stats');
const statsGrid = document.getElementById('stats-grid');
const buildBadge = document.getElementById('build-badge');

// Debug Modal Elements
const debugModal = document.getElementById('debug-modal');
const closeDebugBtn = document.getElementById('close-debug');
const debugDestiny = document.getElementById('debug-destiny');
const debugAlignment = document.getElementById('debug-alignment');
const debugJustification = document.getElementById('debug-justification');
const debugPhysical = document.getElementById('debug-physical');
let attributeAllocationResolver = null;

async function readJsonResponse(response, fallbackMessage) {
    const raw = await response.text();
    let data = null;

    try {
        data = raw ? JSON.parse(raw) : null;
    } catch (error) {
        throw new Error(raw || fallbackMessage);
    }

    if (!response.ok) {
        throw new Error(data?.detail || data?.error || fallbackMessage);
    }

    return data;
}

function getAttributeInfluenceLevel(age) {
    if (age < ATTRIBUTE_AGE_THRESHOLD) {
        return 'minimal';
    }

    if (age < 13) {
        return 'moderate';
    }

    return 'significant';
}

function getAttributeSummary() {
    return ATTRIBUTE_LIST.map((attribute, index) => {
        return `${index + 1}. ${attribute.label}: ${gameState.attributes[attribute.key]}`;
    }).join('\n');
}

function isTypingTarget(target) {
    return Boolean(
        target &&
        target.closest &&
        target.closest('input, textarea, [contenteditable="true"]')
    );
}

function setAttributeFeedback(message) {
    attributeFeedback.textContent = message || '';
}

function setInputFeedback(message, state = 'default') {
    if (!inputFeedback) {
        return;
    }

    inputFeedback.textContent = message || '';
    inputFeedback.dataset.state = state;
}

function setGameMode(mode) {
    gameContainer.classList.toggle('mode-question', mode === 'question');
    gameContainer.classList.toggle('mode-attribute', mode === 'attribute');
}

function updateTimelineHeader(age) {
    const yearsRemaining = Math.max(0, 18 - age);

    gameTitle.textContent = `${yearsRemaining} ${yearsRemaining === 1 ? 'Year' : 'Years'} Until Adulthood`;
}

function updatePointsRemaining() {
    const points = gameState.pointsToAllocate;
    if (points > 0) {
        setInputFeedback(`${points} point${points === 1 ? '' : 's'} left. Spend every point before continuing.`, 'muted');
        return;
    }

    setInputFeedback('All points spent. Continue when ready.', 'muted');
}

function setQuestionPhaseVisible(isVisible) {
    sampleOptions.classList.toggle('phase-hidden', !isVisible);
}

function configurePrimaryInput(mode) {
    if (mode === 'attribute') {
        playerInput.value = '';
        playerInput.disabled = true;
        playerInput.classList.add('phase-hidden');
        submitBtn.textContent = 'Continue';
        submitBtn.disabled = gameState.pointsToAllocate > 0;
        inputContainer.classList.remove('phase-hidden');
        if (gameState.pointsToAllocate === 0) {
            submitBtn.focus();
        }
        return;
    }

    playerInput.classList.remove('phase-hidden');
    playerInput.disabled = false;
    playerInput.placeholder = 'Write your answer or borrow one above...';
    playerInput.inputMode = 'text';
    playerInput.setAttribute('aria-label', 'Write your answer');
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = false;
    inputContainer.classList.remove('phase-hidden');
    setInputFeedback('Answer in your own words or start with one of the prompts above.', 'muted');
}

function renderSampleOptions(samples) {
    if (!sampleOptions) {
        return;
    }

    sampleOptions.innerHTML = '';

    if (!Array.isArray(samples) || samples.length === 0) {
        return;
    }

    samples.forEach((sampleText) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sample-option-btn';
        button.textContent = sampleText;
        button.addEventListener('click', () => {
            playerInput.value = sampleText;
            playerInput.focus();
            playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
        });
        sampleOptions.appendChild(button);
    });
}

function createAttributeSummaryRow(attribute, index, value) {
    const row = document.createElement('div');
    row.className = 'attribute-row';

    const name = document.createElement('span');
    name.className = 'attribute-name';
    name.textContent = `${index + 1}. ${attribute.label}`;

    const segments = document.createElement('div');
    segments.className = 'attribute-segments';

    for (let segmentIndex = 1; segmentIndex <= ATTRIBUTE_MAX; segmentIndex += 1) {
        const segment = document.createElement('span');
        segment.className = 'attribute-segment';

        if (segmentIndex <= value) {
            segment.classList.add('filled');
        }

        segments.appendChild(segment);
    }

    const total = document.createElement('span');
    total.className = 'attribute-total';
    total.textContent = `${value}/${ATTRIBUTE_MAX}`;

    row.appendChild(name);
    row.appendChild(segments);
    row.appendChild(total);

    return row;
}

function createAttributeCard(attribute, index, value) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'attribute-card';
    card.style.setProperty('--fill-ratio', String(value / ATTRIBUTE_MAX));
    card.setAttribute('aria-label', `Add to ${attribute.label}. Current value ${value} out of ${ATTRIBUTE_MAX}.`);

    const content = document.createElement('div');
    content.className = 'attribute-card-content';

    const name = document.createElement('span');
    name.className = 'attribute-card-name';
    name.textContent = attribute.label;
    content.appendChild(name);
    card.appendChild(content);
    card.addEventListener('click', () => allocatePoint(index + 1));

    return card;
}

function renderAttributeBars(container) {
    if (!container) {
        return;
    }

    container.innerHTML = '';

    ATTRIBUTE_LIST.forEach((attribute, index) => {
        const value = gameState.attributes[attribute.key];
        const item = container === attributeGrid
            ? createAttributeCard(attribute, index, value)
            : createAttributeSummaryRow(attribute, index, value);

        container.appendChild(item);
    });
}

function showAttributeOverlay(mode = 'round') {
    gameState.pointsToAllocate = ATTRIBUTE_POINTS_PER_ROUND;
    hideStatsModal();
    setGameMode('attribute');
    setQuestionPhaseVisible(false);
    attributeOverlay.classList.remove('hidden');
    setAttributeFeedback('');
    questionEyebrow.textContent = mode === 'opening' ? 'Add 3 Traits' : 'Add 3 Traits';
    questionText.textContent = mode === 'opening'
        ? 'Pick 3 traits to pass on to your newborn baby.'
        : 'Tap one trait below each time you want to strengthen it this year.';
    updatePointsRemaining();
    renderAttributeBars(attributeGrid);
    renderAttributeBars(statsGrid);
    configurePrimaryInput('attribute');
}

function hideAttributeOverlay() {
    attributeOverlay.classList.add('hidden');
    gameState.pointsToAllocate = 0;
    setAttributeFeedback('');
}

function allocatePoint(rawIndex) {
    if (gameState.pointsToAllocate <= 0) {
        return false;
    }

    const attrIndex = Number(rawIndex);

    if (!Number.isInteger(attrIndex) || attrIndex < 1 || attrIndex > ATTRIBUTE_LIST.length) {
        setAttributeFeedback('Choose a numbered trait from 1 to 12.');
        return false;
    }

    const attribute = ATTRIBUTE_LIST[attrIndex - 1];

    if (gameState.attributes[attribute.key] >= ATTRIBUTE_MAX) {
        setAttributeFeedback(`${attribute.label} has already reached its limit.`);
        return false;
    }

    gameState.attributes[attribute.key] += 1;
    gameState.pointsToAllocate -= 1;
    renderAttributeBars(attributeGrid);
    renderAttributeBars(statsGrid);
    updatePointsRemaining();
    configurePrimaryInput('attribute');

    if (gameState.pointsToAllocate === 0) {
        setAttributeFeedback('The shape of this year is set. Continue when ready.');
        submitBtn.focus();
    } else {
        setAttributeFeedback(`${attribute.label} grows stronger.`);
    }

    return true;
}

function onAttributeSubmit() {
    completeAttributeAllocation();
}

function waitForAttributeAllocation(mode = 'round') {
    showAttributeOverlay(mode);

    return new Promise((resolve) => {
        attributeAllocationResolver = resolve;
    });
}

function completeAttributeAllocation() {
    if (gameState.pointsToAllocate > 0) {
        setAttributeFeedback(`Spend all ${ATTRIBUTE_POINTS_PER_ROUND} points before moving on.`);
        return;
    }

    hideAttributeOverlay();

    if (attributeAllocationResolver) {
        const resolve = attributeAllocationResolver;
        attributeAllocationResolver = null;
        resolve();
    }
}

function showStatsModal() {
    if (!finalScore.classList.contains('hidden')) {
        return;
    }

    renderAttributeBars(statsGrid);
    statsModal.classList.remove('hidden');
}

function hideStatsModal() {
    statsModal.classList.add('hidden');
}

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
    const attributeInfluenceLevel = getAttributeInfluenceLevel(gameState.currentAge);
    const userPrompt = `Here is the current state of the game:

CHILD'S CURRENT AGE: ${gameState.currentAge}
CHILD'S CURRENT PHYSICAL DESCRIPTION: ${gameState.physicalDescription}
CHILD'S ATTRIBUTE SCORES (1-10 scale):
${getAttributeSummary()}

ATTRIBUTE GUIDANCE:
Treat these attributes as aptitude modifiers that influence what this child can realistically become.
The child is currently age ${gameState.currentAge}, so attribute influence should be ${attributeInfluenceLevel}.
Before age ${ATTRIBUTE_AGE_THRESHOLD}, attributes are still forming and should only subtly shade the destiny.
From age ${ATTRIBUTE_AGE_THRESHOLD} onward, attributes meaningfully shape the child's abilities, behavior, and future.

PREVIOUS QUESTIONS AND ANSWERS (in order):
${previousRounds}
NEW QUESTION JUST ASKED:
Q${gameState.answers.length + 1}: "${currentQuestion}"

PLAYER'S NEW ANSWER:
A${gameState.answers.length + 1}: "${currentAnswer}"

Based on ALL of the above — every answer, not just the latest — determine this child's evolving Destiny. Respond with the JSON object only.`;

    try {
        // Call our backend server instead of Anthropic directly (avoids CORS issues)
        const response = await fetch('/api/oracle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system: ORACLE_SYSTEM_PROMPT,
                userPrompt: userPrompt
            })
        });

        const data = await readJsonResponse(response, 'Oracle API failed.');
        if (!data?.oracle) {
            throw new Error('Oracle response was missing normalized data.');
        }

        return data.oracle;

    } catch (error) {
        console.error('Error consulting Oracle:', error);
        // Return fallback response
        return {
            ...FALLBACK_ORACLE_RESPONSE,
            image_prompt: `portrait of a ${gameState.currentAge} year old child`,
            physical_description: gameState.physicalDescription
        };
    }
}

// Initialize Game
async function initGame() {
    try {
        if (buildBadge) {
            buildBadge.textContent = `Build ${String(BUILD_NUMBER).padStart(3, '0')}`;
        }

        const response = await fetch('questions.json');
        gameState.questionsData = await response.json();
        renderAttributeBars(attributeGrid);
        renderAttributeBars(statsGrid);
        await startOpeningSequence();
    } catch (error) {
        console.error('Error loading questions:', error);
        questionText.textContent = 'Error loading game data. Please refresh the page.';
    }
}

async function startOpeningSequence() {
    gameState.currentAge = 0;
    updateTimelineHeader(0);
    updateProgressBar(0);
    setInputFeedback('The first reading begins with instinct.', 'muted');
    generateChildImage('photorealistic portrait of a peaceful newborn baby, soft lighting, warm tones, innocent expression');
    await waitForAttributeAllocation('opening');
    loadYear(0, { skipImageGeneration: true });
}

// Load a specific year
function loadYear(age, options = {}) {
    const yearData = gameState.questionsData.years[age];

    if (!yearData) {
        endGame();
        return;
    }

    gameState.currentAge = age;
    updateTimelineHeader(age);
    setGameMode('question');
    setQuestionPhaseVisible(true);
    configurePrimaryInput('question');
    questionEyebrow.textContent = `Age: ${age}`;
    questionText.textContent = yearData.question;
    renderSampleOptions(yearData.samples);
    playerInput.value = '';
    setInputFeedback('Answer in your own words or borrow one of the sample responses.', 'muted');
    playerInput.focus();

    // Update progress bar
    updateProgressBar(age);

    // Generate image for this year
    if (age === 0 && !options.skipImageGeneration) {
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

    if (submitBtn.disabled) {
        return;
    }

    if (!answer) {
        setInputFeedback('Write a response before asking the Oracle to judge it.');
        playerInput.focus();
        return;
    }

    setInputFeedback('');

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

    // Generate the portrait behind the attribute overlay.
    generateChildImage(oracleResponse.image_prompt);
    await waitForAttributeAllocation('round');

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
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: imagePrompt
            })
        });

        const data = await readJsonResponse(response, 'Image generation failed.');

        if (data?.usePlaceholder) {
            showPlaceholderImage(imagePrompt);
            return;
        }

        if (data?.imageData) {
            childImage.src = `data:${data.mimeType || 'image/png'};base64,${data.imageData}`;
            childImage.classList.add('loaded');
            imageLoading.classList.add('hidden');
        } else {
            throw new Error('No image data in response.');
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
        gradient.addColorStop(0, '#d6b36a');
        gradient.addColorStop(1, '#7a405b');
    } else if (gameState.moralAlignment === 'bad') {
        gradient.addColorStop(0, '#944154');
        gradient.addColorStop(1, '#462337');
    } else {
        gradient.addColorStop(0, '#c59d58');
        gradient.addColorStop(1, '#5b3554');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 800);

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(246, 239, 225, 0.08)';
    ctx.fillRect(0, 0, 800, 800);

    ctx.strokeStyle = 'rgba(247, 239, 226, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, 716, 716);

    // Draw age in large text
    ctx.fillStyle = 'rgba(255, 248, 237, 0.92)';
    ctx.font = 'bold 24px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE ORACLE SEES', 400, 216);
    ctx.font = 'bold 120px Georgia';
    ctx.fillText(`AGE ${gameState.currentAge}`, 400, 320);

    // Draw destiny
    if (gameState.destiny && gameState.destiny !== 'UNKNOWN') {
        ctx.font = 'bold 32px Georgia';
        ctx.fillStyle = 'rgba(255, 245, 232, 0.92)';

        // Word wrap destiny if too long
        const words = gameState.destiny.split(' ');
        let line = '';
        let y = 470;

        words.forEach((word, index) => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > 700 && index > 0) {
                ctx.fillText(line, 400, y);
                line = word + ' ';
                y += 44;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, 400, y);
    }

    // Draw decorative circle
    ctx.strokeStyle = 'rgba(255, 241, 225, 0.22)';
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

    hideStatsModal();
    closeDebugModal();
    setInputFeedback('');

    // Show final score screen
    finalDestiny.textContent = gameState.destiny;
    scoreDisplay.textContent = `Score ${gameState.score} / ${maxScore} · ${percentage}%`;

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

    let messageElement = finalScore.querySelector('.final-message');
    if (!messageElement) {
        messageElement = document.createElement('p');
        messageElement.className = 'final-message';
        restartBtn.insertAdjacentElement('beforebegin', messageElement);
    }
    messageElement.textContent = message;

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
        score: 0,
        attributes: createDefaultAttributes(),
        pointsToAllocate: 0
    };

    // Reset UI
    destinyValue.textContent = 'UNKNOWN';
    finalScore.classList.add('hidden');
    attributeAllocationResolver = null;
    hideAttributeOverlay();
    hideStatsModal();
    closeDebugModal();
    setGameMode('attribute');
    setQuestionPhaseVisible(false);
    configurePrimaryInput('attribute');
    renderSampleOptions([]);
    renderAttributeBars(attributeGrid);
    renderAttributeBars(statsGrid);

    // Clear extra messages
    const finalMessage = finalScore.querySelector('.final-message');
    if (finalMessage) {
        finalMessage.remove();
    }

    // Start over
    startOpeningSequence();
}

// Event Listeners
submitBtn.addEventListener('click', () => {
    if (gameContainer.classList.contains('mode-attribute')) {
        onAttributeSubmit();
        return;
    }

    submitAnswer();
});
playerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();

        if (gameContainer.classList.contains('mode-attribute')) {
            onAttributeSubmit();
            return;
        }

        submitAnswer();
    }
});
playerInput.addEventListener('input', () => {
    if (gameContainer.classList.contains('mode-attribute')) {
        return;
    }

    if (playerInput.value.trim()) {
        setInputFeedback('', 'muted');
    }
});
restartBtn.addEventListener('click', restartGame);
viewStatsBtn.addEventListener('click', showStatsModal);
closeStatsBtn.addEventListener('click', hideStatsModal);
statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) {
        hideStatsModal();
    }
});

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
    if (isTypingTarget(e.target) && e.key !== 'Escape') {
        return;
    }

    // Press the backquote/tilde key to toggle debug modal
    if (e.code === 'Backquote') {
        if (debugModal.classList.contains('hidden')) {
            openDebugModal();
        } else {
            closeDebugModal();
        }
    }

    // Press ESC to close debug modal
    if (e.key === 'Escape') {
        closeDebugModal();
        hideStatsModal();
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
