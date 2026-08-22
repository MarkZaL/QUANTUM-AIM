/**
 * QUANTUMAIM - STORAGE & DATA PERSISTENCE
 * Handles saving/loading settings, high scores, personal bests, and match history
 */

const Storage = (() => {
    const SETTINGS_KEY = 'quantumaim_settings';
    const SCORES_KEY = 'quantumaim_highscores';
    const HISTORY_KEY = 'quantumaim_history';

    // Default Settings
    const defaultSettings = {
        game: 'valorant',
        sens: 0.35,
        dpi: 800,
        fov: 103,
        invertY: false,
        hitsound: 'valorant',
        masterVolume: 80,
        hitsoundVolume: 100,
        streakPitch: true,
        missSound: true,
        targetColor: '#00f3ff',
        targetGlow: 1.2,
        particles: true,
        floatingScore: true,
        crosshair: {
            style: 'cross',
            color: '#00ff88',
            opacity: 100,
            size: 8,
            thickness: 2,
            gap: 4,
            outline: true
        }
    };

    // Default High Scores
    const defaultScores = {
        gridshot: { score: 0, accuracy: 0, tps: 0, hits: 0 },
        spidershot: { score: 0, accuracy: 0, tps: 0, hits: 0 },
        tracking: { score: 0, accuracy: 0, tps: 0, hits: 0 },
        microflex: { score: 0, accuracy: 0, tps: 0, hits: 0 },
        reflex: { score: 0, accuracy: 0, bestReaction: 0, hits: 0 }
    };

    let cachedSettings = null;

    // Load Settings (In-Memory Cached)
    function getSettings() {
        if (cachedSettings) return cachedSettings;
        try {
            const data = localStorage.getItem(SETTINGS_KEY);
            if (data) {
                cachedSettings = { ...defaultSettings, ...JSON.parse(data) };
                return cachedSettings;
            }
        } catch (e) {
            console.warn('LocalStorage load error:', e);
        }
        cachedSettings = { ...defaultSettings };
        return cachedSettings;
    }

    // Save Settings
    function saveSettings(settings) {
        cachedSettings = { ...settings };
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('LocalStorage save error:', e);
        }
    }

    // Load High Scores
    function getScores() {
        try {
            const data = localStorage.getItem(SCORES_KEY);
            if (data) {
                return { ...defaultScores, ...JSON.parse(data) };
            }
        } catch (e) {
            console.warn('LocalStorage load error:', e);
        }
        return { ...defaultScores };
    }

    // Update High Score if current performance is higher
    function recordScore(mode, result) {
        const scores = getScores();
        const prevBest = scores[mode] || { score: 0, accuracy: 0, tps: 0 };
        let isNewHigh = false;

        if (mode === 'reflex') {
            // Lower reaction time is better
            const bestReaction = prevBest.bestReaction === 0 ? result.avgReaction : Math.min(prevBest.bestReaction, result.avgReaction);
            if (result.score > prevBest.score || (result.avgReaction < prevBest.bestReaction && result.avgReaction > 0)) {
                isNewHigh = true;
            }
            scores[mode] = {
                score: Math.max(prevBest.score, result.score),
                accuracy: Math.max(prevBest.accuracy, result.accuracy),
                bestReaction: bestReaction,
                hits: (prevBest.hits || 0) + result.hits
            };
        } else {
            if (result.score > prevBest.score) {
                isNewHigh = true;
            }
            scores[mode] = {
                score: Math.max(prevBest.score, result.score),
                accuracy: Math.max(prevBest.accuracy, result.accuracy),
                tps: Math.max(prevBest.tps || 0, result.tps),
                hits: (prevBest.hits || 0) + result.hits
            };
        }

        try {
            localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
        } catch (e) {
            console.warn('LocalStorage save error:', e);
        }

        // Add to match history
        addMatchHistory(mode, result);

        return isNewHigh;
    }

    // Get Match History
    function getMatchHistory() {
        try {
            const data = localStorage.getItem(HISTORY_KEY);
            if (data) return JSON.parse(data);
        } catch (e) {
            console.warn('LocalStorage load error:', e);
        }
        return [];
    }

    // Add Entry to Match History (max 50 entries)
    function addMatchHistory(mode, result) {
        const history = getMatchHistory();
        const entry = {
            id: Date.now(),
            date: new Date().toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            mode: mode,
            score: result.score,
            accuracy: result.accuracy,
            hits: result.hits,
            misses: result.misses,
            reaction: result.avgReaction || 0,
            tps: result.tps || 0,
            maxStreak: result.maxStreak || 0
        };

        history.unshift(entry);
        if (history.length > 50) history.pop();

        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.warn('LocalStorage save error:', e);
        }
    }

    // Clear History
    function clearHistory() {
        try {
            localStorage.removeItem(HISTORY_KEY);
            localStorage.removeItem(SCORES_KEY);
        } catch (e) {
            console.warn('LocalStorage clear error:', e);
        }
    }

    // Calculate Overall Career Rank based on average scores
    function getCareerRank() {
        const scores = getScores();
        const gridBest = scores.gridshot?.score || 0;
        
        if (gridBest >= 100000) return { name: 'APEX GRANDMASTER', tier: 'TOP 0.1%', icon: 'crown', color: '#ff0055' };
        if (gridBest >= 85000) return { name: 'IMMORTAL', tier: 'TIER I', icon: 'shield-alert', color: '#ff0055' };
        if (gridBest >= 70000) return { name: 'DIAMOND', tier: 'TIER I', icon: 'award', color: '#00f3ff' };
        if (gridBest >= 55000) return { name: 'PLATINUM', tier: 'TIER II', icon: 'shield', color: '#00ff88' };
        if (gridBest >= 40000) return { name: 'GOLD', tier: 'TIER III', icon: 'star', color: '#ffbe0b' };
        if (gridBest >= 25000) return { name: 'SILVER', tier: 'TIER II', icon: 'disc', color: '#c0c0c0' };
        return { name: 'BRONZE', tier: 'TIER I', icon: 'crosshair', color: '#cd7f32' };
    }

    return {
        defaultSettings,
        getSettings,
        saveSettings,
        getScores,
        recordScore,
        getMatchHistory,
        clearHistory,
        getCareerRank
    };
})();
