import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ParticleShape, HandData } from '../types';

interface Nebula3DProps {
  currentShape: ParticleShape;
  handData: HandData;
  interactionMode: 'mouse' | 'camera';
}

const PARTICLE_COUNT = 15000;

export const Nebula3D: React.FC<Nebula3DProps> = ({ currentShape, handData, interactionMode }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const reqIdRef = useRef<number | null>(null);
  
  // Data refs to be accessed inside animation loop
  const shapeRef = useRef<ParticleShape>(currentShape);
  const handDataRef = useRef<HandData>(handData);
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const mouseRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const isMouseDownRef = useRef<boolean>(false);

  // Sync props to refs
  useEffect(() => { shapeRef.current = currentShape; calculateTargetPositions(); }, [currentShape]);
  useEffect(() => { handDataRef.current = handData; }, [handData]);

  // Handle Mouse Fallback
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (interactionMode === 'mouse') {
        // Normalize to -1 to 1
        mouseRef.current = {
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: -(e.clientY / window.innerHeight) * 2 + 1
        };
      }
    };
    const handleMouseDown = () => { if (interactionMode === 'mouse') isMouseDownRef.current = true; };
    const handleMouseUp = () => { if (interactionMode === 'mouse') isMouseDownRef.current = false; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interactionMode]);

  // Calculate Target Positions based on Shape
  const calculateTargetPositions = () => {
    const positions = targetPositionsRef.current;
    const type = shapeRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      let x = 0, y = 0, z = 0;

      switch (type) {
        case ParticleShape.SPHERE: {
          const r = 25 + Math.random() * 2;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
          break;
        }
        case ParticleShape.HEART: {
          // Parametric Heart
          // x = 16sin^3(t)
          // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
          const t = Math.random() * Math.PI * 2;
          const scale = 1.5;
          // Randomize thickness
          const thick = (Math.random() - 0.5) * 5;
          x = scale * (16 * Math.pow(Math.sin(t), 3));
          y = scale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
          z = thick;
          // Rotate slightly to face camera better
          break;
        }
        case ParticleShape.FLOWER: {
          // Rose curve: r = cos(k*theta)
          const k = 4; // Petals
          const theta = Math.random() * Math.PI * 2;
          const rBase = Math.cos(k * theta);
          const r = (15 + Math.abs(rBase) * 20) * (0.8 + Math.random() * 0.4);
          // Convert polar to cartesian
          x = r * Math.cos(theta);
          y = r * Math.sin(theta);
          z = (Math.random() - 0.5) * 10;
          break;
        }
        case ParticleShape.SATURN: {
          const isRing = Math.random() > 0.3;
          if (isRing) {
             const angle = Math.random() * Math.PI * 2;
             const dist = 35 + Math.random() * 15;
             x = dist * Math.cos(angle);
             z = dist * Math.sin(angle);
             y = (Math.random() - 0.5) * 2;
          } else {
             // Central planet
             const r = 12 + Math.random() * 1;
             const theta = Math.random() * Math.PI * 2;
             const phi = Math.acos(2 * Math.random() - 1);
             x = r * Math.sin(phi) * Math.cos(theta);
             y = r * Math.sin(phi) * Math.sin(theta);
             z = r * Math.cos(phi);
          }
          // Tilt saturn
          const tilt = 0.4;
          const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
          const tz = y * Math.sin(tilt) + z * Math.cos(tilt);
          y = ty;
          z = tz;
          break;
        }
        case ParticleShape.FIREWORKS: {
          // Random explosion
          const r = Math.random() * 50;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
          break;
        }
      }
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- INIT THREE.JS ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    // Slight fog for depth
    scene.fog = new THREE.FogExp2(0x050505, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 80;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- PARTICLES ---
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    // Initial random positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      // Base Cyan/Blue/Purple colors
      const color = new THREE.Color();
      color.setHSL(0.5 + Math.random() * 0.2, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // size could be used in custom shader, but standard PointsMaterial doesn't support per-vertex size easily without shader.
    // We'll stick to uniform size for simplicity or use a simple shader if needed. 
    // Standard PointsMaterial is fine for MVP.
    
    geometryRef.current = geometry;
    calculateTargetPositions(); // Init target

    const sprite = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png');

    const material = new THREE.PointsMaterial({
      size: 0.8,
      map: sprite,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      opacity: 0.8
    });
    materialRef.current = material;

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      
      const time = clock.getElapsedTime();
      
      if (particlesRef.current && geometryRef.current) {
        const positions = geometryRef.current.attributes.position.array as Float32Array;
        const target = targetPositionsRef.current;
        const hand = handDataRef.current;
        
        // Determine interaction point (Vector3)
        let ix = 0, iy = 0, iz = 30; // default interaction Z
        let isActive = false;
        let isAttracting = false;

        if (interactionMode === 'camera' && hand.detected) {
          // Map 0-1 to world coords (approximate based on camera FOV and Z)
          // Camera Z is 80. at Z=0, visible height is roughly 2 * 80 * tan(75/2) ~ 120
          const visibleHeight = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
          const visibleWidth = visibleHeight * camera.aspect;

          // hand.handPosition is 0-1. 
          ix = (hand.handPosition.x - 0.5) * visibleWidth;
          iy = -(hand.handPosition.y - 0.5) * visibleHeight; // Flip Y
          
          isActive = true;
          isAttracting = hand.isPinching; // Pinch to attract
        } else if (interactionMode === 'mouse') {
           // Mouse logic
           const vec = new THREE.Vector3(mouseRef.current.x, mouseRef.current.y, 0.5);
           vec.unproject(camera);
           const dir = vec.sub(camera.position).normalize();
           const distance = -camera.position.z / dir.z; // Intersection with Z=0 plane
           const pos = camera.position.clone().add(dir.multiplyScalar(distance));
           ix = pos.x;
           iy = pos.y;
           
           isActive = true;
           isAttracting = isMouseDownRef.current;
        }

        // Lerp speed
        const lerpFactor = 0.05;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          
          // Basic Shape Morphing Lerp
          let tx = target[i3];
          let ty = target[i3 + 1];
          let tz = target[i3 + 2];

          // Noise / Float
          tx += Math.sin(time * 2 + i) * 0.5;
          ty += Math.cos(time * 1.5 + i) * 0.5;

          // Interaction Physics
          if (isActive) {
            const dx = ix - positions[i3];
            const dy = iy - positions[i3 + 1];
            const dz = iz - positions[i3 + 2];
            const distSq = dx*dx + dy*dy + dz*dz;
            const dist = Math.sqrt(distSq);

            if (isAttracting) {
               // Strong attraction (Black hole effect)
               if (dist < 40) {
                 tx = ix + (Math.random()-0.5)*5;
                 ty = iy + (Math.random()-0.5)*5;
                 tz = iz + (Math.random()-0.5)*5;
               }
            } else {
               // Gentle repulsion / Swirl
               if (dist < 25) {
                 const force = (25 - dist) / 25;
                 tx -= dx * force * 2;
                 ty -= dy * force * 2;
                 tz -= dz * force * 2;
               }
            }
          }

          // Update Position
          positions[i3] += (tx - positions[i3]) * lerpFactor;
          positions[i3 + 1] += (ty - positions[i3 + 1]) * lerpFactor;
          positions[i3 + 2] += (tz - positions[i3 + 2]) * lerpFactor;
        }

        geometryRef.current.attributes.position.needsUpdate = true;

        // Global Rotation
        particlesRef.current.rotation.y = time * 0.05;
        particlesRef.current.rotation.z = time * 0.02;
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- RESIZE ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [interactionMode]); // Re-init if interaction mode changes drastically? Actually logic handles it inside loop. 
  // We only depend on mounting here. The loop reads refs.

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
};