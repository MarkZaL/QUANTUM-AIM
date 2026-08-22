/**
 * QUANTUMAIM - CROSSHAIR RENDERER & STUDIO ENGINE
 * High-performance Canvas rendering for in-game crosshairs and customizer preview
 */

const CrosshairRenderer = (() => {
    // Crosshair Presets
    const PRESETS = {
        dot: {
            style: 'dot',
            color: '#00ff88',
            opacity: 100,
            size: 4,
            thickness: 3,
            gap: 0,
            outline: true
        },
        classic: {
            style: 'cross',
            color: '#00f3ff',
            opacity: 100,
            size: 10,
            thickness: 2,
            gap: 5,
            outline: true
        },
        tight: {
            style: 'cross',
            color: '#00ff88',
            opacity: 100,
            size: 6,
            thickness: 2,
            gap: 2,
            outline: true
        },
        circle: {
            style: 'circle',
            color: '#ff0055',
            opacity: 100,
            size: 8,
            thickness: 2,
            gap: 0,
            outline: true
        },
        crossdot: {
            style: 'cross_dot',
            color: '#ffbe0b',
            opacity: 100,
            size: 8,
            thickness: 2,
            gap: 4,
            outline: true
        }
    };

    // Render crosshair onto any given canvas
    function render(canvas, config) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        ctx.clearRect(0, 0, width, height);

        const style = config.style || 'cross';
        const color = config.color || '#00ff88';
        const opacity = (config.opacity !== undefined ? config.opacity : 100) / 100;
        const size = Number(config.size) || 8;
        const thickness = Number(config.thickness) || 2;
        const gap = Number(config.gap) || 4;
        const outline = config.outline !== false;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Draw Cross style
        if (style === 'cross' || style === 'cross_dot') {
            drawCross(ctx, cx, cy, size, thickness, gap, color, outline);
        }

        // Draw Dot style or Cross + Dot
        if (style === 'dot' || style === 'cross_dot') {
            const dotSize = style === 'dot' ? size : Math.max(2, thickness);
            drawDot(ctx, cx, cy, dotSize, color, outline);
        }

        // Draw Circle style
        if (style === 'circle') {
            drawCircle(ctx, cx, cy, size, thickness, color, outline);
        }

        ctx.restore();
    }

    // Helper: Draw 4 Cross lines with outline
    function drawCross(ctx, cx, cy, size, thickness, gap, color, outline) {
        const lines = [
            { x: cx - gap - size, y: cy - thickness / 2, w: size, h: thickness }, // Left
            { x: cx + gap, y: cy - thickness / 2, w: size, h: thickness },        // Right
            { x: cx - thickness / 2, y: cy - gap - size, w: thickness, h: size }, // Top
            { x: cx - thickness / 2, y: cy + gap, w: thickness, h: size }         // Bottom
        ];

        // Draw Black Outline first if enabled
        if (outline) {
            ctx.fillStyle = '#000000';
            const outPad = 1;
            lines.forEach(l => {
                ctx.fillRect(l.x - outPad, l.y - outPad, l.w + outPad * 2, l.h + outPad * 2);
            });
        }

        // Draw Main Colored Crosshair
        ctx.fillStyle = color;
        lines.forEach(l => {
            ctx.fillRect(l.x, l.y, l.w, l.h);
        });
    }

    // Helper: Draw Center Dot
    function drawDot(ctx, cx, cy, size, color, outline) {
        const radius = size / 2;

        if (outline) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    // Helper: Draw Hollow Circle
    function drawCircle(ctx, cx, cy, radius, thickness, color, outline) {
        if (outline) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.lineWidth = thickness + 2;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    // Redraw both HUD and Preview canvases
    function updateAll(config) {
        const inGameCanvas = document.getElementById('crosshair-canvas');
        const studioCanvas = document.getElementById('crosshair-studio-canvas');

        if (inGameCanvas) render(inGameCanvas, config);
        if (studioCanvas) render(studioCanvas, config);
    }

    return {
        PRESETS,
        render,
        updateAll
    };
})();
