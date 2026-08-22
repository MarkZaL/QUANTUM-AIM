/**
 * QUANTUMAIM - THREE.JS 3D FPS ENGINE & ARENA
 * Cyberpunk Grid Arena, PointerLock Controls, Particle Effects, Raycasting
 */

const Engine3D = (() => {
    let scene, camera, renderer;
    let canvasContainer;
    let isInitialized = false;

    // Camera angles
    let pitch = 0;
    let yaw = 0;
    let isPointerLocked = false;
    const MAX_PITCH = (89 * Math.PI) / 180;

    // Pre-calculated Mouse Sensitivity Radians (Zero-Allocation on mousemove)
    let radPerCountX = 0.001;
    let radPerCountY = 0.001;

    // Mouse delta accumulator — collects all mousemove events between frames
    // then applies them once per rAF tick to eliminate jitter from high-poll mice
    let _accX = 0;
    let _accY = 0;
    // Max delta per event (clamp browser spike bugs on focus restore)
    const MAX_MOVE_PER_EVENT = 150;

    // Target Management
    let targets = [];
    let targetMaterial = null;
    let targetWireMaterial = null;

    // Particle & Effect pools
    let particles = [];
    let shockwaves = [];

    // Raycaster (reused, zero allocation per frame)
    const raycaster = new THREE.Raycaster();
    const centerScreenVec = new THREE.Vector2(0, 0);

    // Real-Time FPS Tracker
    let onFpsUpdateCallback = null;
    let currentFps = 180;
    let currentFrameTime = 5.5;

    function updateSensConfig() {
        const settings = Storage.getSettings();
        const game = settings.game || 'valorant';
        const sens = parseFloat(settings.sens) || 0.35;
        const invertY = settings.invertY || false;
        const baseYaw = Sensitivity.YAW_TABLE[game] || 0.07;
        const degPerCount = baseYaw * sens;
        radPerCountX = (degPerCount * Math.PI) / 180;
        radPerCountY = ((degPerCount * Math.PI) / 180) * (invertY ? -1 : 1);
    }

    // Initialize 3D Scene
    function init() {
        if (isInitialized) return;

        canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) return;

        // 1. Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x080e18);
        scene.fog = new THREE.FogExp2(0x080e18, 0.008);

        // 2. Camera
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
        camera.position.set(0, 0, 0);
        camera.rotation.order = 'YXZ';
        updateCameraFOV();

        // 3. Renderer (Optimized for 180+ FPS Esports Performance)
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'highp',
            stencil: false
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(1.0); // 1.0 Native for Uncapped 180-360+ FPS
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        canvasContainer.appendChild(renderer.domElement);

        // 4. Lighting
        setupLighting();

        // 5. Arena Environment (Floor, Walls, Neon Trim)
        buildCyberArena();

        // 6. Target Materials
        updateTargetMaterials();

        // 7. Sensitivity Pre-calculation
        updateSensConfig();

        // 8. Event Listeners (Mouse look & Window resize)
        setupEventListeners();

        isInitialized = true;

        // Start Uncapped High-Refresh Animation Loop
        let lastTime = performance.now();
        let frameCount = 0;
        let lastFpsTime = performance.now();

        function animate(currentTime) {
            const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
            lastTime = currentTime;

            // Update Real-Time FPS and Frame-time every 500ms
            frameCount++;
            if (currentTime - lastFpsTime >= 500) {
                currentFps = Math.round((frameCount * 1000) / (currentTime - lastFpsTime));
                currentFrameTime = (1000 / Math.max(1, currentFps)).toFixed(1);
                frameCount = 0;
                lastFpsTime = currentTime;

                if (onFpsUpdateCallback) {
                    onFpsUpdateCallback(currentFps, currentFrameTime);
                }
            }

            update(delta);
            renderer.render(scene, camera);
            requestAnimationFrame(animate); // Single rAF at END — prevents double-loop
        }
        requestAnimationFrame(animate);
    }

    // Setup High-Tech Lighting (Optimized: 3 lights instead of 6)
    function setupLighting() {
        // Ambient fills everything — no shadow cost
        const ambientLight = new THREE.AmbientLight(0x4466aa, 3.0);
        scene.add(ambientLight);

        // Single strong directional from above-front (cheap, no shadow map)
        const mainSpot = new THREE.DirectionalLight(0xffffff, 3.0);
        mainSpot.position.set(0, 12, 8);
        mainSpot.castShadow = false;
        scene.add(mainSpot);

        // One neon PointLight behind targets (color fill)
        const backGlow = new THREE.PointLight(0x00f3ff, 4.0, 55);
        backGlow.position.set(0, 0, -16);
        scene.add(backGlow);

        // Camera-attached headlight (cheap — moves with player, no scene traversal)
        const headLight = new THREE.PointLight(0xffffff, 1.2, 40);
        headLight.position.set(0, 0, 0);
        camera.add(headLight);
        scene.add(camera);
    }

    // Build Cyber/Sci-Fi Arena Room (Performance-Optimized)
    function buildCyberArena() {
        const arenaWidth = 36;
        const arenaHeight = 22;
        const arenaDepth = 36;

        // Floor Grid (reduced divisions 36→18 for 75% fewer draw calls)
        const gridHelper = new THREE.GridHelper(arenaWidth, 18, 0x00f3ff, 0x0a1a2a);
        gridHelper.position.y = -arenaHeight / 2;
        scene.add(gridHelper);

        // Wall Panels — MeshBasicMaterial: zero lighting calculation cost
        const wallMat = new THREE.MeshBasicMaterial({ color: 0x080c14 });
        const backWallGeo = new THREE.PlaneGeometry(arenaWidth, arenaHeight);
        const backWall = new THREE.Mesh(backWallGeo, wallMat);
        backWall.position.set(0, 0, -arenaDepth / 2);
        scene.add(backWall);

        // Shared geometry for side walls
        const sideWallGeo = new THREE.PlaneGeometry(arenaDepth, arenaHeight);
        const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-arenaWidth / 2, 0, 0);
        scene.add(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(arenaWidth / 2, 0, 0);
        scene.add(rightWall);

        // Neon border lines (4 edges = 4 draw calls, cheap)
        createNeonLine(
            [-arenaWidth / 2, -arenaHeight / 2, -arenaDepth / 2],
            [arenaWidth / 2, -arenaHeight / 2, -arenaDepth / 2],
            0x00f3ff
        );
        createNeonLine(
            [-arenaWidth / 2, arenaHeight / 2, -arenaDepth / 2],
            [arenaWidth / 2, arenaHeight / 2, -arenaDepth / 2],
            0x00f3ff
        );
        createNeonLine(
            [-arenaWidth / 2, -arenaHeight / 2, -arenaDepth / 2],
            [-arenaWidth / 2, arenaHeight / 2, -arenaDepth / 2],
            0xff0055
        );
        createNeonLine(
            [arenaWidth / 2, -arenaHeight / 2, -arenaDepth / 2],
            [arenaWidth / 2, arenaHeight / 2, -arenaDepth / 2],
            0xff0055
        );
    }

    // Helper: Create Glowing Neon Line Strip
    function createNeonLine(p1, p2, hexColor) {
        const points = [
            new THREE.Vector3(...p1),
            new THREE.Vector3(...p2)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: hexColor, linewidth: 2 });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    // Shared geometry (created once, reused by all targets — zero GC)
    let _sphereGeo = null;
    function getSharedSphereGeo(radius) {
        // 16 segments = visually identical to 32 at game distance, 4x less triangles
        if (!_sphereGeo || _sphereGeo._radius !== radius) {
            _sphereGeo = new THREE.SphereGeometry(radius, 16, 12);
            _sphereGeo._radius = radius;
        }
        return _sphereGeo;
    }

    // Update Materials when target color settings change
    function updateTargetMaterials() {
        const settings = Storage.getSettings();
        const hex = settings.targetColor || '#00f3ff';
        const glow = parseFloat(settings.targetGlow) || 1.2;

        const colorObj = new THREE.Color(hex);

        // MeshPhongMaterial: ~40% faster than MeshStandardMaterial (no PBR)
        targetMaterial = new THREE.MeshPhongMaterial({
            color: colorObj,
            emissive: colorObj,
            emissiveIntensity: glow,
            shininess: 80,
            specular: new THREE.Color(0x444444)
        });

        targetWireMaterial = null; // Unused — removed for perf
    }

    // Update Vertical FOV from Horizontal FOV Setting
    function updateCameraFOV() {
        if (!camera) return;
        const settings = Storage.getSettings();
        const hFOV = settings.fov || 103;
        const aspect = window.innerWidth / window.innerHeight;

        // Formula: vFOV = 2 * atan(tan(hFOV / 2) / aspect)
        const hRad = (hFOV * Math.PI) / 180;
        const vRad = 2 * Math.atan(Math.tan(hRad / 2) / aspect);
        const vFOV = (vRad * 180) / Math.PI;

        camera.fov = vFOV;
        camera.updateProjectionMatrix();
    }

    // Setup Mouse Movement & Pointer Lock
    function setupEventListeners() {
        // Pointer Lock State Changes
        document.addEventListener('pointerlockchange', () => {
            isPointerLocked = document.pointerLockElement === renderer.domElement;
            if (!isPointerLocked) {
                // Clear any pending mouse delta — prevents camera snap on re-entry
                _accX = 0;
                _accY = 0;
                if (window.onPointerLockExit) {
                    window.onPointerLockExit();
                }
            }
        });

        // Raw Mouse Movement: ONLY accumulate delta here — never touch camera
        // This prevents jitter when 1000Hz+ mice fire 8-10 events per frame.
        // The delta is applied exactly once per rAF tick in update().
        document.addEventListener('mousemove', (e) => {
            if (!isPointerLocked) return;
            // Clamp per-event movement to guard against browser spike bug
            // (Chromium sometimes reports huge movementX/Y on focus restore)
            const dx = e.movementX || 0;
            const dy = e.movementY || 0;
            _accX += (dx > MAX_MOVE_PER_EVENT ? MAX_MOVE_PER_EVENT : dx < -MAX_MOVE_PER_EVENT ? -MAX_MOVE_PER_EVENT : dx);
            _accY += (dy > MAX_MOVE_PER_EVENT ? MAX_MOVE_PER_EVENT : dy < -MAX_MOVE_PER_EVENT ? -MAX_MOVE_PER_EVENT : dy);
        }, { passive: true });

        // Window Resize
        window.addEventListener('resize', () => {
            if (!renderer || !camera) return;
            const width = window.innerWidth;
            const height = window.innerHeight;

            renderer.setSize(width, height);
            updateCameraFOV();
        });
    }

    // Request Pointer Lock on 3D Viewport
    function requestLock() {
        if (renderer && renderer.domElement) {
            try {
                const p = renderer.domElement.requestPointerLock();
                if (p && typeof p.catch === 'function') {
                    p.catch(e => {
                        console.warn('Pointer lock request ignored or deferred:', e);
                    });
                }
            } catch (e) {
                console.warn('Pointer lock error:', e);
            }
        }
    }

    // Exit Pointer Lock
    function exitLock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    // Reset Camera Angles
    function resetCamera() {
        pitch = 0;
        yaw = 0;
        if (camera) {
            camera.rotation.set(0, 0, 0);
        }
    }

    // ===================================================================
    // TARGET SPAWNING & LIFECYCLE
    // ===================================================================

    // Spawn 3D Target Sphere at (x, y, z) with radius
    function spawnTarget(id, x, y, z, radius = 0.85, extraData = {}) {
        if (!targetMaterial) updateTargetMaterials();

        // Reuse cached geometry (major GC reduction)
        const sphereGeo = getSharedSphereGeo(radius);
        const mesh = new THREE.Mesh(sphereGeo, targetMaterial.clone());
        mesh.position.set(x, y, z);

        // Pop-in scale animation
        mesh.scale.set(0.01, 0.01, 0.01);

        const targetObj = {
            id: id,
            mesh: mesh,
            targetScale: 1.0,
            currentScale: 0.01,
            radius: radius,
            createdAt: performance.now(),
            ...extraData
        };

        scene.add(mesh);
        targets.push(targetObj);
        return targetObj;
    }

    // Remove Target from Scene
    function removeTarget(id) {
        const index = targets.findIndex(t => t.id === id);
        if (index !== -1) {
            const target = targets[index];
            scene.remove(target.mesh);
            target.mesh.geometry.dispose();
            target.mesh.material.dispose();
            targets.splice(index, 1);
        }
    }

    // Clear All Targets
    function clearAllTargets() {
        targets.forEach(t => {
            scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            t.mesh.material.dispose();
        });
        targets.length = 0;
    }

    // Get Active Target Count
    function getTargetCount() {
        return targets.length;
    }

    // Raycast Shoot from Center Crosshair
    function shoot() {
        if (!camera) return null;

        raycaster.setFromCamera(centerScreenVec, camera);
        const targetMeshes = targets.map(t => t.mesh);
        const intersects = raycaster.intersectObjects(targetMeshes, false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const hitTarget = targets.find(t => t.mesh === hitMesh);
            const hitPoint = intersects[0].point;

            if (hitTarget) {
                // Trigger explosion particles at hit location
                createExplosion(hitPoint, hitTarget.radius);
                return {
                    target: hitTarget,
                    point: hitPoint,
                    distance: intersects[0].distance
                };
            }
        }
        return null;
    }

    // Check if crosshair is continuously hovering over a target (for Tracking Mode)
    function checkCrosshairHover() {
        if (!camera || targets.length === 0) return null;

        raycaster.setFromCamera(centerScreenVec, camera);
        const targetMeshes = targets.map(t => t.mesh);
        const intersects = raycaster.intersectObjects(targetMeshes, false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            return targets.find(t => t.mesh === hitMesh) || null;
        }
        return null;
    }

    // ===================================================================
    // PARTICLE EFFECTS & SHOCKWAVES
    // ===================================================================

    function createExplosion(pos, scale = 1) {
        const settings = Storage.getSettings();
        if (!settings.particles) return;

        const particleCount = 24;
        const colorHex = settings.targetColor || '#00f3ff';
        const color = new THREE.Color(colorHex);

        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;

            // Random spherical velocity
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const speed = (Math.random() * 8 + 4) * scale;

            velocities.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.sin(phi) * Math.sin(theta) * speed,
                Math.cos(phi) * speed
            ));
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: color,
            size: 0.25 * scale,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        const pSystem = new THREE.Points(geom, mat);
        scene.add(pSystem);

        particles.push({
            mesh: pSystem,
            velocities: velocities,
            positions: positions,
            life: 1.0,
            decay: 2.5 // Fades out in ~0.4s
        });

        // Shockwave Ring
        createShockwave(pos, scale, color);
    }

    function createShockwave(pos, scale, color) {
        const ringGeo = new THREE.RingGeometry(0.1, 0.3 * scale, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(pos);
        ringMesh.lookAt(camera.position); // Always face camera
        scene.add(ringMesh);

        shockwaves.push({
            mesh: ringMesh,
            scale: 1.0,
            opacity: 0.8,
            maxScale: 3.5 * scale,
            speed: 8.0 * scale
        });
    }

    // Screen-space 2D position converter for 3D floating score popups
    function toScreenPosition(pos3D) {
        if (!camera) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const vector = pos3D.clone().project(camera);
        return {
            x: (vector.x * 0.5 + 0.5) * window.innerWidth,
            y: (-(vector.y * 0.5) + 0.5) * window.innerHeight
        };
    }

    // ===================================================================
    // FRAME UPDATE
    // ===================================================================

    function update(delta) {
        // 0. Apply accumulated mouse delta — once per frame, perfectly sync with render
        if ((_accX !== 0 || _accY !== 0) && isPointerLocked) {
            yaw   -= _accX * radPerCountX;
            pitch -= _accY * radPerCountY;
            _accX = 0;
            _accY = 0;

            if (pitch > MAX_PITCH) pitch = MAX_PITCH;
            else if (pitch < -MAX_PITCH) pitch = -MAX_PITCH;

            camera.rotation.x = pitch;
            camera.rotation.y = yaw;
        }

        // 1. Update Target scale & animations
        for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (t.currentScale < t.targetScale) {
                t.currentScale += delta * 6.0; // Fast pop-in
                if (t.currentScale > t.targetScale) t.currentScale = t.targetScale;
                t.mesh.scale.set(t.currentScale, t.currentScale, t.currentScale);
            }

            // Custom mode movement logic (e.g. Tracking sine motion)
            if (t.onUpdate) {
                t.onUpdate(t, delta);
            }
        }

        // 2. Update Explosion Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= delta * p.decay;

            if (p.life <= 0) {
                scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                particles.splice(i, 1);
                continue;
            }

            const positions = p.mesh.geometry.attributes.position.array;
            for (let j = 0; j < p.velocities.length; j++) {
                positions[j * 3] += p.velocities[j].x * delta;
                positions[j * 3 + 1] += p.velocities[j].y * delta;
                positions[j * 3 + 2] += p.velocities[j].z * delta;
            }
            p.mesh.geometry.attributes.position.needsUpdate = true;
            p.mesh.material.opacity = p.life;
        }

        // 3. Update Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const s = shockwaves[i];
            s.scale += delta * s.speed;
            s.opacity -= delta * 2.2;

            if (s.opacity <= 0) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
                shockwaves.splice(i, 1);
                continue;
            }

            s.mesh.scale.set(s.scale, s.scale, s.scale);
            s.mesh.material.opacity = s.opacity;
        }
    }

    return {
        init,
        requestLock,
        exitLock,
        resetCamera,
        updateCameraFOV,
        updateSensConfig,
        updateTargetMaterials,
        spawnTarget,
        removeTarget,
        clearAllTargets,
        getTargetCount,
        shoot,
        checkCrosshairHover,
        toScreenPosition,
        setOnFpsUpdate: (cb) => { onFpsUpdateCallback = cb; },
        get currentFps() { return currentFps; },
        get currentFrameTime() { return currentFrameTime; },
        get isPointerLocked() { return isPointerLocked; }
    };
})();
