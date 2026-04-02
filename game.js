const PLAYABLE_AGES = [0, 5, 10, 12, 15, 16, 17];
const BUILD_NUMBER = 70;
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
const newbornImagePreloads = [];

const FALLBACK_ORACLE_RESPONSE = {
    destiny: 'Mysterious Soul',
    moral_alignment: 'grey',
    justification: "The Oracle's vision is clouded...",
    image_prompt: 'semi-realistic portrait of a child, head and shoulders',
    physical_description: DEFAULT_PHYSICAL_DESCRIPTION
};
const FALLBACK_DESTINY_RESPONSE = {
    destiny: FALLBACK_ORACLE_RESPONSE.destiny,
    moral_alignment: FALLBACK_ORACLE_RESPONSE.moral_alignment,
    justification: FALLBACK_ORACLE_RESPONSE.justification
};
const DEFAULT_VOICE_PLAYBACK_TIMEOUT_MS = 10000;
const DESTINY_REVEAL_FULL_LINE_FALLBACK_MS = 3200;
const DESTINY_REVEAL_FULL_VO_TIMEOUT_MS = 14000;
const DESTINY_REVEAL_VO_PLAYBACK_RATE = 0.8;
const DESTINY_REVEAL_STARDUST_PAUSE_MS = 350;
const DESTINY_REVEAL_TAIL_DELAY_MS = 220;
const TITLE_SCREEN_VOICE_TEXT = 'Minor Decisions: A strange little life simulator.';
const PRIMARY_INPUT_PLACEHOLDER = 'Enter your text';

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
const finalScreenOverlay = document.getElementById('final-screen-overlay');
const finalDestiny = document.getElementById('final-destiny');
const finalScreenImage = document.getElementById('final-screen-image');
const finalScreenLoading = document.getElementById('final-screen-loading');
const scoreDisplay = document.getElementById('score-display');
const successDisplay = document.getElementById('success-display');
const shareBtn = document.getElementById('share-btn');
const saveBtn = document.getElementById('save-btn');
const finalScreenStatus = document.getElementById('final-screen-status');
const restartBtn = document.getElementById('restart-btn');
const destinyRevealOverlay = document.getElementById('destiny-reveal-overlay');
const destinyRevealText = document.getElementById('destiny-reveal-text');
const destinyRevealLead = document.getElementById('destiny-reveal-lead');
const destinyRevealDestiny = document.getElementById('destiny-reveal-destiny');
const destinyRevealTail = document.getElementById('destiny-reveal-tail');
const destinyRevealContinue = document.getElementById('destiny-reveal-continue');
const progressBar = document.getElementById('progress-bar');
const valuesOverlay = document.getElementById('values-overlay');
const currentValuesList = document.getElementById('current-values-list');
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
let destinyRevealResolver = null;
let activeImageRequestId = 0;
let activeImageAbortController = null;
let activeFinalImageRequestId = 0;
let activeFinalImageAbortController = null;
let destinyRevealButtonTimer = null;
let sharedAudioContext = null;
let activeVoiceAudio = null;
let html2CanvasPromise = null;
let currentScreenName = null;
let isTitleVoiceAttemptInFlight = false;
let hasPlayedTitleVoiceForScreen = false;
let isTitleVoiceRetryArmed = false;
let titleVoiceAttemptToken = 0;

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

    return PLAYABLE_AGES.map((age) => {
        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        segment.setAttribute('aria-label', `Age ${age}`);

        const label = document.createElement('span');
        label.className = 'progress-segment-label';
        label.textContent = `Age ${age}`;
        segment.appendChild(label);

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

function preloadStartingPortraits() {
    if (typeof Image !== 'function') {
        return;
    }

    newbornImagePreloads.length = 0;

    newbornManifest.forEach((option) => {
        if (!option?.file) {
            return;
        }

        const img = new Image();
        img.decoding = 'async';
        img.fetchPriority = 'high';
        img.src = `/public/newborns/${option.file}`;
        newbornImagePreloads.push(img);
    });
}

function showScreen(screenName) {
    Object.entries(screenMap).forEach(([key, screen]) => {
        if (!screen) {
            return;
        }

        screen.classList.toggle('hidden', key !== screenName);
    });

    const isEnteringTitle = screenName === 'title' && currentScreenName !== 'title';
    currentScreenName = screenName;

    if (screenName !== 'title') {
        cancelTitleVoiceRetry();
        titleVoiceAttemptToken += 1;
        isTitleVoiceAttemptInFlight = false;
        return;
    }

    if (isEnteringTitle) {
        resetTitleVoiceState();
        void playTitleScreenVoice();
    }
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
    cancelPendingFinalImageRequest();
    hideFinalScreenOverlay();
    valueEntryResolver = null;
    destinyRevealResolver = null;
    hideValuesOverlay();
    hideDestinyRevealOverlay();
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
    showFinalScreenStatus('');

    if (finalScreenImage) {
        finalScreenImage.removeAttribute('src');
        finalScreenImage.classList.remove('loaded');
    }

    if (finalScreenLoading) {
        finalScreenLoading.classList.add('hidden');
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

function getGroupedValues(values = gameState.values) {
    const groupedValues = new Map();

    values.forEach((rawValue) => {
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

function getValuesSummary(values = gameState.values) {
    const groupedValues = getGroupedValues(values);
    if (groupedValues.length === 0) {
        return 'None yet.';
    }

    return groupedValues
        .map((value) => `${value.label} x${value.count}`)
        .join(', ');
}

function getContinuityPhysicalDescription(physicalDescription = gameState.physicalDescription) {
    const description = (physicalDescription || DEFAULT_PHYSICAL_DESCRIPTION)
        .replace(/\bnewborn baby\b/gi, '')
        .replace(/\bnewborn\b/gi, '')
        .replace(/\bbaby\b/gi, '')
        .replace(/\binfant\b/gi, '')
        .replace(/\btoddler\b/gi, '')
        .replace(/\bchild\b/gi, '')
        .replace(/\bkid\b/gi, '')
        .replace(/\bteenager\b/gi, '')
        .replace(/\bteen\b/gi, '')
        .replace(/\byoung adult\b/gi, '')
        .replace(/\badult\b/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+,/g, ',')
        .trim()
        .replace(/^,\s*/, '')
        .replace(/,\s*$/, '');

    return description || DEFAULT_PHYSICAL_DESCRIPTION;
}

function setValuesFeedback(message) {
    setInputFeedback(message || '');
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

function cancelPendingFinalImageRequest() {
    if (activeFinalImageAbortController) {
        activeFinalImageAbortController.abort();
        activeFinalImageAbortController = null;
    }
}

function startImageRequest(options = {}) {
    const {
        showLoadingOverlay = true,
        preserveExistingImage = false
    } = options;

    cancelPendingImageRequest();
    activeImageRequestId += 1;

    if (showLoadingOverlay) {
        imageLoading.classList.remove('hidden');
    } else {
        imageLoading.classList.add('hidden');
    }

    if (!preserveExistingImage) {
        childImage.classList.remove('loaded');
    }

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

function clearFinalImageAbortController(controller) {
    if (controller && activeFinalImageAbortController === controller) {
        activeFinalImageAbortController = null;
    }
}

function isLatestImageRequest(requestId) {
    return requestId === activeImageRequestId;
}

function isLatestFinalImageRequest(requestId) {
    return requestId === activeFinalImageRequestId;
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

function finalizeImageRequestWithoutSwap(requestId) {
    if (!isLatestImageRequest(requestId)) {
        return false;
    }

    imageLoading.classList.add('hidden');
    return true;
}

function showFinalScreenStatus(message = '', state = 'muted') {
    if (!finalScreenStatus) {
        return;
    }

    finalScreenStatus.textContent = message || '';
    finalScreenStatus.dataset.state = state;
}

function hideFinalScreenOverlay() {
    if (finalScreenOverlay) {
        finalScreenOverlay.classList.add('hidden');
    }
}

function showFinalScreenOverlay() {
    if (finalScreenOverlay) {
        finalScreenOverlay.classList.remove('hidden');
    }
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

function setPrimaryInputVisible(isVisible) {
    inputContainer.classList.toggle('phase-hidden', !isVisible);
    playerInput.classList.toggle('phase-hidden', !isVisible);
    submitBtn.classList.toggle('phase-hidden', !isVisible);
}

function configurePrimaryInput(mode) {
    if (mode === 'values') {
        setPrimaryInputVisible(true);
        playerInput.disabled = false;
        playerInput.value = '';
        playerInput.placeholder = PRIMARY_INPUT_PLACEHOLDER;
        playerInput.inputMode = 'text';
        playerInput.setAttribute('aria-label', 'Enter one value to instill in your child');
        submitBtn.textContent = 'Add Value';
        submitBtn.disabled = false;
        setInputFeedback('');
        return;
    }

    setPrimaryInputVisible(true);
    playerInput.disabled = false;
    playerInput.placeholder = PRIMARY_INPUT_PLACEHOLDER;
    playerInput.inputMode = 'text';
    playerInput.setAttribute('aria-label', 'Write your answer');
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = false;
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
        emptyState.textContent = 'None';
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

function clearDestinyRevealTimer() {
    if (destinyRevealButtonTimer) {
        clearTimeout(destinyRevealButtonTimer);
        destinyRevealButtonTimer = null;
    }
}

function getIndefiniteArticle(phrase) {
    return /^[aeiou]/i.test((phrase || '').trim()) ? 'an' : 'a';
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function cancelTitleVoiceRetry() {
    if (!isTitleVoiceRetryArmed) {
        return;
    }

    document.removeEventListener('pointerdown', handleTitleVoiceRetry, true);
    document.removeEventListener('keydown', handleTitleVoiceRetry, true);
    isTitleVoiceRetryArmed = false;
}

function resetTitleVoiceState() {
    cancelTitleVoiceRetry();
    hasPlayedTitleVoiceForScreen = false;
    isTitleVoiceAttemptInFlight = false;
    titleVoiceAttemptToken += 1;
}

function handleTitleVoiceRetry() {
    cancelTitleVoiceRetry();
    if (currentScreenName !== 'title') {
        return;
    }

    void playTitleScreenVoice();
}

function armTitleVoiceRetry() {
    if (isTitleVoiceRetryArmed) {
        return;
    }

    isTitleVoiceRetryArmed = true;
    document.addEventListener('pointerdown', handleTitleVoiceRetry, true);
    document.addEventListener('keydown', handleTitleVoiceRetry, true);
}

function getDestinyRevealSegments(destiny) {
    const safeName = gameState.childName || 'your child';
    const safeDestiny = destiny || FALLBACK_DESTINY_RESPONSE.destiny;
    const article = getIndefiniteArticle(safeDestiny);
    return {
        lead: `${safeName} is currently destined to become ${article}`,
        destiny: safeDestiny,
        tail: 'as an Adult.'
    };
}

function stopActiveVoiceAudio() {
    if (!activeVoiceAudio) {
        return;
    }

    activeVoiceAudio.pause();
    activeVoiceAudio.src = '';
    activeVoiceAudio = null;
}

function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    if (!sharedAudioContext) {
        sharedAudioContext = new AudioContextClass();
    }

    return sharedAudioContext;
}

async function ensureAudioContextResumed() {
    const audioContext = getAudioContext();
    if (!audioContext || audioContext.state !== 'suspended') {
        return audioContext;
    }

    try {
        await audioContext.resume();
    } catch (error) {
        return audioContext;
    }

    return audioContext;
}

async function fetchVoiceAudioResult(text) {
    if (!text) {
        return {
            voiceResult: null,
            errorMessage: 'Speech text is required.'
        };
    }

    try {
        const response = await fetch('/api/voice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        const data = await readJsonResponse(response, 'Voice generation failed.');
        if (data?.useFallback || !data?.audioBase64) {
            return {
                voiceResult: null,
                errorMessage: data?.error || data?.detail || 'Voice generation failed.'
            };
        }

        return {
            voiceResult: data,
            errorMessage: ''
        };
    } catch (error) {
        console.error('Error requesting voice audio:', error);
        return {
            voiceResult: null,
            errorMessage: error?.data?.error || error.message || 'Voice generation failed.'
        };
    }
}

async function requestVoiceAudio(text) {
    const { voiceResult } = await fetchVoiceAudioResult(text);
    return voiceResult;
}

function setAudioPlaybackRate(audio, playbackRate) {
    if (!audio || typeof playbackRate !== 'number' || !Number.isFinite(playbackRate)) {
        return;
    }

    audio.playbackRate = playbackRate;
    if ('preservesPitch' in audio) {
        audio.preservesPitch = true;
    }
}

async function playVoiceClip(voiceResult, fallbackDuration, options = {}) {
    const {
        playbackRate = 1,
        timeoutMs = DEFAULT_VOICE_PLAYBACK_TIMEOUT_MS
    } = options;

    if (!voiceResult?.audioBase64) {
        await sleep(fallbackDuration);
        return false;
    }

    const audio = new Audio(`data:${voiceResult.mimeType || 'audio/mpeg'};base64,${voiceResult.audioBase64}`);
    activeVoiceAudio = audio;
    setAudioPlaybackRate(audio, playbackRate);

    await ensureAudioContextResumed();

    try {
        await audio.play();
    } catch (error) {
        console.error('Voice playback fallback:', error);
        if (activeVoiceAudio === audio) {
            activeVoiceAudio = null;
        }
        await sleep(fallbackDuration);
        return false;
    }

    let didTimeout = false;
    let didError = false;
    await Promise.race([
        new Promise((resolve) => {
            const finalize = () => {
                audio.removeEventListener('ended', finalize);
                audio.removeEventListener('error', finalize);
                if (activeVoiceAudio === audio) {
                    activeVoiceAudio = null;
                }
                resolve();
            };

            audio.addEventListener('ended', finalize, { once: true });
            audio.addEventListener('error', () => {
                didError = true;
                finalize();
            }, { once: true });
        }),
        sleep(timeoutMs).then(() => {
            didTimeout = true;
        })
    ]);

    if (didTimeout) {
        audio.pause();
    }

    if (activeVoiceAudio === audio) {
        activeVoiceAudio = null;
    }

    return !didError;
}

async function playTitleScreenVoice() {
    if (
        currentScreenName !== 'title' ||
        hasPlayedTitleVoiceForScreen ||
        isTitleVoiceAttemptInFlight
    ) {
        return;
    }

    isTitleVoiceAttemptInFlight = true;
    const attemptToken = ++titleVoiceAttemptToken;

    const { voiceResult } = await fetchVoiceAudioResult(TITLE_SCREEN_VOICE_TEXT);
    if (attemptToken !== titleVoiceAttemptToken || currentScreenName !== 'title') {
        isTitleVoiceAttemptInFlight = false;
        return;
    }

    if (!voiceResult) {
        cancelTitleVoiceRetry();
        isTitleVoiceAttemptInFlight = false;
        return;
    }

    const didPlay = await playVoiceClip(voiceResult, 600);
    if (attemptToken !== titleVoiceAttemptToken || currentScreenName !== 'title') {
        isTitleVoiceAttemptInFlight = false;
        return;
    }

    isTitleVoiceAttemptInFlight = false;

    if (didPlay) {
        hasPlayedTitleVoiceForScreen = true;
        cancelTitleVoiceRetry();
        return;
    }

    armTitleVoiceRetry();
}

async function playStardustFx() {
    const audioContext = await ensureAudioContextResumed();
    if (!audioContext) {
        return;
    }

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    master.connect(audioContext.destination);

    [
        { frequency: 1120, delay: 0, duration: 0.38 },
        { frequency: 1560, delay: 0.08, duration: 0.34 },
        { frequency: 2080, delay: 0.16, duration: 0.28 }
    ].forEach((tone, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = index === 0 ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(tone.frequency, now + tone.delay);
        oscillator.frequency.exponentialRampToValueAtTime(
            tone.frequency * 1.28,
            now + tone.delay + tone.duration
        );
        gainNode.gain.setValueAtTime(0.0001, now + tone.delay);
        gainNode.gain.exponentialRampToValueAtTime(0.14, now + tone.delay + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + tone.delay + tone.duration);
        oscillator.connect(gainNode);
        gainNode.connect(master);
        oscillator.start(now + tone.delay);
        oscillator.stop(now + tone.delay + tone.duration + 0.05);
    });
}

function showDestinyRevealOverlay() {
    if (!destinyRevealOverlay || !destinyRevealText || !destinyRevealContinue) {
        return;
    }

    stopActiveVoiceAudio();
    clearDestinyRevealTimer();
    destinyRevealOverlay.classList.remove(
        'hidden',
        'is-loading',
        'phase-lead-visible',
        'phase-destiny-visible',
        'phase-tail-visible',
        'show-continue'
    );
    destinyRevealOverlay.classList.add('is-loading');
    if (destinyRevealLead) {
        destinyRevealLead.textContent = '';
    }
    if (destinyRevealDestiny) {
        destinyRevealDestiny.textContent = '';
    }
    if (destinyRevealTail) {
        destinyRevealTail.textContent = '';
    }
    destinyRevealContinue.classList.add('hidden');
}

function prepareDestinyReveal(oracleResponse) {
    if (!destinyRevealLead || !destinyRevealDestiny || !destinyRevealTail) {
        return;
    }

    destinyRevealOverlay.classList.remove('is-loading');
    const segments = getDestinyRevealSegments(oracleResponse?.destiny);
    destinyRevealLead.textContent = segments.lead;
    destinyRevealDestiny.textContent = segments.destiny;
    destinyRevealTail.textContent = segments.tail;
}

function showDestinyRevealContinue() {
    if (!destinyRevealOverlay || !destinyRevealContinue) {
        return;
    }

    clearDestinyRevealTimer();
    destinyRevealContinue.classList.remove('hidden');
    destinyRevealButtonTimer = setTimeout(() => {
        destinyRevealOverlay.classList.add('show-continue');
        destinyRevealButtonTimer = null;
    }, 20);
}

function hideDestinyRevealOverlay() {
    if (!destinyRevealOverlay || !destinyRevealText || !destinyRevealContinue) {
        return;
    }

    stopActiveVoiceAudio();
    clearDestinyRevealTimer();
    destinyRevealOverlay.classList.add('hidden');
    destinyRevealOverlay.classList.remove(
        'is-loading',
        'phase-lead-visible',
        'phase-destiny-visible',
        'phase-tail-visible',
        'show-continue'
    );
    if (destinyRevealLead) {
        destinyRevealLead.textContent = '';
    }
    if (destinyRevealDestiny) {
        destinyRevealDestiny.textContent = '';
    }
    if (destinyRevealTail) {
        destinyRevealTail.textContent = '';
    }
    destinyRevealContinue.classList.add('hidden');
    destinyRevealResolver = null;
}

function waitForDestinyRevealContinue() {
    return new Promise((resolve) => {
        destinyRevealResolver = resolve;
    });
}

function buildFullRevealVoiceText(destiny) {
    const safeName = gameState.childName || 'your child';
    const safeDestiny = destiny || FALLBACK_DESTINY_RESPONSE.destiny;
    const article = getIndefiniteArticle(safeDestiny);
    return `The oracle sees that ${safeName} is currently destined to become ${article} ${safeDestiny} as an adult.`;
}

function applyOracleReveal(oracleResponse) {
    gameState.destiny = oracleResponse.destiny;
    gameState.moralAlignment = oracleResponse.moral_alignment;
    gameState.justification = oracleResponse.justification;
    gameState.physicalDescription = oracleResponse.physical_description;
    updateDestiny(oracleResponse.destiny, oracleResponse.justification);
}

async function runDestinyRevealSequence({
    oracleResponse,
    revealVoiceResult
}) {
    prepareDestinyReveal(oracleResponse);

    destinyRevealOverlay.classList.add('phase-lead-visible');

    const voicePlaybackPromise = playVoiceClip(
        revealVoiceResult,
        DESTINY_REVEAL_FULL_LINE_FALLBACK_MS,
        {
            playbackRate: DESTINY_REVEAL_VO_PLAYBACK_RATE,
            timeoutMs: DESTINY_REVEAL_FULL_VO_TIMEOUT_MS
        }
    );

    await sleep(DESTINY_REVEAL_STARDUST_PAUSE_MS);
    await playStardustFx();

    destinyRevealOverlay.classList.add('phase-destiny-visible');
    applyOracleReveal(oracleResponse);

    await sleep(DESTINY_REVEAL_TAIL_DELAY_MS);
    destinyRevealOverlay.classList.add('phase-tail-visible');
    await voicePlaybackPromise;
}

async function requestGeneratedPortrait(prompt, controller) {
    const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        ...(controller ? { signal: controller.signal } : {}),
        body: JSON.stringify({
            prompt
        })
    });

    return readJsonResponse(response, 'Image generation failed.');
}

function setElementImageSource(imageElement, loadingElement, source) {
    if (!imageElement || !source) {
        return false;
    }

    imageElement.src = source;
    imageElement.classList.add('loaded');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
    return true;
}

function applyGeneratedImageToElement(imageElement, loadingElement, imageData, mimeType, requestId) {
    if (!isLatestFinalImageRequest(requestId)) {
        return false;
    }

    return setElementImageSource(
        imageElement,
        loadingElement,
        `data:${mimeType || 'image/png'};base64,${imageData}`
    );
}

function buildRescuePortraitPrompt(fallbackState = {}) {
    const age = fallbackState.age ?? gameState.currentAge;
    const physicalDescription = getContinuityPhysicalDescription(
        fallbackState.physicalDescription || gameState.physicalDescription
    );
    const gender = gameState.childGender ? `${gameState.childGender} ` : '';
    const destinyHint = fallbackState.destiny ? `${fallbackState.destiny}, ` : '';

    return `semi-realistic portrait of a ${age} year old ${gender}child, head and shoulders, ${physicalDescription}, ${destinyHint}natural clothing, direct gaze, soft natural light, plain studio backdrop, photorealistic, detailed face`;
}

function buildFinalPortraitPrompt() {
    const adulthoodDestiny = gameState.destiny || 'Mysterious Soul';
    const physicalDescription = getContinuityPhysicalDescription();
    const nameClause = gameState.childName ? `${gameState.childName}, ` : '';
    const genderClause = gameState.childGender ? `${gameState.childGender} ` : '';
    const raceClause = gameState.childRace ? `${gameState.childRace} ` : '';
    const alignmentMood = gameState.moralAlignment === 'good'
        ? 'gentle confidence, hopeful eyes, warm natural light'
        : gameState.moralAlignment === 'bad'
            ? 'hard confidence, unsettling poise, dramatic shadowed light'
            : 'ambiguous confidence, introspective gaze, cinematic low light';
    const valuesSummary = getValuesSummary();
    const justification = gameState.justification ? `${gameState.justification} ` : '';

    return `semi-realistic portrait of ${nameClause}a 30 year old ${raceClause}${genderClause}adult, head and shoulders, ${physicalDescription}, destiny: ${adulthoodDestiny}, ${justification}${alignmentMood}, wardrobe and background should subtly communicate this life path, mature facial structure, photorealistic, detailed skin texture, cinematic portrait photography${valuesSummary ? `, influenced by values: ${valuesSummary}` : ''}`;
}

function calculateFinalPercentile(score, maxScore) {
    const percentage = Math.round((score / maxScore) * 100);
    const percentile = Math.min(99, Math.max(1, Math.round((percentage * 0.85) + 8)));

    return {
        percentage,
        percentile
    };
}

function getFinalShareText(score, percentile) {
    const childName = gameState.childName || 'My child';
    return `${childName} grew up to become ${gameState.destiny} in Minor Decisions. They scored ${score} points and were ${percentile}% more successful in life than the average child.`;
}

async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.focus();
    helper.select();

    try {
        const copied = document.execCommand('copy');
        document.body.removeChild(helper);
        return copied;
    } catch (error) {
        document.body.removeChild(helper);
        throw error;
    }
}

function ensureHtml2Canvas() {
    if (window.html2canvas) {
        return Promise.resolve(window.html2canvas);
    }

    if (html2CanvasPromise) {
        return html2CanvasPromise;
    }

    html2CanvasPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.async = true;
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('Screenshot tools failed to load.'));
        document.head.appendChild(script);
    });

    return html2CanvasPromise;
}

async function loadFinalPortrait() {
    if (!finalScreenImage || !finalScreenLoading) {
        return;
    }

    const requestId = activeFinalImageRequestId + 1;
    activeFinalImageRequestId = requestId;
    cancelPendingFinalImageRequest();
    finalScreenLoading.classList.remove('hidden');
    finalScreenImage.classList.remove('loaded');

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    if (controller) {
        activeFinalImageAbortController = controller;
    }

    try {
        let data = await requestGeneratedPortrait(buildFinalPortraitPrompt(), controller);

        if (data?.usePlaceholder) {
            const rescuePrompt = buildRescuePortraitPrompt({
                age: 30,
                destiny: gameState.destiny,
                moralAlignment: gameState.moralAlignment,
                physicalDescription: gameState.physicalDescription
            });
            data = await requestGeneratedPortrait(rescuePrompt, controller);
        }

        if (data?.imageData) {
            applyGeneratedImageToElement(finalScreenImage, finalScreenLoading, data.imageData, data.mimeType, requestId);
            showFinalScreenStatus('');
            return;
        }

        throw new Error('Final portrait data was missing.');
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        console.error('Error generating final portrait:', error);
        if (!isLatestFinalImageRequest(requestId)) {
            return;
        }

        const fallbackPortrait = childImage?.currentSrc || childImage?.src;
        if (fallbackPortrait) {
            setElementImageSource(finalScreenImage, finalScreenLoading, fallbackPortrait);
            showFinalScreenStatus('Adult portrait generation missed. Showing the latest portrait instead.', 'error');
            return;
        }

        finalScreenLoading.classList.add('hidden');
        showFinalScreenStatus('The Oracle could not paint the final portrait this time.', 'error');
    } finally {
        clearFinalImageAbortController(controller);
    }
}

async function handleFinalShare() {
    const score = gameState.score;
    const maxScore = PLAYABLE_AGES.length * 25;
    const { percentile } = calculateFinalPercentile(score, maxScore);
    const shareText = getFinalShareText(score, percentile);

    try {
        if (navigator.share) {
            await navigator.share({
                text: shareText,
                url: window.location.href
            });
            showFinalScreenStatus('Shared.', 'success');
            return;
        }

        await copyTextToClipboard(`${shareText} ${window.location.href}`);
        showFinalScreenStatus('Summary copied to clipboard.', 'success');
    } catch (error) {
        if (error?.name === 'AbortError') {
            return;
        }

        console.error('Error sharing final screen:', error);
        showFinalScreenStatus('Sharing failed on this device.', 'error');
    }
}

async function handleFinalSave() {
    if (!finalScreenOverlay) {
        return;
    }

    try {
        showFinalScreenStatus('Preparing screenshot...', 'muted');
        const html2canvas = await ensureHtml2Canvas();
        const canvas = await html2canvas(finalScreenOverlay, {
            backgroundColor: null,
            scale: Math.max(2, window.devicePixelRatio || 1),
            useCORS: true
        });

        const link = document.createElement('a');
        const safeName = (gameState.childName || 'minor-decisions')
            .replace(/[^a-z0-9]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
        link.href = canvas.toDataURL('image/png');
        link.download = `${safeName || 'minor-decisions'}-final-reading.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showFinalScreenStatus('Screenshot saved to your browser download location.', 'success');
    } catch (error) {
        console.error('Error saving final screen:', error);
        showFinalScreenStatus('Screenshot capture failed.', 'error');
    }
}

function showValuesOverlay() {
    renderCurrentValues();
    setGameMode('values');
    questionContainer.classList.remove('phase-hidden');
    questionContainer.removeAttribute('aria-hidden');
    setQuestionPhaseVisible(true);
    if (valuesOverlay) {
        valuesOverlay.classList.remove('hidden');
    }
    setValuesFeedback('');
    questionEyebrow.textContent = 'Instill A Value';
    questionText.innerHTML = `Write one value that you want to instill in your child.<span class="question-text-secondary">(or choose from one of the values below)</span>`;
    renderSampleOptions(['Money', 'Charisma', 'Pessimism']);
    configurePrimaryInput('values');
    playerInput.focus();
}

function hideValuesOverlay() {
    if (valuesOverlay) {
        valuesOverlay.classList.add('hidden');
    }
    renderSampleOptions([]);
    setValuesFeedback('');
}

function submitValue() {
    const value = sanitizeValue(playerInput.value);
    if (!value) {
        setValuesFeedback('Name one value before moving on.');
        playerInput.focus();
        return;
    }

    gameState.values.push(value);
    renderCurrentValues();
    hideValuesOverlay();
    playerInput.value = '';
    setPrimaryInputVisible(false);
    setQuestionPhaseVisible(false);
    questionText.textContent = 'The Oracle is deciding what the future holds...';
    setInputFeedback('');

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
12. Preserve high-salience evidence across time. If an earlier answer includes murder, cannibalism, torture, arson, kidnapping, organized crime, cult behavior, or other extreme criminal or taboo behavior, that signal must continue to shape later destinies even after several more rounds. Do not treat it as a throwaway joke that disappears just because later answers are milder.
13. Weight all prior answers, not just recent ones. Earlier answers can fade somewhat in influence if later evidence strongly redirects the child, but they are never erased. The child carries a cumulative history. Rare, extreme, or unusually revealing answers should decay much more slowly than ordinary answers.
14. If there is tension between a shocking earlier answer and softer later answers, do not simply forget the shocking answer. Reconcile the contradiction into a coherent destiny that still reflects the lingering darkness, obsession, deviance, or volatility introduced earlier.

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

Write 1–2 sentences explaining WHY this destiny emerged from the answers and values. Be specific — reference the actual answers, not vague generalities. If repeated values shaped the outcome, explicitly say so. If an older but high-salience answer is still influencing the child, explicitly mention that it lingered over time instead of being forgotten. The tone should feel like a fortune teller delivering prophecy with unsettling confidence.

## Rules for the Image Prompt

After determining the Destiny and Justification, generate an image prompt for image generation. This prompt must:

1. Describe a semi-realistic portrait/headshot of this person at the age specified in the input.
2. Translate the Destiny, Justification, and strongest instilled values into VISUAL storytelling — their expression, clothing, setting, lighting, and small details should all hint at who they are and what they've become.
3. Preserve physical continuity: use the provided core physical features as a base. Core features (eye color, skin tone, hair color, face shape, distinguishing marks) should carry through, adapted appropriately for the target age.
4. Include age-appropriate details. A 5-year-old "Future Dictator" might have an eerily composed expression and a too-neat outfit. A 35-year-old version would look very different.
5. Keep it as a headshot/portrait — head and shoulders, direct or 3/4 angle, with enough background to set a mood but not a full scene.
6. Follow the TARGET PORTRAIT AGE exactly. If the current physical description sounds younger, age the same person up to the target portrait age rather than keeping them as a baby or toddler.

## Response Format

You MUST respond with valid JSON and nothing else. No markdown, no commentary outside the JSON.

{
  "destiny": "string — 1 to 5 words, the Destiny",
  "moral_alignment": "good" | "bad" | "grey",
  "justification": "string — 1-2 sentences, the Oracle's reasoning",
  "image_prompt": "string — the full image generation prompt",
  "physical_description": "string — updated physical description of the child for continuity"
}`;

function buildOracleUserPrompt(currentQuestion, currentAnswer, targetPortraitAge, valuesSnapshot = gameState.values) {
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
TARGET PORTRAIT AGE: ${targetPortraitAge}
CHILD'S CORE PHYSICAL FEATURES FOR CONTINUITY: ${getContinuityPhysicalDescription()}
CHILD'S INSTILLED VALUES:
${getValuesSummary(valuesSnapshot)}

VALUE GUIDANCE:
These are the values the parent has chosen to instill in this child over time.
Treat them as explicit personality tags, worldview cues, and future-shaping pressures.
Values that appear multiple times are more deeply ingrained and should matter more than one-off values.
If a repeated value conflicts with a softer signal elsewhere, let the repeated value pull harder.
Factor these values into the child's personality, worldview, behavior, destiny, and the visual tone of the portrait.

MEMORY GUIDANCE:
Every previous answer remains part of the child's history and must still be considered in later years.
Ordinary earlier answers may soften somewhat as newer evidence accumulates, but they never disappear.
High-salience earlier answers — especially violence, murder, cannibalism, crime, cruelty, obsession, or other extreme behavior — should remain sticky and keep influencing the reading long after they first appear.

PORTRAIT AGE GUIDANCE:
The portrait must depict the child at age ${targetPortraitAge}, not age ${gameState.currentAge}.
If the continuity description sounds younger than that, age the same person up to ${targetPortraitAge} while preserving core features.

PREVIOUS QUESTIONS AND ANSWERS (in order):
${previousRounds}
NEW QUESTION JUST ASKED:
Q${gameState.answers.length + 1}: "${currentQuestion}"

PLAYER'S NEW ANSWER:
A${gameState.answers.length + 1}: "${currentAnswer}"

Based on ALL of the above — every answer, not just the latest — determine this child's evolving Destiny. Respond with the JSON object only.`;
}

async function consultOracle(currentQuestion, currentAnswer, targetPortraitAge, valuesSnapshot = gameState.values) {
    const userPrompt = buildOracleUserPrompt(currentQuestion, currentAnswer, targetPortraitAge, valuesSnapshot);

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
            image_prompt: `portrait of a ${targetPortraitAge} year old child`,
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
        preloadStartingPortraits();
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
    inputContainer.removeAttribute('aria-hidden');
    setPrimaryInputVisible(true);
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
        segment.classList.toggle('filled', index <= currentIndex);
        segment.classList.toggle('current', index === currentIndex);
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
        const currentQuestion = gameState.questionsData.years[gameState.currentAge].question;
        const targetPortraitAge = getNextPlayableAge(gameState.currentAge) ?? gameState.currentAge;
        const valuesSnapshot = [...gameState.values];

        const valuePromise = waitForValueEntry();
        const oraclePromise = consultOracle(
            currentQuestion,
            answer,
            targetPortraitAge,
            valuesSnapshot
        );

        // Store the answer locally right away so the next round includes it in history.
        gameState.answers.push({
            age: gameState.currentAge,
            question: currentQuestion,
            answer: answer
        });

        calculateAnswerScore(answer);
        const backgroundWorkPromise = oraclePromise.then(async (oracleResponse) => {
            const revealVoicePromise = requestVoiceAudio(buildFullRevealVoiceText(oracleResponse.destiny));
            const portraitWorkPromise = generateChildImage(oracleResponse.image_prompt, {
                showLoadingOverlay: false,
                preserveExistingImage: true,
                fallbackState: {
                    destiny: oracleResponse.destiny,
                    moralAlignment: oracleResponse.moral_alignment,
                    age: targetPortraitAge,
                    physicalDescription: oracleResponse.physical_description
                }
            });
            const revealVoiceResult = await revealVoicePromise;

            return {
                oracleResponse,
                revealVoiceResult,
                portraitWorkPromise
            };
        });

        await valuePromise;
        showDestinyRevealOverlay();
        const {
            oracleResponse,
            revealVoiceResult,
            portraitWorkPromise
        } = await backgroundWorkPromise;

        await runDestinyRevealSequence({
            oracleResponse,
            revealVoiceResult
        });

        const continuePromise = waitForDestinyRevealContinue();
        await portraitWorkPromise;
        showDestinyRevealContinue();
        await continuePromise;
        hideDestinyRevealOverlay();

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
async function generateChildImage(imagePrompt, options = {}) {
    const requestId = startImageRequest(options);
    const controller = createImageAbortController();
    const { fallbackState } = options;

    try {
        let data = await requestGeneratedPortrait(imagePrompt, controller);

        if (data?.usePlaceholder && fallbackState) {
            const rescuePrompt = buildRescuePortraitPrompt(fallbackState);
            console.warn('Primary portrait prompt fell back, retrying with rescue prompt.');
            data = await requestGeneratedPortrait(rescuePrompt, controller);
        }

        if (data?.usePlaceholder) {
            if (fallbackState) {
                console.warn('Portrait generation failed after retry, keeping previous portrait.');
                finalizeImageRequestWithoutSwap(requestId);
                return;
            }

            showPlaceholderImage(imagePrompt, requestId, fallbackState);
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
        if (fallbackState) {
            console.warn('Portrait generation errored, keeping previous portrait.', error);
            finalizeImageRequestWithoutSwap(requestId);
            return;
        }

        showPlaceholderImage(imagePrompt, requestId, fallbackState);
    } finally {
        clearImageAbortController(controller);
    }
}

// Show placeholder image
function showPlaceholderImage(prompt, requestId = activeImageRequestId, fallbackState = null) {
    if (!isLatestImageRequest(requestId)) {
        return;
    }

    const placeholderState = {
        destiny: fallbackState?.destiny || gameState.destiny,
        moralAlignment: fallbackState?.moralAlignment || gameState.moralAlignment,
        age: fallbackState?.age ?? gameState.currentAge
    };

    // Create a visually appealing placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Gradient background based on moral alignment
    const gradient = ctx.createLinearGradient(0, 0, 800, 800);
    if (placeholderState.moralAlignment === 'good') {
        gradient.addColorStop(0, '#d6b36a');
        gradient.addColorStop(1, '#7a405b');
    } else if (placeholderState.moralAlignment === 'bad') {
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
    ctx.fillText(`AGE ${placeholderState.age}`, 400, 320);

    // Draw destiny
    if (placeholderState.destiny && placeholderState.destiny !== 'UNKNOWN') {
        ctx.font = 'bold 32px Georgia';
        ctx.fillStyle = 'rgba(255, 245, 232, 0.92)';

        // Word wrap destiny if too long
        const words = placeholderState.destiny.split(' ');
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
    const maxScore = PLAYABLE_AGES.length * 25;
    const { percentile } = calculateFinalPercentile(gameState.score, maxScore);

    hideValuesOverlay();
    hideDestinyRevealOverlay();
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

    finalDestiny.textContent = gameState.destiny;
    scoreDisplay.textContent = `${gameState.score} Points`;
    if (successDisplay) {
        successDisplay.textContent = `They were ${percentile}% more successful in life than the average child.`;
    }
    showFinalScreenStatus('');

    if (finalScreenImage) {
        finalScreenImage.removeAttribute('src');
        finalScreenImage.classList.remove('loaded');
    }
    if (finalScreenLoading) {
        finalScreenLoading.classList.remove('hidden');
    }

    showFinalScreenOverlay();
    loadFinalPortrait();
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
        cancelTitleVoiceRetry();
        stopActiveVoiceAudio();
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
    if (gameContainer.classList.contains('mode-values')) {
        submitValue();
        return;
    }

    submitAnswer();
});
playerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();

        if (gameContainer.classList.contains('mode-values')) {
            submitValue();
            return;
        }

        submitAnswer();
    }
});
playerInput.addEventListener('input', () => {
    if (playerInput.value.trim()) {
        setInputFeedback('', 'muted');
    }
});
if (destinyRevealContinue) {
    destinyRevealContinue.addEventListener('click', () => {
        if (!destinyRevealResolver) {
            return;
        }

        const resolve = destinyRevealResolver;
        destinyRevealResolver = null;
        resolve();
    });
}
if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
}
if (shareBtn) {
    shareBtn.addEventListener('click', handleFinalShare);
}
if (saveBtn) {
    saveBtn.addEventListener('click', handleFinalSave);
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
