/**
 * QUANTUMAIM - MAIN APPLICATION CONTROLLER
 * State management, Event Listeners, HUD updates, Chart rendering, and Screen Routing
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // GAME STATE
    // ===================================================================
    const state = {
        currentScreen: 'main-menu',
        activeModeId: 'gridshot',
        isPlaying: false,
        isPaused: false,
        isCountingDown: false,
        score: 0,
        hits: 0,
        misses: 0,
        streak: 0,
        maxStreak: 0,
        timeRemaining: 60.0,
        totalDuration: 60.0,
        historyPoints: [], // For pace chart
        lastHitTime: 0,
        reactionTimes: []
    };

    let gameTimerId = null;
    let countdownIntervalId = null;

    // DOM Elements Cache
    const el = {
        // Screens
        mainMenu: document.getElementById('main-menu'),
        gameScreen: document.getElementById('game-screen'),
        resultsModal: document.getElementById('results-modal'),
        settingsModal: document.getElementById('settings-modal'),
        crosshairModal: document.getElementById('crosshair-modal'),
        statsModal: document.getElementById('stats-modal'),
        countdownOverlay: document.getElementById('countdown-overlay'),
        pauseOverlay: document.getElementById('pause-overlay'),

        // HUD Elements
        hudModeName: document.getElementById('hud-mode-name'),
        hudTimer: document.getElementById('hud-timer'),
        hudTimerFill: document.getElementById('hud-timer-fill'),
        hudScore: document.getElementById('hud-score'),
        hudAccuracy: document.getElementById('hud-accuracy'),
        hudHits: document.getElementById('hud-hits'),
        hudMisses: document.getElementById('hud-misses'),
        hudComboBadge: document.getElementById('hud-combo-badge'),
        hudComboText: document.getElementById('hud-combo-text'),
        hudStreakCount: document.getElementById('hud-streak-count'),
        hudReactionFeed: document.getElementById('hud-reaction-feed'),
        damageVignette: document.getElementById('damage-vignette'),
        hudFpsVal: document.getElementById('hud-fps-val'),
        hudFrametimeVal: document.getElementById('hud-frametime-val'),
        navFpsBadge: document.getElementById('nav-fps-badge'),

        // Countdown Elements
        countdownNumber: document.getElementById('countdown-number'),
        countdownModeTitle: document.getElementById('countdown-mode-title'),

        // Pause Elements
        pauseSensSlider: document.getElementById('pause-sens-slider'),
        pauseSensVal: document.getElementById('pause-sens-val'),

        // Header Quick Stats
        navRankBadge: document.getElementById('nav-rank-badge'),
        navBestAcc: document.getElementById('nav-best-acc'),
        footerSensPreview: document.getElementById('footer-sens-preview'),

        // Results Modal Elements
        resModeTag: document.getElementById('res-mode-tag'),
        resScore: document.getElementById('res-score'),
        resAccuracy: document.getElementById('res-accuracy'),
        resHits: document.getElementById('res-hits'),
        resMisses: document.getElementById('res-misses'),
        resReaction: document.getElementById('res-reaction'),
        resTps: document.getElementById('res-tps'),
        resStreak: document.getElementById('res-streak'),
        resTotalShots: document.getElementById('res-total-shots'),
        resRankName: document.getElementById('res-rank-name'),
        resRankTier: document.getElementById('res-rank-tier'),
        resRankIcon: document.getElementById('res-rank-icon'),
        resHighScoreBadge: document.getElementById('res-high-score-badge'),
        resultsChart: document.getElementById('results-chart'),

        // Settings Form Elements
        sensGameSelect: document.getElementById('sens-game-select'),
        inputGameSens: document.getElementById('input-game-sens'),
        inputMouseDpi: document.getElementById('input-mouse-dpi'),
        inputFov: document.getElementById('input-fov'),
        fovValDisplay: document.getElementById('fov-val-display'),
        checkInvertY: document.getElementById('check-invert-y'),
        calcEdpi: document.getElementById('calc-edpi'),
        calcCm360: document.getElementById('calc-cm360'),
        calcIn360: document.getElementById('calc-in360'),
        selectHitsound: document.getElementById('select-hitsound'),
        audioMasterVol: document.getElementById('audio-master-vol'),
        masterVolVal: document.getElementById('master-vol-val'),
        audioHitsoundVol: document.getElementById('audio-hitsound-vol'),
        hitVolVal: document.getElementById('hit-vol-val'),
        checkStreakPitch: document.getElementById('check-streak-pitch'),
        checkMissSound: document.getElementById('check-miss-sound'),
        targetGlowSlider: document.getElementById('target-glow-slider'),
        targetGlowVal: document.getElementById('target-glow-val'),
        checkParticles: document.getElementById('check-particles'),
        checkFloatingScore: document.getElementById('check-floating-score'),

        // Crosshair Form Elements
        chStyle: document.getElementById('ch-style'),
        chColor: document.getElementById('ch-color'),
        chColorHex: document.getElementById('ch-color-hex'),
        chOpacity: document.getElementById('ch-opacity'),
        chOpacityVal: document.getElementById('ch-opacity-val'),
        chSize: document.getElementById('ch-size'),
        chSizeVal: document.getElementById('ch-size-val'),
        chThickness: document.getElementById('ch-thickness'),
        chThicknessVal: document.getElementById('ch-thickness-val'),
        chGap: document.getElementById('ch-gap'),
        chGapVal: document.getElementById('ch-gap-val'),
        chOutline: document.getElementById('ch-outline'),

        // Dashboard Stats Elements
        careerTotalDrills: document.getElementById('career-total-drills'),
        careerTotalHits: document.getElementById('career-total-hits'),
        careerAvgAccuracy: document.getElementById('career-avg-accuracy'),
        careerMaxStreak: document.getElementById('career-max-streak'),
        statsTableBody: document.getElementById('stats-table-body'),
        statsHistoryList: document.getElementById('stats-history-list')
    };

    // ===================================================================
    // INITIALIZATION
    // ===================================================================
    function initApp() {
        // Initialize Lucide Icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Initialize 3D Engine
        Engine3D.init();

        // Hook Real-Time FPS and Frametime Monitor
        Engine3D.setOnFpsUpdate((fps, ms) => {
            if (el.hudFpsVal) el.hudFpsVal.textContent = fps;
            if (el.hudFrametimeVal) el.hudFrametimeVal.textContent = ms;
            if (el.navFpsBadge) el.navFpsBadge.textContent = `${fps} FPS`;
        });

        // Load settings and update UI
        loadSettingsToUI();

        // Update Nav Stats
        updateHeaderAndMenuStats();

        // Render Crosshairs
        const settings = Storage.getSettings();
        CrosshairRenderer.updateAll(settings.crosshair);

        // Bind All UI Event Listeners
        setupEventBindings();
    }

    // Update Header & Menu Stat Cards
    function updateHeaderAndMenuStats() {
        const scores = Storage.getScores();
        const rank = Storage.getCareerRank();

        if (el.navRankBadge) el.navRankBadge.textContent = rank.name;

        // Update drill best score labels on mode cards
        const gridBest = scores.gridshot?.score || 0;
        const spiderBest = scores.spidershot?.score || 0;
        const trackBest = scores.tracking?.accuracy || 0;
        const microBest = scores.microflex?.score || 0;
        const reflexBest = scores.reflex?.bestReaction || 0;

        const bestGridEl = document.getElementById('best-gridshot');
        const bestSpiderEl = document.getElementById('best-spidershot');
        const bestTrackEl = document.getElementById('best-tracking');
        const bestMicroEl = document.getElementById('best-microflex');
        const bestReflexEl = document.getElementById('best-reflex');

        if (bestGridEl) bestGridEl.textContent = gridBest.toLocaleString();
        if (bestSpiderEl) bestSpiderEl.textContent = spiderBest.toLocaleString();
        if (bestTrackEl) bestTrackEl.textContent = `${trackBest}%`;
        if (bestMicroEl) bestMicroEl.textContent = microBest.toLocaleString();
        if (bestReflexEl) bestReflexEl.textContent = reflexBest > 0 ? `${reflexBest} ms` : '0 ms';

        // Best Accuracy in Nav
        const accArray = Object.values(scores).map(s => s.accuracy).filter(a => a > 0);
        const bestAcc = accArray.length > 0 ? Math.max(...accArray) : 0;
        if (el.navBestAcc) el.navBestAcc.textContent = `${bestAcc.toFixed(1)}%`;

        // Footer Sens Preview
        const settings = Storage.getSettings();
        if (el.footerSensPreview) {
            const gameName = settings.game.charAt(0).toUpperCase() + settings.game.slice(1);
            el.footerSensPreview.textContent = `${gameName} (${settings.sens} @ ${settings.dpi} DPI)`;
        }
    }

    // ===================================================================
    // GAMEPLAY LIFECYCLE
    // ===================================================================

    // Start Drill (From Menu or Replay)
    function startDrill(modeId) {
        state.activeModeId = modeId;
        const mode = GameModes.getMode(modeId);

        // Switch to Game Screen
        showScreen('game-screen');
        hideModals();

        // Reset HUD values
        state.score = 0;
        state.hits = 0;
        state.misses = 0;
        state.streak = 0;
        state.maxStreak = 0;
        state.historyPoints = [];
        state.reactionTimes = [];
        state.lastHitTime = 0;

        if (mode.duration > 0) {
            state.timeRemaining = mode.duration;
            state.totalDuration = mode.duration;
        } else {
            state.timeRemaining = 0;
            state.totalDuration = 0;
        }

        updateHUD();
        Engine3D.resetCamera();
        Engine3D.clearAllTargets();

        // Show Countdown (3, 2, 1, START)
        startCountdown(mode);
    }

    // Countdown Sequence
    function startCountdown(mode) {
        state.isCountingDown = true;
        state.isPlaying = false;
        state.isPaused = false;

        el.countdownOverlay.classList.remove('hidden');
        el.countdownModeTitle.textContent = mode.name;

        let count = 3;
        el.countdownNumber.textContent = count;
        el.countdownNumber.classList.remove('pop');
        void el.countdownNumber.offsetWidth;
        el.countdownNumber.classList.add('pop');
        SoundEngine.playCountdown(false);

        // Click or tap to instantly start and lock mouse
        const onOverlayClick = () => {
            if (countdownIntervalId) clearInterval(countdownIntervalId);
            el.countdownOverlay.classList.add('hidden');
            el.countdownOverlay.removeEventListener('click', onOverlayClick);
            state.isCountingDown = false;
            Engine3D.requestLock();
            beginGameplay(mode);
        };
        el.countdownOverlay.addEventListener('click', onOverlayClick);

        if (countdownIntervalId) clearInterval(countdownIntervalId);

        countdownIntervalId = setInterval(() => {
            count--;
            if (count > 0) {
                el.countdownNumber.textContent = count;
                el.countdownNumber.classList.remove('pop');
                void el.countdownNumber.offsetWidth;
                el.countdownNumber.classList.add('pop');
                SoundEngine.playCountdown(false);
            } else if (count === 0) {
                el.countdownNumber.textContent = 'GO!';
                el.countdownNumber.classList.remove('pop');
                void el.countdownNumber.offsetWidth;
                el.countdownNumber.classList.add('pop');
                SoundEngine.playCountdown(true);
                Engine3D.requestLock();
            } else {
                clearInterval(countdownIntervalId);
                el.countdownOverlay.classList.add('hidden');
                el.countdownOverlay.removeEventListener('click', onOverlayClick);
                state.isCountingDown = false;
                beginGameplay(mode);
            }
        }, 750);
    }

    // Begin Actual Game Loop
    function beginGameplay(mode) {
        state.isPlaying = true;
        state.isPaused = false;
        state.lastHitTime = performance.now();

        // Initialize mode
        mode.init(state);

        // Start Timer loop (updates 30 times per second for smooth timer bar)
        let lastTimestamp = performance.now();

        if (gameTimerId) clearInterval(gameTimerId);

        gameTimerId = setInterval(() => {
            if (!state.isPlaying || state.isPaused) return;

            const now = performance.now();
            const delta = (now - lastTimestamp) / 1000;
            lastTimestamp = now;

            // Update Mode Specific logic (e.g. Tracking continuous accuracy)
            mode.onUpdate(delta, state);

            if (mode.duration > 0) {
                state.timeRemaining -= delta;
                if (state.timeRemaining <= 0) {
                    state.timeRemaining = 0;
                    finishDrill();
                }
            }

            // Record history point every 1.5s for result graph
            if (state.historyPoints.length === 0 || now - state.historyPoints[state.historyPoints.length - 1].time > 1500) {
                state.historyPoints.push({
                    time: now,
                    score: state.score,
                    accuracy: calculateAccuracy()
                });
            }

            updateHUD();
        }, 33);
    }

    // Handle Shooting (Click or Spacebar)
    function handleShoot() {
        if (!state.isPlaying || state.isPaused || state.isCountingDown) return;

        const now = performance.now();
        const mode = GameModes.getMode(state.activeModeId);

        // Check 3D Raycast Hit
        const hitInfo = Engine3D.shoot();

        if (hitInfo) {
            // HIT!
            state.hits++;
            state.streak++;
            if (state.streak > state.maxStreak) state.maxStreak = state.streak;

            // Record reaction time between hits
            if (state.lastHitTime > 0) {
                const reactionMs = Math.round(now - state.lastHitTime);
                if (reactionMs > 80 && reactionMs < 2000) {
                    state.reactionTimes.push(reactionMs);
                }
            }
            state.lastHitTime = now;

            // Calculate points
            const pointsAwarded = mode.onHit(hitInfo, state);
            state.score += pointsAwarded;

            // Play Hitsound with dynamic streak pitch
            SoundEngine.playHit(state.streak);

            // Screen Hit Flash
            triggerVignette('hit');

            // Floating Score Popup
            showFloatingScore(pointsAwarded, hitInfo.point, state.streak >= 10);
        } else {
            // MISS!
            state.misses++;
            state.streak = 0;

            mode.onMiss(state);
            SoundEngine.playMiss();
            triggerVignette('miss');
        }

        updateHUD();
    }

    // Trigger Screen Vignette Flash
    function triggerVignette(type) {
        if (!el.damageVignette) return;
        el.damageVignette.className = 'damage-vignette';
        void el.damageVignette.offsetWidth; // Trigger DOM reflow
        el.damageVignette.classList.add(type === 'hit' ? 'hit-flash' : 'miss-flash');

        setTimeout(() => {
            el.damageVignette.className = 'damage-vignette';
        }, 120);
    }

    // Floating Score 3D Popup
    function showFloatingScore(points, pos3D, isHighStreak = false) {
        const settings = Storage.getSettings();
        if (!settings.floatingScore) return;

        const screenPos = Engine3D.toScreenPosition(pos3D);
        const popup = document.createElement('div');
        popup.className = `floating-score ${isHighStreak ? 'streak' : ''}`;
        popup.textContent = `+${points}`;
        popup.style.left = `${screenPos.x}px`;
        popup.style.top = `${screenPos.y}px`;

        el.gameScreen.appendChild(popup);

        setTimeout(() => {
            if (popup.parentNode) popup.parentNode.removeChild(popup);
        }, 700);
    }

    // Reaction Time Banner feed
    window.showReactionFeed = (text) => {
        if (!el.hudReactionFeed) return;
        const pill = document.createElement('div');
        pill.className = 'reaction-pill';
        pill.innerHTML = `Reaction: <span>${text}</span>`;
        el.hudReactionFeed.appendChild(pill);

        setTimeout(() => {
            if (pill.parentNode) pill.parentNode.removeChild(pill);
        }, 1200);
    };

    // Callback when Reflex finishes 10 rounds
    window.onReflexDrillComplete = () => {
        finishDrill();
    };

    // Pointer Lock Exit Handler (Auto-pause)
    window.onPointerLockExit = () => {
        if (state.isPlaying && !state.isPaused) {
            pauseGame();
        }
    };

    // Pause Game
    function pauseGame() {
        if (!state.isPlaying || state.isPaused) return;
        state.isPaused = true;
        el.pauseOverlay.classList.remove('hidden');

        const settings = Storage.getSettings();
        if (el.pauseSensSlider) {
            el.pauseSensSlider.value = settings.sens;
            el.pauseSensVal.textContent = settings.sens;
        }
    }

    // Resume Game
    function resumeGame() {
        if (!state.isPaused) return;
        state.isPaused = false;
        el.pauseOverlay.classList.add('hidden');
        Engine3D.requestLock();
    }

    // Restart Drill
    function restartDrill() {
        if (gameTimerId) clearInterval(gameTimerId);
        if (countdownIntervalId) clearInterval(countdownIntervalId);

        const mode = GameModes.getMode(state.activeModeId);
        mode.cleanup();
        el.pauseOverlay.classList.add('hidden');
        el.resultsModal.classList.add('hidden');

        startDrill(state.activeModeId);
    }

    // Finish Drill & Show Results
    function finishDrill() {
        state.isPlaying = false;
        state.isPaused = false;
        if (gameTimerId) clearInterval(gameTimerId);

        const mode = GameModes.getMode(state.activeModeId);
        mode.cleanup();
        Engine3D.exitLock();

        // Calculate Final Metrics
        const totalShots = state.hits + state.misses;
        const accuracy = calculateAccuracy();
        const durationPlayed = mode.duration > 0 ? (mode.duration - state.timeRemaining) : 1;
        const tps = Number((state.hits / Math.max(1, durationPlayed)).toFixed(2));

        let avgReaction = 0;
        if (state.activeModeId === 'reflex') {
            avgReaction = GameModes.getReflexAvg();
        } else if (state.reactionTimes.length > 0) {
            const sum = state.reactionTimes.reduce((a, b) => a + b, 0);
            avgReaction = Math.round(sum / state.reactionTimes.length);
        }

        const finalResult = {
            score: state.score,
            accuracy: accuracy,
            hits: state.hits,
            misses: state.misses,
            avgReaction: avgReaction,
            tps: tps,
            maxStreak: state.maxStreak,
            totalShots: totalShots
        };

        // Save & Check High Score
        const isNewHigh = Storage.recordScore(state.activeModeId, finalResult);

        // Populate Results Modal
        populateResultsModal(finalResult, isNewHigh);

        // Update Header & Menu Stats
        updateHeaderAndMenuStats();

        // Show Results Modal
        el.resultsModal.classList.remove('hidden');
    }

    // Helper: Accuracy calculation
    function calculateAccuracy() {
        if (state.activeModeId === 'tracking') {
            return state.accuracy || 0;
        }
        const total = state.hits + state.misses;
        if (total === 0) return 100;
        return Number(((state.hits / total) * 100).toFixed(1));
    }

    // Update HUD display
    function updateHUD() {
        const mode = GameModes.getMode(state.activeModeId);
        if (el.hudModeName) el.hudModeName.textContent = mode.name;

        // Timer
        if (el.hudTimer) {
            if (mode.duration > 0) {
                el.hudTimer.textContent = state.timeRemaining.toFixed(1);
                const pct = (state.timeRemaining / state.totalDuration) * 100;
                if (el.hudTimerFill) el.hudTimerFill.style.width = `${pct}%`;
            } else {
                el.hudTimer.textContent = `Round ${state.currentRound || 1}/${state.maxRounds || 10}`;
                if (el.hudTimerFill) el.hudTimerFill.style.width = '100%';
            }
        }

        // Score
        if (el.hudScore) el.hudScore.textContent = state.score.toLocaleString();

        // Combo Multiplier Badge
        if (el.hudStreakCount) el.hudStreakCount.textContent = state.streak;
        if (el.hudComboText) {
            const mult = (1 + state.streak * 0.05).toFixed(1);
            el.hudComboText.textContent = `${mult}x`;
        }
        if (el.hudComboBadge) {
            if (state.streak >= 8) {
                el.hudComboBadge.classList.add('active-streak');
            } else {
                el.hudComboBadge.classList.remove('active-streak');
            }
        }

        // Accuracy & Hits
        if (el.hudAccuracy) el.hudAccuracy.textContent = `${calculateAccuracy()}%`;
        if (el.hudHits) el.hudHits.textContent = state.hits;
        if (el.hudMisses) el.hudMisses.textContent = state.misses;
    }

    // Populate Results Modal
    function populateResultsModal(result, isNewHigh) {
        const mode = GameModes.getMode(state.activeModeId);

        if (el.resModeTag) el.resModeTag.textContent = `${mode.name} COMPLETED`;
        if (el.resScore) el.resScore.textContent = result.score.toLocaleString();
        if (el.resAccuracy) el.resAccuracy.textContent = `${result.accuracy}%`;
        if (el.resHits) el.resHits.textContent = result.hits;
        if (el.resMisses) el.resMisses.textContent = result.misses;
        if (el.resReaction) el.resReaction.innerHTML = `${result.avgReaction} <span class="unit">ms</span>`;
        if (el.resTps) el.resTps.textContent = result.tps;
        if (el.resStreak) el.resStreak.textContent = result.maxStreak;
        if (el.resTotalShots) el.resTotalShots.textContent = result.totalShots;

        // High Score Badge
        if (el.resHighScoreBadge) {
            el.resHighScoreBadge.style.display = isNewHigh ? 'block' : 'none';
        }

        // Rank Badge
        const rank = calculateRankFromScore(state.activeModeId, result.score, result.accuracy);
        if (el.resRankName) el.resRankName.textContent = rank.name;
        if (el.resRankTier) el.resRankTier.textContent = rank.tier;

        // Draw Canvas Graph
        drawResultsChart(state.historyPoints);
    }

    // Performance Rank Determinator
    function calculateRankFromScore(mode, score, acc) {
        if (score >= 85000) return { name: 'APEX GRANDMASTER', tier: 'TOP 1%' };
        if (score >= 70000) return { name: 'DIAMOND', tier: 'TIER I' };
        if (score >= 55000) return { name: 'PLATINUM', tier: 'TIER II' };
        if (score >= 40000) return { name: 'GOLD', tier: 'TIER III' };
        if (score >= 25000) return { name: 'SILVER', tier: 'TIER II' };
        return { name: 'BRONZE', tier: 'TIER I' };
    }

    // Draw Smooth Canvas Consistency Chart
    function drawResultsChart(points) {
        const canvas = el.resultsChart;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (!points || points.length < 2) {
            // Draw baseline placeholder
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(20, height / 2);
            ctx.lineTo(width - 20, height / 2);
            ctx.stroke();
            return;
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let y = 20; y < height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const maxScore = Math.max(...points.map(p => p.score), 1000);
        const padding = 20;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;

        // Draw Score Gradient Fill & Line
        ctx.beginPath();
        points.forEach((p, i) => {
            const x = padding + (i / (points.length - 1)) * chartW;
            const y = height - padding - (p.score / maxScore) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Fill area under curve
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(0, 243, 255, 0.35)');
        grad.addColorStop(1, 'rgba(0, 243, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 0;
        ctx.fill();
    }

    // ===================================================================
    // UI NAVIGATION & MODALS
    // ===================================================================

    function showScreen(screenId) {
        state.currentScreen = screenId;
        el.mainMenu.classList.remove('active');
        el.gameScreen.classList.remove('active');

        if (screenId === 'main-menu') {
            el.mainMenu.classList.add('active');
            document.body.classList.remove('game-active');
            Engine3D.exitLock();
        } else if (screenId === 'game-screen') {
            el.gameScreen.classList.add('active');
            // Pauses CSS blur animations to free GPU compositing bandwidth
            document.body.classList.add('game-active');
        }
    }

    function hideModals() {
        el.resultsModal.classList.add('hidden');
        el.settingsModal.classList.add('hidden');
        el.crosshairModal.classList.add('hidden');
        el.statsModal.classList.add('hidden');
        el.pauseOverlay.classList.add('hidden');
    }

    // Load Settings into form inputs
    function loadSettingsToUI() {
        const settings = Storage.getSettings();

        // Sens Tab
        if (el.sensGameSelect) el.sensGameSelect.value = settings.game;
        if (el.inputGameSens) el.inputGameSens.value = settings.sens;
        if (el.inputMouseDpi) el.inputMouseDpi.value = settings.dpi;
        if (el.inputFov) {
            el.inputFov.value = settings.fov;
            if (el.fovValDisplay) el.fovValDisplay.textContent = `${settings.fov}°`;
        }
        if (el.checkInvertY) el.checkInvertY.checked = settings.invertY;
        updateSensCalculations();

        // Audio Tab
        if (el.selectHitsound) el.selectHitsound.value = settings.hitsound;
        if (el.audioMasterVol) {
            el.audioMasterVol.value = settings.masterVolume;
            if (el.masterVolVal) el.masterVolVal.textContent = `${settings.masterVolume}%`;
        }
        if (el.audioHitsoundVol) {
            el.audioHitsoundVol.value = settings.hitsoundVolume;
            if (el.hitVolVal) el.hitVolVal.textContent = `${settings.hitsoundVolume}%`;
        }
        if (el.checkStreakPitch) el.checkStreakPitch.checked = settings.streakPitch;
        if (el.checkMissSound) el.checkMissSound.checked = settings.missSound;

        // Video Tab
        if (el.targetGlowSlider) {
            el.targetGlowSlider.value = settings.targetGlow;
            if (el.targetGlowVal) el.targetGlowVal.textContent = `${settings.targetGlow}x`;
        }
        if (el.checkParticles) el.checkParticles.checked = settings.particles;
        if (el.checkFloatingScore) el.checkFloatingScore.checked = settings.floatingScore;

        // Target Color Presets
        const colorBtns = document.querySelectorAll('#target-color-presets .color-pill-btn');
        colorBtns.forEach(btn => {
            if (btn.dataset.color.toLowerCase() === settings.targetColor.toLowerCase()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Crosshair Studio Form
        const ch = settings.crosshair;
        if (el.chStyle) el.chStyle.value = ch.style;
        if (el.chColor) {
            el.chColor.value = ch.color;
            if (el.chColorHex) el.chColorHex.textContent = ch.color;
        }
        if (el.chOpacity) {
            el.chOpacity.value = ch.opacity;
            if (el.chOpacityVal) el.chOpacityVal.textContent = `${ch.opacity}%`;
        }
        if (el.chSize) {
            el.chSize.value = ch.size;
            if (el.chSizeVal) el.chSizeVal.textContent = `${ch.size}px`;
        }
        if (el.chThickness) {
            el.chThickness.value = ch.thickness;
            if (el.chThicknessVal) el.chThicknessVal.textContent = `${ch.thickness}px`;
        }
        if (el.chGap) {
            el.chGap.value = ch.gap;
            if (el.chGapVal) el.chGapVal.textContent = `${ch.gap}px`;
        }
        if (el.chOutline) el.chOutline.checked = ch.outline;
    }

    // Update Sensitivity Conversion Banner (eDPI, cm/360, in/360)
    function updateSensCalculations() {
        const game = el.sensGameSelect ? el.sensGameSelect.value : 'valorant';
        const sens = el.inputGameSens ? parseFloat(el.inputGameSens.value) || 0.35 : 0.35;
        const dpi = el.inputMouseDpi ? parseInt(el.inputMouseDpi.value, 10) || 800 : 800;

        const metrics = Sensitivity.calculateMetrics(game, sens, dpi);
        if (el.calcEdpi) el.calcEdpi.textContent = metrics.edpi;
        if (el.calcCm360) el.calcCm360.textContent = `${metrics.cm360} cm`;
        if (el.calcIn360) el.calcIn360.textContent = `${metrics.in360} in`;
    }

    // Save Settings from UI Form
    function saveSettingsFromUI() {
        const current = Storage.getSettings();

        current.game = el.sensGameSelect.value;
        current.sens = parseFloat(el.inputGameSens.value) || 0.35;
        current.dpi = parseInt(el.inputMouseDpi.value, 10) || 800;
        current.fov = parseInt(el.inputFov.value, 10) || 103;
        current.invertY = el.checkInvertY.checked;

        current.hitsound = el.selectHitsound.value;
        current.masterVolume = parseInt(el.audioMasterVol.value, 10);
        current.hitsoundVolume = parseInt(el.audioHitsoundVol.value, 10);
        current.streakPitch = el.checkStreakPitch.checked;
        current.missSound = el.checkMissSound.checked;

        current.targetGlow = parseFloat(el.targetGlowSlider.value);
        current.particles = el.checkParticles.checked;
        current.floatingScore = el.checkFloatingScore.checked;

        const activeColorBtn = document.querySelector('#target-color-presets .color-pill-btn.active');
        if (activeColorBtn) {
            current.targetColor = activeColorBtn.dataset.color;
        }

        Storage.saveSettings(current);
        SoundEngine.updateVolumes();
        Engine3D.updateCameraFOV();
        Engine3D.updateSensConfig();
        Engine3D.updateTargetMaterials();
        updateHeaderAndMenuStats();

        el.settingsModal.classList.add('hidden');
    }

    // Save Crosshair from UI
    function saveCrosshairFromUI() {
        const current = Storage.getSettings();
        current.crosshair = {
            style: el.chStyle.value,
            color: el.chColor.value,
            opacity: parseInt(el.chOpacity.value, 10),
            size: parseInt(el.chSize.value, 10),
            thickness: parseInt(el.chThickness.value, 10),
            gap: parseInt(el.chGap.value, 10),
            outline: el.chOutline.checked
        };

        Storage.saveSettings(current);
        CrosshairRenderer.updateAll(current.crosshair);
        el.crosshairModal.classList.add('hidden');
    }

    // Render Career Stats Dashboard
    function renderStatsDashboard() {
        const scores = Storage.getScores();
        const history = Storage.getMatchHistory();

        // 1. Overview Totals
        let totalHits = 0;
        let maxStreak = 0;
        let totalAccSum = 0;
        let accCount = 0;

        Object.values(scores).forEach(s => {
            totalHits += s.hits || 0;
            if (s.accuracy > 0) {
                totalAccSum += s.accuracy;
                accCount++;
            }
        });

        history.forEach(h => {
            if (h.maxStreak > maxStreak) maxStreak = h.maxStreak;
        });

        if (el.careerTotalDrills) el.careerTotalDrills.textContent = history.length;
        if (el.careerTotalHits) el.careerTotalHits.textContent = totalHits.toLocaleString();
        if (el.careerAvgAccuracy) el.careerAvgAccuracy.textContent = accCount > 0 ? `${(totalAccSum / accCount).toFixed(1)}%` : '0%';
        if (el.careerMaxStreak) el.careerMaxStreak.textContent = maxStreak;

        // 2. Personal Records Table
        if (el.statsTableBody) {
            el.statsTableBody.innerHTML = '';
            Object.keys(GameModes.MODES).forEach(key => {
                const modeDef = GameModes.MODES[key];
                const record = scores[key] || { score: 0, accuracy: 0, tps: 0 };
                const rank = calculateRankFromScore(key, record.score, record.accuracy);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${modeDef.name}</strong></td>
                    <td class="highlight">${record.score.toLocaleString()}</td>
                    <td>${record.accuracy}%</td>
                    <td>${key === 'reflex' ? (record.bestReaction ? `${record.bestReaction} ms` : '-') : `${record.tps || 0} /s`}</td>
                    <td><span class="mode-badge">${rank.name}</span></td>
                `;
                el.statsTableBody.appendChild(tr);
            });
        }

        // 3. History List
        if (el.statsHistoryList) {
            el.statsHistoryList.innerHTML = '';
            if (history.length === 0) {
                el.statsHistoryList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 1rem;">No match records yet. Play your first drill!</div>';
            } else {
                history.forEach(item => {
                    const mode = GameModes.getMode(item.mode);
                    const div = document.createElement('div');
                    div.className = 'history-item';
                    div.innerHTML = `
                        <div>
                            <span class="history-mode">${mode.name}</span>
                            <span class="history-date"> &bull; ${item.date}</span>
                        </div>
                        <div>
                            <span class="history-score">${item.score.toLocaleString()} PTS</span>
                            <span style="color: var(--lime); font-weight: 600; margin-left: 0.8rem;">${item.accuracy}%</span>
                        </div>
                    `;
                    el.statsHistoryList.appendChild(div);
                });
            }
        }
    }

    // ===================================================================
    // EVENT BINDINGS
    // ===================================================================

    function setupEventBindings() {
        // --- Play Mode Card Buttons ---
        document.querySelectorAll('.btn-play-mode').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modeId = btn.dataset.mode;
                SoundEngine.playUiClick();
                startDrill(modeId);
            });
        });

        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const modeId = card.dataset.mode;
                SoundEngine.playUiClick();
                startDrill(modeId);
            });
        });

        // Quick Warmup Button
        const btnWarmup = document.getElementById('btn-quick-warmup');
        if (btnWarmup) {
            btnWarmup.addEventListener('click', () => {
                SoundEngine.playUiClick();
                startDrill('gridshot');
            });
        }

        // --- Mouse Shoot & Lock on Viewport ---
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left click
                    if (!Engine3D.isPointerLocked) {
                        Engine3D.requestLock();
                    } else {
                        handleShoot();
                    }
                }
            });
        }

        // --- Keyboard Controls ---
        window.addEventListener('keydown', (e) => {
            // Spacebar shoot / replay
            if (e.code === 'Space') {
                if (!el.resultsModal.classList.contains('hidden')) {
                    e.preventDefault();
                    SoundEngine.playUiClick();
                    restartDrill();
                } else if (state.isPlaying && !state.isPaused && Engine3D.isPointerLocked) {
                    e.preventDefault();
                    handleShoot();
                }
            }

            // 'R' Quick Restart
            if (e.code === 'KeyR' && state.isPlaying) {
                e.preventDefault();
                restartDrill();
            }

            // 'ESC' Pause
            if (e.code === 'Escape') {
                if (state.isPlaying) {
                    if (state.isPaused) resumeGame();
                    else pauseGame();
                }
            }
        });

        // --- Pause Menu Actions ---
        const btnResume = document.getElementById('btn-resume-game');
        const btnRestart = document.getElementById('btn-restart-game');
        const btnQuit = document.getElementById('btn-quit-to-menu');

        if (btnResume) btnResume.addEventListener('click', resumeGame);
        if (btnRestart) btnRestart.addEventListener('click', restartDrill);
        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                state.isPlaying = false;
                state.isPaused = false;
                if (gameTimerId) clearInterval(gameTimerId);
                const mode = GameModes.getMode(state.activeModeId);
                mode.cleanup();
                showScreen('main-menu');
                hideModals();
            });
        }

        if (el.pauseSensSlider) {
            el.pauseSensSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                el.pauseSensVal.textContent = val;
                const settings = Storage.getSettings();
                settings.sens = val;
                Storage.saveSettings(settings);
                Engine3D.updateSensConfig();
                if (el.inputGameSens) el.inputGameSens.value = val;
                updateSensCalculations();
            });
        }

        // --- Results Modal Actions ---
        const btnResultsRetry = document.getElementById('btn-results-retry');
        const btnResultsMenu = document.getElementById('btn-results-menu');
        const btnResultsShare = document.getElementById('btn-results-share');

        if (btnResultsRetry) {
            btnResultsRetry.addEventListener('click', () => {
                SoundEngine.playUiClick();
                restartDrill();
            });
        }
        if (btnResultsMenu) {
            btnResultsMenu.addEventListener('click', () => {
                SoundEngine.playUiClick();
                showScreen('main-menu');
                hideModals();
            });
        }
        if (btnResultsShare) {
            btnResultsShare.addEventListener('click', () => {
                const text = `🎯 QuantumAim - ${GameModes.getMode(state.activeModeId).name}: Score ${state.score.toLocaleString()} | Acc ${calculateAccuracy()}%!`;
                navigator.clipboard.writeText(text).then(() => {
                    btnResultsShare.textContent = 'COPIED TO CLIPBOARD!';
                    setTimeout(() => {
                        btnResultsShare.innerHTML = '<i data-lucide="share-2"></i> COPY STATS';
                        lucide.createIcons();
                    }, 2000);
                });
            });
        }

        // --- Header Modal Open Buttons ---
        const btnOpenSettings = document.getElementById('btn-open-settings');
        const btnOpenCrosshair = document.getElementById('btn-open-crosshair');
        const btnOpenStats = document.getElementById('btn-open-stats');

        if (btnOpenSettings) {
            btnOpenSettings.addEventListener('click', () => {
                SoundEngine.playUiClick();
                loadSettingsToUI();
                el.settingsModal.classList.remove('hidden');
            });
        }
        if (btnOpenCrosshair) {
            btnOpenCrosshair.addEventListener('click', () => {
                SoundEngine.playUiClick();
                loadSettingsToUI();
                CrosshairRenderer.updateAll(Storage.getSettings().crosshair);
                el.crosshairModal.classList.remove('hidden');
            });
        }
        if (btnOpenStats) {
            btnOpenStats.addEventListener('click', () => {
                SoundEngine.playUiClick();
                renderStatsDashboard();
                el.statsModal.classList.remove('hidden');
            });
        }

        // Modal Close Buttons
        const btnCloseSettings = document.getElementById('btn-close-settings');
        const btnCloseCrosshair = document.getElementById('btn-close-crosshair');
        const btnCloseStats = document.getElementById('btn-close-stats');
        const btnDoneStats = document.getElementById('btn-done-stats');

        if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => el.settingsModal.classList.add('hidden'));
        if (btnCloseCrosshair) btnCloseCrosshair.addEventListener('click', () => el.crosshairModal.classList.add('hidden'));
        if (btnCloseStats) btnCloseStats.addEventListener('click', () => el.statsModal.classList.add('hidden'));
        if (btnDoneStats) btnDoneStats.addEventListener('click', () => el.statsModal.classList.add('hidden'));

        // Settings Tabs
        document.querySelectorAll('.settings-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.settings-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const target = document.getElementById(tab.dataset.tab);
                if (target) target.classList.add('active');
            });
        });

        // Settings Sens calculation listeners
        if (el.sensGameSelect) el.sensGameSelect.addEventListener('change', updateSensCalculations);
        if (el.inputGameSens) el.inputGameSens.addEventListener('input', updateSensCalculations);
        if (el.inputMouseDpi) el.inputMouseDpi.addEventListener('input', updateSensCalculations);

        // FOV Slider
        if (el.inputFov) {
            el.inputFov.addEventListener('input', (e) => {
                el.fovValDisplay.textContent = `${e.target.value}°`;
            });
        }

        // Audio Sliders & Test Button
        if (el.audioMasterVol) {
            el.audioMasterVol.addEventListener('input', (e) => {
                el.masterVolVal.textContent = `${e.target.value}%`;
            });
        }
        if (el.audioHitsoundVol) {
            el.audioHitsoundVol.addEventListener('input', (e) => {
                el.hitVolVal.textContent = `${e.target.value}%`;
            });
        }
        const btnTestHitsound = document.getElementById('btn-test-hitsound');
        if (btnTestHitsound) {
            btnTestHitsound.addEventListener('click', () => {
                const settings = Storage.getSettings();
                settings.hitsound = el.selectHitsound.value;
                Storage.saveSettings(settings);
                SoundEngine.playHit(5);
            });
        }

        // Target Glow Slider
        if (el.targetGlowSlider) {
            el.targetGlowSlider.addEventListener('input', (e) => {
                el.targetGlowVal.textContent = `${e.target.value}x`;
            });
        }

        // Target Color Presets
        document.querySelectorAll('#target-color-presets .color-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#target-color-presets .color-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Save Settings & Reset Buttons
        const btnSaveSettings = document.getElementById('btn-save-settings');
        const btnResetSettings = document.getElementById('btn-reset-settings');
        if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveSettingsFromUI);
        if (btnResetSettings) {
            btnResetSettings.addEventListener('click', () => {
                Storage.saveSettings(Storage.defaultSettings);
                loadSettingsToUI();
            });
        }

        // --- Crosshair Studio Controls ---
        const updateCrosshairLive = () => {
            const config = {
                style: el.chStyle.value,
                color: el.chColor.value,
                opacity: parseInt(el.chOpacity.value, 10),
                size: parseInt(el.chSize.value, 10),
                thickness: parseInt(el.chThickness.value, 10),
                gap: parseInt(el.chGap.value, 10),
                outline: el.chOutline.checked
            };
            CrosshairRenderer.updateAll(config);
        };

        if (el.chStyle) el.chStyle.addEventListener('change', updateCrosshairLive);
        if (el.chColor) {
            el.chColor.addEventListener('input', (e) => {
                el.chColorHex.textContent = e.target.value;
                updateCrosshairLive();
            });
        }
        if (el.chOpacity) {
            el.chOpacity.addEventListener('input', (e) => {
                el.chOpacityVal.textContent = `${e.target.value}%`;
                updateCrosshairLive();
            });
        }
        if (el.chSize) {
            el.chSize.addEventListener('input', (e) => {
                el.chSizeVal.textContent = `${e.target.value}px`;
                updateCrosshairLive();
            });
        }
        if (el.chThickness) {
            el.chThickness.addEventListener('input', (e) => {
                el.chThicknessVal.textContent = `${e.target.value}px`;
                updateCrosshairLive();
            });
        }
        if (el.chGap) {
            el.chGap.addEventListener('input', (e) => {
                el.chGapVal.textContent = `${e.target.value}px`;
                updateCrosshairLive();
            });
        }
        if (el.chOutline) el.chOutline.addEventListener('change', updateCrosshairLive);

        // Crosshair Presets
        document.querySelectorAll('.preset-chips .chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const presetKey = btn.dataset.chPreset;
                const preset = CrosshairRenderer.PRESETS[presetKey];
                if (preset) {
                    el.chStyle.value = preset.style;
                    el.chColor.value = preset.color;
                    el.chColorHex.textContent = preset.color;
                    el.chOpacity.value = preset.opacity;
                    el.chOpacityVal.textContent = `${preset.opacity}%`;
                    el.chSize.value = preset.size;
                    el.chSizeVal.textContent = `${preset.size}px`;
                    el.chThickness.value = preset.thickness;
                    el.chThicknessVal.textContent = `${preset.thickness}px`;
                    el.chGap.value = preset.gap;
                    el.chGapVal.textContent = `${preset.gap}px`;
                    el.chOutline.checked = preset.outline;
                    updateCrosshairLive();
                }
            });
        });

        const btnSaveCrosshair = document.getElementById('btn-save-crosshair');
        if (btnSaveCrosshair) btnSaveCrosshair.addEventListener('click', saveCrosshairFromUI);

        // Clear History Data Button
        const btnClearHistory = document.getElementById('btn-clear-history');
        if (btnClearHistory) {
            btnClearHistory.addEventListener('click', () => {
                if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการเล่นและสถิติทั้งหมด?')) {
                    Storage.clearHistory();
                    renderStatsDashboard();
                    updateHeaderAndMenuStats();
                }
            });
        }
    }

    // Run App
    initApp();
});
