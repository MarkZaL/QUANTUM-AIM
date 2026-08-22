/**
 * QUANTUMAIM - WEB AUDIO API SOUND SYNTHESIZER
 * Zero-latency procedural sound synthesis for hitsounds, streaks, and UI
 */

const SoundEngine = (() => {
    let audioCtx = null;
    let masterGain = null;
    let hitsoundGain = null;

    // Pentatonic scale semitone multipliers for streak pitch shift
    const STREAK_PENTATONIC = [1.0, 1.122, 1.259, 1.498, 1.681, 2.0, 2.245, 2.519, 2.996, 3.363];

    function initAudio() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();

            masterGain = audioCtx.createGain();
            hitsoundGain = audioCtx.createGain();

            hitsoundGain.connect(masterGain);
            masterGain.connect(audioCtx.destination);

            updateVolumes();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function updateVolumes() {
        if (!audioCtx) return;
        const settings = Storage.getSettings();
        const master = (settings.masterVolume || 80) / 100;
        const hit = (settings.hitsoundVolume || 100) / 100;

        masterGain.gain.setValueAtTime(master, audioCtx.currentTime);
        hitsoundGain.gain.setValueAtTime(hit, audioCtx.currentTime);
    }

    // Play Target Hit Sound
    function playHit(streak = 0) {
        initAudio();
        const settings = Storage.getSettings();
        const style = settings.hitsound || 'valorant';
        
        let pitchMult = 1.0;
        if (settings.streakPitch && streak > 0) {
            const index = Math.min(Math.floor(streak / 3), STREAK_PENTATONIC.length - 1);
            pitchMult = STREAK_PENTATONIC[index];
        }

        const now = audioCtx.currentTime;

        switch (style) {
            case 'valorant':
                playValorantDing(now, pitchMult);
                break;
            case 'quake':
                playQuakeBell(now, pitchMult);
                break;
            case 'pop':
                playPop(now, pitchMult);
                break;
            case 'laser':
                playLaser(now, pitchMult);
                break;
            case 'metallic':
                playMetallic(now, pitchMult);
                break;
            default:
                playValorantDing(now, pitchMult);
        }
    }

    // Valorant Style Headshot Ding (Metallic snap + High Ring)
    function playValorantDing(now, pitch) {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1480 * pitch, now);
        osc1.frequency.exponentialRampToValueAtTime(1200 * pitch, now + 0.12);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2960 * pitch, now);
        osc2.frequency.exponentialRampToValueAtTime(2400 * pitch, now + 0.08);

        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(hitsoundGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.16);
        osc2.stop(now + 0.16);
    }

    // Quake Arena High Bell
    function playQuakeBell(now, pitch) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880 * pitch, now);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(hitsoundGain);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // Bouncy Boba Pop
    function playPop(now, pitch) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(750 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(220 * pitch, now + 0.07);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(hitsoundGain);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // Cyber Laser Blip
    function playLaser(now, pitch) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1800 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.09);

        // Lowpass filter for punch
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(hitsoundGain);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Titanium Spark Clang
    function playMetallic(now, pitch) {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'square';
        osc1.frequency.setValueAtTime(950 * pitch, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2150 * pitch, now);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600 * pitch, now);
        filter.Q.setValueAtTime(4, now);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(hitsoundGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.12);
        osc2.stop(now + 0.12);
    }

    // Miss Click Sound
    function playMiss() {
        const settings = Storage.getSettings();
        if (!settings.missSound) return;
        initAudio();

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(hitsoundGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    // Countdown Beep
    function playCountdown(isGo = false) {
        try {
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            if (isGo) {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
                gain.gain.setValueAtTime(0.6, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(now);
                osc.stop(now + 0.35);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(now);
                osc.stop(now + 0.15);
            }
        } catch (e) {
            console.warn('Audio countdown error:', e);
        }
    }

    // UI Click Sound
    function playUiClick() {
        try {
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.04);
        } catch (e) {
            console.warn('Audio click error:', e);
        }
    }

    return {
        initAudio,
        updateVolumes,
        playHit,
        playMiss,
        playCountdown,
        playUiClick
    };
})();
