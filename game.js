const PLAYABLE_AGES = [0, 5, 10, 12, 15, 16, 17];
const BUILD_NUMBER = 35;
const DEFAULT_PHYSICAL_DESCRIPTION = 'newborn baby with soft features';
const FALLBACK_NEWBORN_POOL = [
    {
        label: 'Mixed',
        race: 'Mixed',
        physicalDescription: DEFAULT_PHYSICAL_DESCRIPTION,
        prompt: 'photorealistic portrait of a peaceful newborn baby, soft lighting, warm tones, innocent expression'
    }
];

function createDefaultGameState(questionsData = null) {
    return {
        currentAge: 0,
        answers: [],
        questionsData,
        childName: '',
        childGender: '',
        childRace: '',
        physicalDescription: DEFAULT_PHYSICAL_DESCRIPTION,
        destiny: 'UNKNOWN',
        moralAlignment: null,
        justification: '',
        score: 0,
        values: []
    };
}

// Game State
let gameState = createDefaultGameState();
let newbornManifest = [];

const FALLBACK_ORACLE_RESPONSE = {
    destiny: 'Mysterious Soul',
    moral_alignment: 'grey',
    justification: "The Oracle's vision is clouded...",
    image_prompt: 'semi-realistic portrait of a child, head and shoulders',
    physical_description: DEFAULT_PHYSICAL_DESCRIPTION
};

// DOM Elements
const gameContainer = document.querySelector('.game-container');
const titleScreen = document.getElementById('title-screen');
const createScreen = document.getElementById('create-screen');
const gameScreen = document.getElementById('game-screen');
const playBtn = document.getElementById('play-btn');
const childNameInput = document.getElementById('child-name-input');
const genderOptions = document.getElementById('gender-options');
const birthBtn = document.getElementById('birth-btn');
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
const progressBar = document.getElementById('progress-bar');
const valuesOverlay = document.getElementById('values-overlay');
const valuesFeedback = document.getElementById('values-feedback');
const currentValuesList = document.getElementById('current-values-list');
const valueInput = document.getElementById('value-input');
const valueSubmitBtn = document.getElementById('value-submit-btn');
const valueSuggestions = document.getElementById('value-suggestions');
const buildBadge = document.getElementById('build-badge');

// Debug Modal Elements
const debugModal = document.getElementById('debug-modal');
const closeDebugBtn = document.getElementById('close-debug');
const debugDestiny = document.getElementById('debug-destiny');
const debugAlignment = document.getElementById('debug-alignment');
const debugJustification = document.getElementById('debug-justification');
const debugPhysical = document.getElementById('debug-physical');
const screenMap = {
    title: titleScreen,
    create: createScreen,
    game: gameScreen
};
const genderButtons = Array.from(document.querySelectorAll('.gender-btn'));
let valueEntryResolver = null;
let activeImageRequestId = 0;
let activeImageAbortController = null;

function getPlayableAgeIndex(age) {
    return PLAYABLE_AGES.indexOf(age);
}

function getNextPlayableAge(age) {
    const currentIndex = getPlayableAgeIndex(age);
    if (currentIndex === -1 || currentIndex >= PLAYABLE_AGES.length - 1) {
        return null;
    }

    return PLAYABLE_AGES[currentIndex + 1];
}

function renderProgressSegments() {
    if (!progressBar) {
        return [];
    }

    progressBar.innerHTML = '';

    return PLAYABLE_AGES.map(() => {
        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        progressBar.appendChild(segment);
        return segment;
    });
}

async function readJsonResponse(response, fallbackMessage) {
    const raw = await response.text();
    let data = null;

    try {
        data = raw ? JSON.parse(raw) : null;
    } catch (error) {
        throw new Error(raw || fallbackMessage);
    }

    if (!response.ok) {
        const error = new Error(data?.detail || data?.error || fallbackMessage);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

async function loadNewbornManifest() {
    try {
        const response = await fetch('/public/newborns/manifest.json');
        const manifest = await readJsonResponse(response, 'Newborn portrait manifest failed to load.');
        newbornManifest = Array.isArray(manifest) && manifest.length > 0 ? manifest : FALLBACK_NEWBORN_POOL;
    } catch (error) {
        console.error('Error loading newborn portrait manifest:', error);
        newbornManifest = FALLBACK_NEWBORN_POOL;
    }
}

function showScreen(screenName) {
    Object.entries(screenMap).forEach(([key, screen]) => {
        if (!screen) {
            return;
        }

        screen.classList.toggle('hidden', key !== screenName);
    });
}

function updateBirthButtonState() {
    if (!birthBtn || !childNameInput) {
        return;
    }

    const hasName = childNameInput.value.trim().length > 0;
    const hasGender = Boolean(gameState.childGender);
    birthBtn.disabled = !(hasName && hasGender);
}

function setSelectedGender(gender) {
    gameState.childGender = gender || '';
    genderButtons.forEach((button) => {
        button.classList.toggle('selected', button.dataset.gender === gameState.childGender);
    });
    updateBirthButtonState();
}

function resetCreateScreen() {
    if (childNameInput) {
        childNameInput.value = '';
    }
    setSelectedGender('');
}

function getRandomNewbornOption() {
    const pool = Array.isArray(newbornManifest) && newbornManifest.length > 0
        ? newbornManifest
        : FALLBACK_NEWBORN_POOL;

    return pool[Math.floor(Math.random() * pool.length)];
}

function applyStartingPortrait(option) {
    if (!childImage || !imageLoading || !option) {
        return;
    }

    cancelPendingImageRequest();
    activeImageRequestId += 1;
    childImage.classList.remove('loaded');
    imageLoading.classList.remove('hidden');

    if (option.file) {
        childImage.onload = () => {
            childImage.classList.add('loaded');
            imageLoading.classList.add('hidden');
            childImage.onload = null;
            childImage.onerror = null;
        };
        childImage.onerror = () => {
            childImage.onload = null;
            childImage.onerror = null;
            generateChildImage(option.prompt || FALLBACK_NEWBORN_POOL[0].prompt);
        };
        childImage.src = `/public/newborns/${option.file}`;
        return;
    }

    generateChildImage(option.prompt || FALLBACK_NEWBORN_POOL[0].prompt);
}

function resetGameUi() {
    destinyValue.textContent = 'UNKNOWN';
    finalScore.classList.add('hidden');
    valueEntryResolver = null;
    hideValuesOverlay();
    closeDebugModal();
    setGameMode('question');
    setQuestionPhaseVisible(false);
    questionContainer.classList.remove('phase-hidden');
    questionContainer.removeAttribute('aria-hidden');
    inputContainer.classList.remove('phase-hidden');
    inputContainer.removeAttribute('aria-hidden');
    playerInput.classList.remove('phase-hidden');
    submitBtn.classList.remove('phase-hidden');
    configurePrimaryInput('question');
    renderSampleOptions([]);
    renderCurrentValues();
    updateDestiny('UNKNOWN', '');
    updateTimelineHeader(0);
    updateProgressBar(0);
    playerInput.value = '';
    setInputFeedback('');

    const finalMessage = finalScore.querySelector('.final-message');
    if (finalMessage) {
        finalMessage.remove();
    }
}

function isTypingTarget(target) {
    return Boolean(
        target &&
        target.closest &&
        target.closest('input, textarea, [contenteditable="true"]')
    );
}

function sanitizeValue(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function getGroupedValues() {
    const groupedValues = new Map();

    gameState.values.forEach((rawValue) => {
        const value = sanitizeValue(rawValue);
        if (!value) {
            return;
        }

        const key = value.toLowerCase();
        const current = groupedValues.get(key);
        if (current) {
            current.count += 1;
            return;
        }

        groupedValues.set(key, {
            label: value,
            count: 1
        });
    });

    return Array.from(groupedValues.values());
}

function getValuesSummary() {
    const groupedValues = getGroupedValues();
    if (groupedValues.length === 0) {
        return 'None yet.';
    }

    return groupedValues
        .map((value) => `${value.label} x${value.count}`)
        .join(', ');
}

function setValuesFeedback(message) {
    if (!valuesFeedback) {
        return;
    }

    valuesFeedback.textContent = message || '';
}

function setInputFeedback(message, state = 'default') {
    if (!inputFeedback) {
        return;
    }

    inputFeedback.textContent = message || '';
    inputFeedback.dataset.state = state;
}

function cancelPendingImageRequest() {
    if (activeImageAbortController) {
        activeImageAbortController.abort();
        activeImageAbortController = null;
    }
}

function startImageRequest() {
    cancelPendingImageRequest();
    activeImageRequestId += 1;
    imageLoading.classList.remove('hidden');
    childImage.classList.remove('loaded');
    return activeImageRequestId;
}

function createImageAbortController() {
    if (typeof AbortController !== 'function') {
        return null;
    }

    const controller = new AbortController();
    activeImageAbortController = controller;
    return controller;
}

function clearImageAbortController(controller) {
    if (controller && activeImageAbortController === controller) {
        activeImageAbortController = null;
    }
}

function isLatestImageRequest(requestId) {
    return requestId === activeImageRequestId;
}

function applyGeneratedImage(imageData, mimeType, requestId) {
    if (!isLatestImageRequest(requestId)) {
        return false;
    }

    childImage.src = `data:${mimeType || 'image/png'};base64,${imageData}`;
    childImage.classList.add('loaded');
    imageLoading.classList.add('hidden');
    return true;
}

function setGameMode(mode) {
    gameContainer.classList.toggle('mode-question', mode === 'question');
    gameContainer.classList.toggle('mode-values', mode === 'values');
}

function updateTimelineHeader(age) {
    const yearsRemaining = Math.max(0, 18 - age);
    const ageLabel = age === 0 ? 'Birth' : `Age ${age}`;
    gameTitle.textContent = `${ageLabel} · ${yearsRemaining} ${yearsRemaining === 1 ? 'year' : 'years'} until adulthood`;
}

function setQuestionPhaseVisible(isVisible) {
    sampleOptions.classList.toggle('phase-hidden', !isVisible);
}

function configurePrimaryInput(mode) {
    if (mode === 'values') {
        playerInput.disabled = true;
        inputContainer.classList.add('phase-hidden');
        setInputFeedback('');

        if (valueInput) {
            valueInput.value = '';
            valueInput.disabled = false;
            valueInput.placeholder = 'Money, loyalty, pessimism...';
            valueInput.inputMode = 'text';
            valueInput.setAttribute('aria-label', 'Enter one value to instill in your child');
        }

        if (valueSubmitBtn) {
            valueSubmitBtn.disabled = false;
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

        const label = document.createElement('span');
        label.className = 'sample-option-label';
        label.textContent = sampleText;
        button.appendChild(label);

        button.addEventListener('click', () => {
            playerInput.value = sampleText;
            playerInput.focus();
            playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
        });
        sampleOptions.appendChild(button);
    });
}

function renderCurrentValues() {
    if (!currentValuesList) {
        return;
    }

    const groupedValues = getGroupedValues();
    currentValuesList.innerHTML = '';

    if (groupedValues.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'values-empty';
        emptyState.textContent = 'No values yet. The child is still mostly mystery.';
        currentValuesList.appendChild(emptyState);
        return;
    }

    groupedValues.forEach((value) => {
        const pill = document.createElement('div');
        pill.className = 'value-pill';

        const label = document.createElement('span');
        label.className = 'value-pill-label';
        label.textContent = value.label;

        const count = document.createElement('span');
        count.className = 'value-pill-count';
        count.textContent = `x${value.count}`;

        pill.appendChild(label);
        pill.appendChild(count);
        currentValuesList.appendChild(pill);
    });
}

function showValuesOverlay() {
    renderCurrentValues();
    setGameMode('values');
    setQuestionPhaseVisible(false);
    if (valuesOverlay) {
        valuesOverlay.classList.remove('hidden');
    }
    setValuesFeedback('');
    questionEyebrow.textContent = 'Instill A Value';
    questionText.textContent = 'While the oracle sketches the next face, choose one value you want this child to carry forward.';
    configurePrimaryInput('values');
    if (valueInput) {
        valueInput.focus();
    }
}

function hideValuesOverlay() {
    if (valuesOverlay) {
        valuesOverlay.classList.add('hidden');
    }
    if (valueInput) {
        valueInput.value = '';
    }
    setValuesFeedback('');
}

function submitValue() {
    if (!valueInput || !valueSubmitBtn) {
        return;
    }

    const value = sanitizeValue(valueInput.value);
    if (!value) {
        setValuesFeedback('Name one value before moving on.');
        valueInput.focus();
        return;
    }

    gameState.values.push(value);
    renderCurrentValues();
    hideValuesOverlay();

    if (valueEntryResolver) {
        const resolve = valueEntryResolver;
        valueEntryResolver = null;
        resolve(value);
    }
}

function waitForValueEntry() {
    showValuesOverlay();

    return new Promise((resolve) => {
        valueEntryResolver = resolve;
    });
}

// Oracle System Prompt (from destiny_prompt.md)
const ORACLE_SYSTEM_PROMPT = `You are The Oracle of Fates — an all-knowing, darkly comedic soothsayer who can read a child's destiny from the choices their parent makes. You speak with absolute conviction. You do not hedge. You do not say "it depends." You see the thread of fate clearly, and you call it like it is.

Your job: after each parenting decision, synthesize EVERY answer given so far and declare what this child is destined to become. The destiny EVOLVES — it can shift dramatically between rounds as new information changes the trajectory. A child headed for "Beloved Kindergarten Teacher" can pivot to "Charismatic Cult Leader" in a single answer.

The parent may also provide instilled VALUES as freeform tags. Treat those values as recurring moral and psychological signals, not decorative flavor text. If a value appears multiple times, it should feel more deeply rooted in the child and should exert noticeably more influence on both destiny and visual presentation than a value that appears only once.

## Rules for Destinies

1. A Destiny is 1–5 words describing both WHAT they become and WHO they are. It's a career fused with a character judgment.
2. Commit to a moral stance. The child is either:
   - Clearly good (generous, kind, heroic)
   - Clearly bad (corrupt, cruel, destructive)
   - Morally grey (well-intentioned but flawed, successful but hollow)
   Pick a lane. Do NOT sit on the fence with safe, neutral destinies.
3. Be funny. Be bold. Exaggerate for comedic effect. These should be destinies people screenshot and share with friends.
4. Ground every destiny in the actual answers and instilled values. The humor comes from drawing absurd-but-defensible conclusions from real parenting choices. Never make it random.
5. Vary your range. Don't default to the same archetypes. Pull from unexpected careers, niche lifestyles, historical parallels, and modern absurdity. Think beyond "doctor/lawyer/criminal."
6. Keep the profession grounded in the real world. The destiny can be exaggerated, elite, niche, glamorous, notorious, or highly improbable for an ordinary person, but it must still be a plausible human role or life path. Good: "President", "Busker in Venice", "Homesteader", "Disgraced Megachurch Pastor", "Luxury Wellness Cultist". Bad: "Dragonslayer", "Time Wizard", "Moon King".
7. When combining multiple traits, answers, and instilled values, synthesize them into a single organic archetype instead of stapling two nouns together. Look for the believable real-world role that naturally unites the evidence, interests, aesthetics, and moral tone. Do not create clunky mashups like "Ballerina Warlord" just because both ideas appear in the input; instead, infer the more coherent adjacent archetype, such as "Russian Spy", "Arms Lobby Socialite", or "Militarist Choreographer", depending on the evidence.
8. Repeated values should compound. A value tagged twice or more is no longer a hint; it is a defining force. Let repeated values outweigh one-off values when there is tension, and allow them to meaningfully bend the destiny toward a clearer, stronger archetype.
9. Prefer destinies that feel culturally, psychologically, and socially legible. The player should immediately understand how this person became that sort of adult from the parenting choices, even when the conclusion is darkly funny or extreme.
10. Use plain modern language. Do not make the destiny sound medieval, mythic, Old English, fantasy-coded, or Game of Thrones-ish. Avoid phrases like "of the Wastes", "of the Void", "Forsaken", "Shadow", "Blood", "Iron", "Feral", or other theatrical lore language unless the answers very specifically justify a modern real-world version of that phrasing.
11. The destiny should sound like a real person with a job and a point of view. Favor names that imply both occupation and personality in normal contemporary wording, such as "Paranoid Survivalist Dad", "Cruel Tech Founder", "Fame-Hungry Youth Pastor", "Burned-Out Public Defender", or "Overconfident Wellness Grifter".

### Destiny examples (for tone calibration only — do NOT reuse these):
- "Paranoid Survivalist Dad"
- "LinkedIn Influencer With No Friends"
- "Undercover Nun"
- "World's Okayest Surgeon"
- "Burned-Out Public Defender"
- "Dog Whisperer, Human Ignorer"
- "Billionaire Who Tips Poorly"
- "Whistleblower Living in Exile"
- "Competitive Eating Champion"
- "Cruel Tech Founder"

## Rules for Justification

Write 1–2 sentences explaining WHY this destiny emerged from the answers and values. Be specific — reference the actual answers, not vague generalities. If repeated values shaped the outcome, explicitly say so. The tone should feel like a fortune teller delivering prophecy with unsettling confidence.

## Rules for the Image Prompt

After determining the Destiny and Justification, generate an image prompt for image generation. This prompt must:

1. Describe a semi-realistic portrait/headshot of this person at the age specified in the input.
2. Translate the Destiny, Justification, and strongest instilled values into VISUAL storytelling — their expression, clothing, setting, lighting, and small details should all hint at who they are and what they've become.
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

function buildOracleUserPrompt(currentQuestion, currentAnswer) {
    // Build previous Q&A history
    let previousRounds = '';
    gameState.answers.forEach((qa, index) => {
        previousRounds += `Q${index + 1}: "${qa.question}"\n`;
        previousRounds += `A${index + 1}: "${qa.answer}"\n\n`;
    });

    // Build user prompt
    return `Here is the current state of the game:

CHILD'S NAME: ${gameState.childName || 'Unknown'}
CHILD'S GENDER: ${gameState.childGender || 'Unknown'}
CHILD'S RACE: ${gameState.childRace || 'Unknown'}
CHILD'S CURRENT AGE: ${gameState.currentAge}
CHILD'S CURRENT PHYSICAL DESCRIPTION: ${gameState.physicalDescription}
CHILD'S INSTILLED VALUES:
${getValuesSummary()}

VALUE GUIDANCE:
These are the values the parent has chosen to instill in this child over time.
Treat them as explicit personality tags, worldview cues, and future-shaping pressures.
Values that appear multiple times are more deeply ingrained and should matter more than one-off values.
If a repeated value conflicts with a softer signal elsewhere, let the repeated value pull harder.
Factor these values into the child's personality, worldview, behavior, destiny, and the visual tone of the portrait.

PREVIOUS QUESTIONS AND ANSWERS (in order):
${previousRounds}
NEW QUESTION JUST ASKED:
Q${gameState.answers.length + 1}: "${currentQuestion}"

PLAYER'S NEW ANSWER:
A${gameState.answers.length + 1}: "${currentAnswer}"

Based on ALL of the above — every answer, not just the latest — determine this child's evolving Destiny. Respond with the JSON object only.`;
}

// Call the Oracle to determine destiny, then let portrait generation run in parallel.
async function consultOracle(currentQuestion, currentAnswer) {
    const userPrompt = buildOracleUserPrompt(currentQuestion, currentAnswer);

    try {
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

        const [questionsResponse] = await Promise.all([
            fetch('questions.json'),
            loadNewbornManifest()
        ]);

        gameState.questionsData = await questionsResponse.json();
        renderProgressSegments();
        resetGameUi();
        showScreen('title');
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
    loadYear(0, { skipImageGeneration: true });
}

async function beginBirthFlow() {
    if (!childNameInput || !gameState.childGender) {
        return;
    }

    const childName = childNameInput.value.trim();
    const childGender = gameState.childGender;
    if (!childName) {
        updateBirthButtonState();
        childNameInput.focus();
        return;
    }

    const portrait = getRandomNewbornOption();
    const existingQuestions = gameState.questionsData;

    gameState = createDefaultGameState(existingQuestions);
    gameState.childName = childName;
    gameState.childGender = childGender;
    gameState.childRace = portrait.race || portrait.label || 'Unknown';
    gameState.physicalDescription = portrait.physicalDescription || DEFAULT_PHYSICAL_DESCRIPTION;

    resetGameUi();
    showScreen('game');
    applyStartingPortrait(portrait);
    await startOpeningSequence();
}

// Load a specific year
function loadYear(age, options = {}) {
    const yearData = gameState.questionsData.years.find((year) => year.age === age);

    if (!yearData) {
        endGame();
        return;
    }

    gameState.currentAge = age;
    updateTimelineHeader(age);
    setGameMode('question');
    questionContainer.classList.remove('phase-hidden');
    questionContainer.removeAttribute('aria-hidden');
    setQuestionPhaseVisible(true);
    configurePrimaryInput('question');
    inputContainer.classList.remove('phase-hidden');
    inputContainer.removeAttribute('aria-hidden');
    playerInput.classList.remove('phase-hidden');
    submitBtn.classList.remove('phase-hidden');
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
    const progressSegments = progressBar ? progressBar.querySelectorAll('.progress-segment') : [];
    const currentIndex = getPlayableAgeIndex(age);

    progressSegments.forEach((segment, index) => {
        if (index <= currentIndex) {
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

    try {
        // Get current question
        const currentQuestion = gameState.questionsData.years[gameState.currentAge].question;

        // Resolve the Oracle first, then let the next portrait render while the player names a value.
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

        generateChildImage(oracleResponse.image_prompt);

        await waitForValueEntry();

        // Move to next year or end game
        const nextAge = getNextPlayableAge(gameState.currentAge);
        if (nextAge !== null) {
            loadYear(nextAge);
        } else {
            endGame();
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        setInputFeedback(error.message || 'The Oracle could not process that answer.');
    } finally {
        submitBtn.disabled = false;
        playerInput.disabled = false;
    }
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
    const requestId = startImageRequest();
    const controller = createImageAbortController();

    try {
        // Call backend to generate image with Gemini
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            ...(controller ? { signal: controller.signal } : {}),
            body: JSON.stringify({
                prompt: imagePrompt
            })
        });

        const data = await readJsonResponse(response, 'Image generation failed.');

        if (data?.usePlaceholder) {
            showPlaceholderImage(imagePrompt, requestId);
            return;
        }

        if (data?.imageData) {
            applyGeneratedImage(data.imageData, data.mimeType, requestId);
        } else {
            throw new Error('No image data in response.');
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        console.error('Error generating image:', error);
        showPlaceholderImage(imagePrompt, requestId);
    } finally {
        clearImageAbortController(controller);
    }
}

// Show placeholder image
function showPlaceholderImage(prompt, requestId = activeImageRequestId) {
    if (!isLatestImageRequest(requestId)) {
        return;
    }

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
    const maxScore = PLAYABLE_AGES.length * 25;
    const percentage = Math.round((gameState.score / maxScore) * 100);

    hideValuesOverlay();
    closeDebugModal();
    questionContainer.classList.add('phase-hidden');
    questionContainer.setAttribute('aria-hidden', 'true');
    setQuestionPhaseVisible(false);
    inputContainer.classList.add('phase-hidden');
    inputContainer.setAttribute('aria-hidden', 'true');
    playerInput.classList.add('phase-hidden');
    submitBtn.classList.add('phase-hidden');
    playerInput.disabled = true;
    submitBtn.disabled = true;
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
    gameState = createDefaultGameState(gameState.questionsData);
    resetGameUi();
    resetCreateScreen();
    showScreen('title');
}

// Event Listeners
if (playBtn) {
    playBtn.addEventListener('click', () => {
        showScreen('create');
        if (childNameInput) {
            childNameInput.focus();
        }
    });
}

if (childNameInput) {
    childNameInput.addEventListener('input', () => {
        updateBirthButtonState();
    });

    childNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && birthBtn && !birthBtn.disabled) {
            e.preventDefault();
            beginBirthFlow();
        }
    });
}

if (genderOptions) {
    genderOptions.addEventListener('click', (e) => {
        const button = e.target.closest('.gender-btn');
        if (!button) {
            return;
        }

        setSelectedGender(button.dataset.gender);
    });
}

if (birthBtn) {
    birthBtn.addEventListener('click', () => {
        beginBirthFlow();
    });
}

submitBtn.addEventListener('click', () => {
    submitAnswer();
});
playerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();

        submitAnswer();
    }
});
playerInput.addEventListener('input', () => {
    if (gameContainer.classList.contains('mode-values')) {
        return;
    }

    if (playerInput.value.trim()) {
        setInputFeedback('', 'muted');
    }
});
restartBtn.addEventListener('click', restartGame);
if (valueSubmitBtn) {
    valueSubmitBtn.addEventListener('click', submitValue);
}
if (valueInput) {
    valueInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitValue();
        }
    });
}
if (valueInput) {
    valueInput.addEventListener('input', () => {
        if (valueInput.value.trim()) {
            setValuesFeedback('');
        }
    });
}
if (valueSuggestions) {
    valueSuggestions.addEventListener('click', (e) => {
        const button = e.target.closest('[data-value]');
        if (!button || !valueInput) {
            return;
        }

        valueInput.value = button.dataset.value || '';
        valueInput.focus();
        valueInput.setSelectionRange(valueInput.value.length, valueInput.value.length);
        setValuesFeedback('');
    });
}

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
