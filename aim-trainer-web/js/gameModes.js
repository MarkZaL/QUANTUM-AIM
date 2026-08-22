/**
 * QUANTUMAIM - GAME MODES & DRILL LOGIC
 * Gridshot, Spidershot, Tracking, Microflex, and Reflex Reaction Drill
 */

const GameModes = (() => {
    let currentModeId = 'gridshot';
    let targetCounter = 0;

    // Gridshot Configuration
    const GRID_COLS = 5;
    const GRID_ROWS = 3;
    const GRID_SPACING_X = 3.6;
    const GRID_SPACING_Y = 2.8;
    const GRID_Z = -16;
    let occupiedGridCells = new Set();

    // Spidershot State
    let spidershotNextIsCenter = true;

    // Tracking State
    let trackingTarget = null;
    let trackingTimeOnTarget = 0;
    let trackingTotalTime = 0;

    // Reflex State
    let reflexRound = 0;
    const REFLEX_MAX_ROUNDS = 10;
    let reflexSpawnTime = 0;
    let reflexTimes = [];
    let reflexTimeoutId = null;

    // Available Drill Definitions
    const MODES = {
        gridshot: {
            id: 'gridshot',
            name: 'GRIDSHOT',
            duration: 60.0,
            description: '3 Target Continuous Flicking Drill',
            init: initGridshot,
            onHit: onGridshotHit,
            onMiss: onGridshotMiss,
            onUpdate: updateGridshot,
            cleanup: cleanupGridshot
        },
        spidershot: {
            id: 'spidershot',
            name: 'SPIDERSHOT',
            duration: 60.0,
            description: 'Dynamic Center-to-Perimeter Flicking',
            init: initSpidershot,
            onHit: onSpidershotHit,
            onMiss: onSpidershotMiss,
            onUpdate: updateSpidershot,
            cleanup: cleanupSpidershot
        },
        tracking: {
            id: 'tracking',
            name: 'TRACKING (STRAFE)',
            duration: 45.0,
            description: 'Continuous Smooth Target Tracking',
            init: initTracking,
            onHit: onTrackingHit,
            onMiss: onTrackingMiss,
            onUpdate: updateTracking,
            cleanup: cleanupTracking
        },
        microflex: {
            id: 'microflex',
            name: 'MICROFLEX',
            duration: 45.0,
            description: 'Tight Micro-adjustments & Precision Headshots',
            init: initMicroflex,
            onHit: onMicroflexHit,
            onMiss: onMicroflexMiss,
            onUpdate: updateMicroflex,
            cleanup: cleanupMicroflex
        },
        reflex: {
            id: 'reflex',
            name: 'REFLEX TIME',
            duration: 0, // Round-based (10 rounds)
            description: 'Pure Raw Reaction Time (ms)',
            init: initReflex,
            onHit: onReflexHit,
            onMiss: onReflexMiss,
            onUpdate: updateReflex,
            cleanup: cleanupReflex
        }
    };

    function getMode(id) {
        return MODES[id] || MODES.gridshot;
    }

    // ===================================================================
    // 1. GRIDSHOT (CLASSIC 3-TARGET)
    // ===================================================================

    function initGridshot() {
        occupiedGridCells.clear();
        Engine3D.clearAllTargets();

        // Spawn initial 3 targets on grid
        for (let i = 0; i < 3; i++) {
            spawnRandomGridTarget();
        }
    }

    function spawnRandomGridTarget() {
        const availableCells = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const key = `${r}_${c}`;
                if (!occupiedGridCells.has(key)) {
                    availableCells.push({ r, c, key });
                }
            }
        }

        if (availableCells.length === 0) return;

        const pick = availableCells[Math.floor(Math.random() * availableCells.length)];
        occupiedGridCells.add(pick.key);

        const x = (pick.c - (GRID_COLS - 1) / 2) * GRID_SPACING_X;
        const y = (pick.r - (GRID_ROWS - 1) / 2) * GRID_SPACING_Y;
        const z = GRID_Z;

        targetCounter++;
        Engine3D.spawnTarget(`grid_${targetCounter}`, x, y, z, 0.85, { gridKey: pick.key });
    }

    function onGridshotHit(hitInfo, gameState) {
        const target = hitInfo.target;
        if (target.gridKey) {
            occupiedGridCells.delete(target.gridKey);
        }
        Engine3D.removeTarget(target.id);
        spawnRandomGridTarget();

        // Base points + streak multiplier
        const baseScore = 100;
        const streakMult = Math.min(1 + gameState.streak * 0.05, 3.0);
        return Math.round(baseScore * streakMult);
    }

    function onGridshotMiss() {}
    function updateGridshot(delta, gameState) {}
    function cleanupGridshot() {
        occupiedGridCells.clear();
    }

    // ===================================================================
    // 2. SPIDERSHOT (CENTER <-> OUTER)
    // ===================================================================

    function initSpidershot() {
        Engine3D.clearAllTargets();
        spidershotNextIsCenter = true;
        spawnSpidershotTarget();
    }

    function spawnSpidershotTarget() {
        targetCounter++;
        if (spidershotNextIsCenter) {
            // Spawn large center target
            Engine3D.spawnTarget(`spider_${targetCounter}`, 0, 0, GRID_Z, 0.95, { isCenter: true });
        } else {
            // Spawn outer target at random distance & angle
            const angle = Math.random() * Math.PI * 2;
            const dist = 3.5 + Math.random() * 4.5;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * (dist * 0.65);
            const radius = 0.65 + Math.random() * 0.45; // Varying target sizes

            Engine3D.spawnTarget(`spider_${targetCounter}`, x, y, GRID_Z, radius, { isCenter: false, dist: dist });
        }
    }

    function onSpidershotHit(hitInfo, gameState) {
        const target = hitInfo.target;
        Engine3D.removeTarget(target.id);

        spidershotNextIsCenter = !spidershotNextIsCenter;
        spawnSpidershotTarget();

        const baseScore = target.isCenter ? 100 : 150;
        const streakMult = Math.min(1 + gameState.streak * 0.05, 3.0);
        return Math.round(baseScore * streakMult);
    }

    function onSpidershotMiss() {}
    function updateSpidershot(delta, gameState) {}
    function cleanupSpidershot() {}

    // ===================================================================
    // 3. TRACKING (STRAFE SPHERE)
    // ===================================================================

    function initTracking() {
        Engine3D.clearAllTargets();
        trackingTimeOnTarget = 0;
        trackingTotalTime = 0;

        targetCounter++;
        trackingTarget = Engine3D.spawnTarget(`track_${targetCounter}`, 0, 0, GRID_Z, 0.95, {
            time: 0,
            freqX: 0.8 + Math.random() * 0.4,
            freqY: 0.6 + Math.random() * 0.4,
            ampX: 6.5,
            ampY: 3.2,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            onUpdate: function(t, delta) {
                t.time += delta;
                t.mesh.position.x = Math.sin(t.time * t.freqX + t.phaseX) * t.ampX;
                t.mesh.position.y = Math.cos(t.time * t.freqY + t.phaseY) * t.ampY;
            }
        });
    }

    function onTrackingHit() { return 0; }
    function onTrackingMiss() {}

    function updateTracking(delta, gameState) {
        trackingTotalTime += delta;
        const hoveredTarget = Engine3D.checkCrosshairHover();

        if (hoveredTarget && hoveredTarget === trackingTarget) {
            trackingTimeOnTarget += delta;
            gameState.hits += 1;
            gameState.streak += 1;
            if (gameState.streak > gameState.maxStreak) gameState.maxStreak = gameState.streak;

            // Score increases with continuous tracking
            gameState.score += Math.round(delta * 800 * Math.min(1 + gameState.streak * 0.02, 2.5));

            // Hitsound pulse every 0.15s
            if (Math.random() < delta * 6) {
                SoundEngine.playHit(gameState.streak);
            }
        } else {
            gameState.streak = 0;
            gameState.misses += 1;
        }

        // Real-time tracking accuracy percentage
        if (trackingTotalTime > 0) {
            gameState.accuracy = Math.min(100, Math.round((trackingTimeOnTarget / trackingTotalTime) * 100));
        }
    }

    function cleanupTracking() {
        trackingTarget = null;
    }

    // ===================================================================
    // 4. MICROFLEX (MICRO ADJUSTMENTS)
    // ===================================================================

    function initMicroflex() {
        Engine3D.clearAllTargets();
        spawnMicroflexCluster();
    }

    function spawnMicroflexCluster() {
        Engine3D.clearAllTargets();

        // Cluster center
        const clusterCenterX = (Math.random() - 0.5) * 6.0;
        const clusterCenterY = (Math.random() - 0.5) * 3.5;

        // Spawn 2 small precision targets
        for (let i = 0; i < 2; i++) {
            targetCounter++;
            const offsetX = (Math.random() - 0.5) * 2.2;
            const offsetY = (Math.random() - 0.5) * 1.8;
            const radius = 0.42; // Small micro target

            Engine3D.spawnTarget(`micro_${targetCounter}`, clusterCenterX + offsetX, clusterCenterY + offsetY, GRID_Z, radius, {
                life: 2.2,
                onUpdate: function(t, delta) {
                    t.life -= delta;
                    if (t.life <= 0) {
                        Engine3D.removeTarget(t.id);
                        if (Engine3D.getTargetCount() === 0) {
                            spawnMicroflexCluster();
                        }
                    }
                }
            });
        }
    }

    function onMicroflexHit(hitInfo, gameState) {
        Engine3D.removeTarget(hitInfo.target.id);

        if (Engine3D.getTargetCount() === 0) {
            spawnMicroflexCluster();
        }

        const baseScore = 150;
        const streakMult = Math.min(1 + gameState.streak * 0.08, 3.5);
        return Math.round(baseScore * streakMult);
    }

    function onMicroflexMiss() {}
    function updateMicroflex(delta, gameState) {}
    function cleanupMicroflex() {}

    // ===================================================================
    // 5. REFLEX REACTION TIME (ROUND BASED)
    // ===================================================================

    function initReflex(gameState) {
        Engine3D.clearAllTargets();
        reflexRound = 0;
        reflexTimes = [];
        startNextReflexRound(gameState);
    }

    function startNextReflexRound(gameState) {
        if (reflexTimeoutId) clearTimeout(reflexTimeoutId);
        Engine3D.clearAllTargets();

        if (reflexRound >= REFLEX_MAX_ROUNDS) {
            // Finished 10 rounds, end drill
            if (window.onReflexDrillComplete) {
                window.onReflexDrillComplete();
            }
            return;
        }

        reflexRound++;
        if (gameState) {
            gameState.currentRound = reflexRound;
            gameState.maxRounds = REFLEX_MAX_ROUNDS;
        }

        // Random wait delay between 1.2s and 2.6s
        const delay = 1200 + Math.random() * 1400;
        reflexTimeoutId = setTimeout(() => {
            spawnReflexTarget();
        }, delay);
    }

    function spawnReflexTarget() {
        targetCounter++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 2.0 + Math.random() * 4.0;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * (dist * 0.6);

        reflexSpawnTime = performance.now();
        Engine3D.spawnTarget(`reflex_${targetCounter}`, x, y, GRID_Z, 0.9, { isReflex: true });
    }

    function onReflexHit(hitInfo, gameState) {
        const hitTime = performance.now();
        const reactionMs = Math.round(hitTime - reflexSpawnTime);
        reflexTimes.push(reactionMs);

        Engine3D.removeTarget(hitInfo.target.id);

        // Feedback banner in HUD
        if (window.showReactionFeed) {
            window.showReactionFeed(`${reactionMs} ms`);
        }

        // Score based on speed (<200ms = 1000pts, 250ms = 750pts, 300ms = 500pts)
        const score = Math.max(100, Math.round(1000 - Math.max(0, reactionMs - 150) * 3));

        // Start next round after short pause
        setTimeout(() => {
            startNextReflexRound(gameState);
        }, 500);

        return score;
    }

    function onReflexMiss() {}
    function updateReflex(delta, gameState) {}
    function cleanupReflex() {
        if (reflexTimeoutId) clearTimeout(reflexTimeoutId);
        reflexTimeoutId = null;
    }

    function getReflexAvg() {
        if (reflexTimes.length === 0) return 0;
        const sum = reflexTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / reflexTimes.length);
    }

    return {
        MODES,
        getMode,
        getReflexAvg
    };
})();
