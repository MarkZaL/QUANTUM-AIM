/**
 * QUANTUMAIM - SENSITIVITY CALCULATION & CONVERSION ENGINE
 * Precision math for Valorant, CS2, Apex Legends, Overwatch 2, Fortnite & R6
 */

const Sensitivity = (() => {
    // Standard m_yaw values (degrees turned per mouse count)
    const YAW_TABLE = {
        valorant: 0.07,
        cs2: 0.022,
        apex: 0.022,
        overwatch: 0.0066,
        fortnite: 0.0055555,
        r6: 0.00572
    };

    // Calculate effective yaw based on game and sensitivity input
    function getEffectiveYaw(game, sens) {
        const baseYaw = YAW_TABLE[game] || 0.07;
        return baseYaw * sens;
    }

    // Convert mouse movement count directly to Camera Radians
    function countsToRadians(counts, game, sens, invert = false) {
        const effectiveYawDeg = getEffectiveYaw(game, sens);
        const rad = (counts * effectiveYawDeg * Math.PI) / 180;
        return invert ? -rad : rad;
    }

    // Calculate eDPI, cm/360, and in/360
    function calculateMetrics(game, sens, dpi) {
        const effectiveYaw = getEffectiveYaw(game, sens);
        const countsPer360 = 360 / effectiveYaw;
        const inchesPer360 = countsPer360 / dpi;
        const cmPer360 = inchesPer360 * 2.54;
        
        let edpi = sens * dpi;
        if (game === 'cs2' || game === 'apex') {
            edpi = sens * dpi; // CS2 eDPI
        }

        return {
            edpi: edpi.toFixed(1),
            cm360: cmPer360.toFixed(1),
            in360: inchesPer360.toFixed(1)
        };
    }

    // Convert sensitivity between games
    function convertSens(fromGame, toGame, sensValue) {
        const fromYaw = YAW_TABLE[fromGame] || 0.07;
        const toYaw = YAW_TABLE[toGame] || 0.07;
        return (sensValue * fromYaw) / toYaw;
    }

    return {
        YAW_TABLE,
        getEffectiveYaw,
        countsToRadians,
        calculateMetrics,
        convertSens
    };
})();
