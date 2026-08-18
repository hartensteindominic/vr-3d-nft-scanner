/* ============================================================
   NEXUS NFT v2 — Three.js ambient 3D background
   Particle nebula + floating wireframe primitives + mouse/scroll
   parallax. Degrades gracefully if WebGL or the CDN is missing.
   ============================================================ */
(function initThreeBackground() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas || typeof THREE === 'undefined') {
        if (canvas) canvas.style.display = 'none';
        return;
    }

    try {
        const isMobile = window.innerWidth < 768;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x07070f, 1);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x07070f, 0.028);
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
        camera.position.set(0, 2, 18);

        scene.add(new THREE.AmbientLight(0x222244, 0.6));
        const keyLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
        keyLight.position.set(5, 10, 5);
        scene.add(keyLight);
        const purpleLight = new THREE.PointLight(0xa855f7, 1.5, 30);
        purpleLight.position.set(-5, -2, 5);
        scene.add(purpleLight);
        const magentaLight = new THREE.PointLight(0xff00e5, 0.9, 22);
        magentaLight.position.set(8, -3, -5);
        scene.add(magentaLight);

        /* ---- Particle nebula ---- */
        const particleCount = isMobile ? 900 : 2200;
        const pGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(particleCount * 3);
        const col = new Float32Array(particleCount * 3);
        const palette = [[0, 0.94, 1], [0.66, 0.33, 0.97], [1, 0, 0.9]];
        for (let i = 0; i < particleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 46;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 34;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 46;
            const c = palette[Math.floor(Math.random() * 3)];
            col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
            size: 0.06, vertexColors: true, transparent: true, opacity: 0.7,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        scene.add(particles);

        /* ---- Floating wireframe primitives ---- */
        const geoms = [
            new THREE.IcosahedronGeometry(1.2, 1),
            new THREE.TorusKnotGeometry(0.7, 0.25, 100, 16),
            new THREE.OctahedronGeometry(1.1, 0),
            new THREE.TorusGeometry(1.0, 0.3, 16, 50),
            new THREE.DodecahedronGeometry(1.0, 0),
            new THREE.TorusKnotGeometry(0.5, 0.18, 80, 8, 2, 3),
        ];
        const paletteHex = [0x00f0ff, 0xa855f7, 0xff00e5];
        const shapes = [];
        for (let i = 0; i < geoms.length; i++) {
            const hex = paletteHex[i % 3];
            const mesh = new THREE.Mesh(geoms[i], new THREE.MeshPhongMaterial({
                color: hex, wireframe: true, transparent: true,
                opacity: 0.22 + Math.random() * 0.1, emissive: hex, emissiveIntensity: 0.12,
            }));
            mesh.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 20);
            mesh.scale.setScalar(Math.random() * 0.8 + 0.4);
            mesh.userData = {
                rx: (Math.random() - 0.5) * 0.01,
                ry: (Math.random() - 0.5) * 0.015,
                rz: (Math.random() - 0.5) * 0.008,
                floatSpeed: Math.random() * 0.005 + 0.002,
                floatAmp: Math.random() * 0.8 + 0.3,
                initialY: mesh.position.y,
                initialX: mesh.position.x,
                orbitSpeed: Math.random() * 0.004 + 0.001,
                orbitRadius: Math.random() * 4 + 2,
                orbitAngle: Math.random() * Math.PI * 2,
            };
            scene.add(mesh);
            shapes.push(mesh);
        }

        /* ---- Central holo core ---- */
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 32, 32),
            new THREE.MeshPhongMaterial({ color: 0x00f0ff, emissive: 0x00aacc, emissiveIntensity: 0.6, transparent: true, opacity: 0.14, wireframe: true })
        );
        core.position.set(0, 0, -5);
        scene.add(core);

        /* ---- Interaction state ---- */
        let mouseX = 0, mouseY = 0, scrollRatio = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        }, { passive: true });
        window.addEventListener('scroll', () => {
            const max = document.body.scrollHeight - window.innerHeight;
            scrollRatio = max > 0 ? window.scrollY / max : 0;
        }, { passive: true });

        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            particles.rotation.y += 0.0004;
            particles.rotation.x += 0.0002;

            shapes.forEach((s) => {
                const u = s.userData;
                s.rotation.x += u.rx; s.rotation.y += u.ry; s.rotation.z += u.rz;
                s.position.y = u.initialY + Math.sin(t * u.floatSpeed * 10 + u.orbitAngle) * u.floatAmp;
                s.position.x = u.initialX + Math.cos(t * u.orbitSpeed + u.orbitAngle) * u.orbitRadius * 0.3;
            });
            core.rotation.x += 0.005; core.rotation.y += 0.008;
            core.scale.setScalar(1 + Math.sin(t * 0.5) * 0.2);

            camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
            camera.position.y += (mouseY * 1.5 + 2 - scrollRatio * 4 - camera.position.y) * 0.02;
            camera.lookAt(0, 0, -2);

            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    } catch (err) {
        canvas.style.display = 'none';
        console.warn('3D background disabled:', err);
    }
})();
