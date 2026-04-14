import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Visualizer = ({ analyser, state }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Particle System
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 2; // Radius

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x8b5cf6, // Default purple
        size: 0.05,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.8,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 5;

    // Animation Loop
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    
    const animate = () => {
        requestAnimationFrame(animate);

        // State-based rotations
        if (state === 'Thinking') {
            particles.rotation.y += 0.05;
            particles.rotation.z += 0.02;
            material.color.setHex(0xeab308); // Yellow/Orange
        } else if (state === 'Speaking') {
            particles.rotation.y += 0.01;
            material.color.setHex(0x8b5cf6); // Purple
        } else if (state === 'Listening') {
            particles.rotation.y += 0.005;
            material.color.setHex(0x3b82f6); // Blue
        } else {
            particles.rotation.y += 0.002; // Idle
            material.color.setHex(0xa855f7);
        }

        // Audio reactivity
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const boost = 1 + average / 64;

            const posAttr = geometry.attributes.position;
            for (let i = 0; i < particleCount; i++) {
                const ix = i * 3;
                const iy = i * 3 + 1;
                const iz = i * 3 + 2;

                // Modulate position based on original and audio boost
                const freqValue = dataArray[i % 128] / 255;
                const scale = 1 + freqValue * (average / 50);
                
                posAttr.array[ix] = originalPositions[ix] * scale;
                posAttr.array[iy] = originalPositions[iy] * scale;
                posAttr.array[iz] = originalPositions[iz] * scale;
            }
            posAttr.needsUpdate = true;
            
            // Pulse overall scale
            particles.scale.setScalar(0.8 + (average / 150));
        }

        renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        mountRef.current?.removeChild(renderer.domElement);
    };
  }, [analyser, state]);

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none" />;
};

export default Visualizer;
