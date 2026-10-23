import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeCanvasLogin: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    let width = container.clientWidth || 600;
    let height = container.clientHeight || 800;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060e22, 0.045);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 18;
    camera.position.y = 1;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background to blend with CSS gradient
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x0a224a, 2.5);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 5, 50);
    cyanLight.position.set(10, 10, 10);
    scene.add(cyanLight);

    const blueLight = new THREE.PointLight(0x0073c1, 6, 50);
    blueLight.position.set(-10, -10, 8);
    scene.add(blueLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 3.5, 40);
    emeraldLight.position.set(0, -8, -5);
    scene.add(emeraldLight);

    // 3. Central Core: Geometric Floating Polyhedral Sphere (Icosahedron Wireframe & Inner Core)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Outer Wireframe Sphere
    const outerGeo = new THREE.IcosahedronGeometry(4.2, 2);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      roughness: 0.2,
      metalness: 0.8
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerMesh);

    // Inner Glowing Core (Nodes mesh)
    const innerGeo = new THREE.IcosahedronGeometry(2.8, 1);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0073c1,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0a3d78,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.45
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerMesh);

    // 4. Orbital Rings (Planetary / Data Rings)
    const ringGeo1 = new THREE.TorusGeometry(5.8, 0.04, 16, 120);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x5fbeff,
      transparent: true,
      opacity: 0.6
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(6.6, 0.03, 16, 120);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 3;
    coreGroup.add(ring2);

    // 5. Constellation Nodes Particle System (Stars / Floating Data Nodes)
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 5.5 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      particleScales[i] = Math.random() * 0.15 + 0.05;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.14,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particleSystem);

    // 6. Floating Cyber Data Cubes
    const cubesGroup = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0073c1,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });

    const cubeCount = 18;
    const cubes: THREE.Mesh[] = [];
    for (let i = 0; i < cubeCount; i++) {
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      const angle = (i / cubeCount) * Math.PI * 2;
      const dist = 5.8 + (i % 3) * 0.8;
      cube.position.set(
        Math.cos(angle) * dist,
        (Math.sin(angle * 2) * 1.5),
        Math.sin(angle) * dist
      );
      cubes.push(cube);
      cubesGroup.add(cube);
    }
    coreGroup.add(cubesGroup);

    // 7. Mouse Interactivity / Smooth Tilt
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      mouseX = (x - 0.5) * 2;
      mouseY = (y - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 8. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth mouse lerping
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Rotations
      outerMesh.rotation.y = elapsed * 0.12;
      outerMesh.rotation.x = elapsed * 0.08;

      innerMesh.rotation.y = -elapsed * 0.15;
      innerMesh.rotation.z = elapsed * 0.1;

      ring1.rotation.z = elapsed * 0.18;
      ring2.rotation.z = -elapsed * 0.14;

      particleSystem.rotation.y = elapsed * 0.04;
      cubesGroup.rotation.y = elapsed * 0.09;

      // Micro floating cubes animation
      cubes.forEach((cube, i) => {
        cube.rotation.x += 0.02;
        cube.rotation.y += 0.03;
        cube.position.y += Math.sin(elapsed * 2 + i) * 0.003;
      });

      // Camera tilt responding to mouse
      coreGroup.rotation.y = targetX * 0.45;
      coreGroup.rotation.x = -targetY * 0.35;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Clean Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose resources
      outerGeo.dispose();
      outerMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      cubeGeo.dispose();
      cubeMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{ opacity: 0.95 }}
      aria-hidden="true"
    />
  );
};
