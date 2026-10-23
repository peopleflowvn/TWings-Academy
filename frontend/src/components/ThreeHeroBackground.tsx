import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeHeroBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 650;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c142e, 0.018);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 15, 45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0); // Transparent to blend seamlessly with hero gradient
    container.appendChild(renderer.domElement);

    // 2. Wave Mesh Grid (Topological Digital Horizon)
    // 75 columns x 50 rows plane
    const gridCols = 80;
    const gridRows = 55;
    const gridWidth = 140;
    const gridDepth = 95;

    const planeGeo = new THREE.PlaneGeometry(gridWidth, gridDepth, gridCols, gridRows);
    planeGeo.rotateX(-Math.PI / 2.3);
    planeGeo.translate(0, -6, 0);

    // Custom points/lines geometry from vertices
    const originalPositions = planeGeo.attributes.position.clone();

    // Digital Wireframe Mesh
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x0073c1,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending
    });
    const wireMesh = new THREE.Mesh(planeGeo, wireMat);
    scene.add(wireMesh);

    // Subtle Glowing Nodes on the Wave Vertices
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', planeGeo.attributes.position);

    // Create a circular glowing sprite for points
    const createParticleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(95, 190, 255, 1)');
        grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
        grad.addColorStop(0.7, 'rgba(0, 115, 193, 0.25)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const particleTexture = createParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      color: 0x5fbeff,
      size: 0.65,
      map: particleTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const pointsMesh = new THREE.Points(particleGeo, particleMat);
    scene.add(pointsMesh);

    // 3. Floating Ambient Constellation Particles (Cyber dust floating above)
    const floatingCount = 120;
    const floatingPos = new Float32Array(floatingCount * 3);
    const floatingSpeeds = new Float32Array(floatingCount);

    for (let i = 0; i < floatingCount; i++) {
      floatingPos[i * 3] = (Math.random() - 0.5) * 120;
      floatingPos[i * 3 + 1] = Math.random() * 25 - 5;
      floatingPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
      floatingSpeeds[i] = 0.2 + Math.random() * 0.5;
    }

    const floatingGeo = new THREE.BufferGeometry();
    floatingGeo.setAttribute('position', new THREE.BufferAttribute(floatingPos, 3));

    const floatingMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.5,
      map: particleTexture,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const floatingPoints = new THREE.Points(floatingGeo, floatingMat);
    scene.add(floatingPoints);

    // 4. Subtle Interactivity: Mouse Parallax Lerping
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 15;

    const handleMouseMove = (event: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.015;
      mouseY = (event.clientY - windowHalfY) * 0.01;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 5. Responsive Resize with ResizeObserver
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || 650;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 6. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera motion
      targetCameraX = mouseX * 0.7;
      targetCameraY = 15 - mouseY * 0.4;
      camera.position.x += (targetCameraX - camera.position.x) * 0.03;
      camera.position.y += (targetCameraY - camera.position.y) * 0.03;
      camera.lookAt(0, -2, 0);

      // Undulating Wave Animation
      const posAttr = planeGeo.attributes.position as THREE.BufferAttribute;
      const origPos = originalPositions;
      const vertexCount = posAttr.count;

      for (let i = 0; i < vertexCount; i++) {
        const u = origPos.getX(i);
        const v = origPos.getY(i);

        // Sinusoidal dual frequency wave equation
        const zWave =
          Math.sin(u * 0.08 + elapsed * 1.1) * 2.2 +
          Math.cos(v * 0.09 + elapsed * 0.9) * 2.0 +
          Math.sin((u + v) * 0.05 + elapsed * 0.7) * 1.5;

        posAttr.setZ(i, origPos.getZ(i) + zWave);
      }
      posAttr.needsUpdate = true;

      // Floating dust particles gentle upward drift
      const floatArr = floatingGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < floatingCount; i++) {
        floatArr[i * 3 + 1] += Math.sin(elapsed * 0.8 + i) * 0.018;
        floatArr[i * 3] += Math.cos(elapsed * 0.5 + i) * 0.012;
      }
      floatingGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resource Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Memory disposal
      planeGeo.dispose();
      wireMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      floatingGeo.dispose();
      floatingMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{ opacity: 0.85 }}
      aria-hidden="true"
    />
  );
};
