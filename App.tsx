import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Nebula3D } from './components/Nebula3D';
import { UIOverlay } from './components/UIOverlay';
import { HandTracker } from './services/handTracker';
import { AudioManager } from './services/audioManager';
import { HandData, ParticleShape } from './types';

// Gesture Buffer to prevent flickering
const GESTURE_BUFFER_SIZE = 15;

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'mouse' | 'camera'>('mouse');
  const [currentShape, setCurrentShape] = useState<ParticleShape>(ParticleShape.SPHERE);
  const [handData, setHandData] = useState<HandData>({
    fingersUp: 0,
    isPinching: false,
    pinchDistance: 1,
    handPosition: { x: 0.5, y: 0.5 },
    detected: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);
  
  // Buffering for stability
  const gestureBufferRef = useRef<number[]>([]);

  const handleStart = async () => {
    setHasStarted(true);

    // Init Audio
    const audio = new AudioManager();
    await audio.initialize();
    audioManagerRef.current = audio;

    // Init Vision if possible
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Small delay to allow UI to render the video element if it wasn't there (though it is in DOM)
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission first
        if (videoRef.current) {
          const tracker = new HandTracker(videoRef.current, onHandResults);
          handTrackerRef.current = tracker;
          await tracker.initialize();
          setInteractionMode('camera');
        }
      } catch (err) {
        console.warn("Camera permission denied or error, falling back to mouse.", err);
        setInteractionMode('mouse');
      }
    }
  };

  const onHandResults = useCallback((data: HandData) => {
    setHandData(data);
    
    if (data.detected) {
      // Gesture Recognition Logic
      // Add count to buffer
      const buffer = gestureBufferRef.current;
      buffer.push(data.fingersUp);
      if (buffer.length > GESTURE_BUFFER_SIZE) buffer.shift();

      // Check consensus
      const counts: Record<number, number> = {};
      buffer.forEach(n => counts[n] = (counts[n] || 0) + 1);
      
      const consensus = Object.entries(counts).find(([_, count]) => count > GESTURE_BUFFER_SIZE * 0.8);
      
      if (consensus) {
        const fingers = parseInt(consensus[0]);
        let newShape = currentShape;

        // Logic Mapping
        // 0 or 1 finger: usually default or tracking pointer, let's keep current or default to sphere
        // But the requirement says: 2->Flower, 3->Saturn, 4->Heart, 5->Fireworks
        if (fingers === 2) newShape = ParticleShape.FLOWER;
        else if (fingers === 3) newShape = ParticleShape.SATURN;
        else if (fingers === 4) newShape = ParticleShape.HEART;
        else if (fingers === 5) newShape = ParticleShape.FIREWORKS;
        
        // Only update if changed
        if (newShape !== currentShape) {
          // Verify it's a valid change vs currentShape (React state access inside callback might be stale if not careful, 
          // but we are using the functional update in effect or a ref. 
          // To simplify, we'll just check against the state setter if we used functional update, 
          // but here we are in a callback created once (or deps).
          // Let's use a ref for currentShape tracking inside this callback or just let React handle it.
          changeShape(newShape);
        }
      }

      // Update Audio based on pinch
      // Invert pinch distance for intensity (close = high intensity)
      // Normalize: Pinch distance usually 0 to 0.5
      let intensity = 0;
      if (data.isPinching) {
          intensity = 1.0; 
      } else {
          // Map distance 0.05 -> 0.3 to 1 -> 0
          const dist = Math.min(Math.max(data.pinchDistance, 0.05), 0.3);
          intensity = 1 - ((dist - 0.05) / 0.25);
      }
      audioManagerRef.current?.updateInteraction(intensity);
    } else {
        // If hand lost, maybe decay audio?
        audioManagerRef.current?.updateInteraction(0);
    }
  }, [currentShape]);

  // Wrapper to handle shape change side effects
  const changeShape = (shape: ParticleShape) => {
    setCurrentShape(prev => {
        if (prev !== shape) {
            audioManagerRef.current?.playShapeChangeSound();
            gestureBufferRef.current = []; // Reset buffer on change to prevent bouncing
            return shape;
        }
        return prev;
    });
  };

  // Mouse fallback audio modulation
  useEffect(() => {
    if (interactionMode === 'mouse') {
        const handleMouseDown = () => audioManagerRef.current?.updateInteraction(1);
        const handleMouseUp = () => audioManagerRef.current?.updateInteraction(0);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }
  }, [interactionMode]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans selection:bg-cyan-500/30">
      <Nebula3D 
        currentShape={currentShape} 
        handData={handData}
        interactionMode={interactionMode}
      />
      
      <UIOverlay 
        hasStarted={hasStarted}
        onStart={handleStart}
        currentShape={currentShape}
        onManualShapeChange={changeShape}
        handData={handData}
        interactionMode={interactionMode}
        videoRef={videoRef}
      />
    </div>
  );
};

export default App;