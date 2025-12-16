import React, { useState } from 'react';
import { Hand, MousePointer2, HelpCircle, Activity } from 'lucide-react';
import { ParticleShape, HandData } from '../types';

interface UIOverlayProps {
  hasStarted: boolean;
  onStart: () => void;
  currentShape: ParticleShape;
  onManualShapeChange: (shape: ParticleShape) => void;
  handData: HandData;
  interactionMode: 'mouse' | 'camera';
  videoRef: React.RefObject<HTMLVideoElement>;
}

const SHAPES_CONFIG = {
  [ParticleShape.SPHERE]: { label: 'Sphere', gesture: '1 Finger / Default' },
  [ParticleShape.FLOWER]: { label: 'Flower', gesture: '2 Fingers' },
  [ParticleShape.SATURN]: { label: 'Saturn', gesture: '3 Fingers' },
  [ParticleShape.HEART]: { label: 'Heart', gesture: '4 Fingers' },
  [ParticleShape.FIREWORKS]: { label: 'Burst', gesture: '5 Fingers (Open)' },
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  hasStarted,
  onStart,
  currentShape,
  onManualShapeChange,
  handData,
  interactionMode,
  videoRef
}) => {
  const [showHelp, setShowHelp] = useState(false);

  if (!hasStarted) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 text-white backdrop-blur-sm">
        <div className="text-center max-w-md p-6 border border-cyan-500/30 rounded-2xl bg-gray-900/50 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
          <h1 className="text-5xl font-bold mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            NEBULA
          </h1>
          <p className="text-gray-400 mb-8 tracking-widest text-sm">INTERACTIVE PARTICLE SYSTEM</p>
          
          <div className="space-y-4 mb-8 text-left text-sm text-gray-300 bg-black/40 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Hand className="w-5 h-5 text-cyan-400" />
              <span>Use hand gestures to morph shapes</span>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-purple-400" />
              <span>Pinch to attract particles & modulate sound</span>
            </div>
            <div className="flex items-center gap-3">
              <MousePointer2 className="w-5 h-5 text-gray-400" />
              <span>Mouse fallback available if no camera</span>
            </div>
          </div>

          <button
            onClick={onStart}
            className="group relative px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
          >
            <span className="relative z-10">ENTER EXPERIENCE</span>
            <div className="absolute inset-0 rounded-full bg-cyan-400 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
      {/* Header / HUD */}
      <div className="flex justify-between items-start">
        <div className="pointer-events-auto">
          <h2 className="text-2xl font-bold tracking-tight text-white/80">NEBULA</h2>
          <div className="flex items-center gap-2 mt-2 text-xs font-mono text-cyan-400">
            <span className={`w-2 h-2 rounded-full ${interactionMode === 'camera' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            {interactionMode === 'camera' ? 'VISION SYSTEM ONLINE' : 'MOUSE FALLBACK ACTIVE'}
          </div>
          <div className="mt-1 text-xs text-gray-500 font-mono">
             {interactionMode === 'camera' ? 
               (handData.detected ? `HAND DETECTED [${handData.fingersUp}]` : 'SEARCHING FOR HAND...') 
               : 'MOVE MOUSE TO INTERACT'}
          </div>
          <div className="mt-4 text-4xl font-black text-white/10 uppercase tracking-widest select-none">
            {SHAPES_CONFIG[currentShape].label}
          </div>
        </div>

        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="pointer-events-auto p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <HelpCircle className="w-6 h-6 text-white/70" />
        </button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute top-20 right-6 w-64 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 pointer-events-auto text-sm">
          <h3 className="font-bold text-cyan-400 mb-3 border-b border-white/10 pb-2">CONTROLS</h3>
          <ul className="space-y-3">
            {Object.entries(SHAPES_CONFIG).map(([key, config]) => (
              <li key={key} className="flex justify-between items-center text-gray-300">
                <span>{config.label}</span>
                <span className="text-xs font-mono text-gray-500">{config.gesture}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-gray-400">
            <p className="mb-1"><strong className="text-white">Pinch / Click:</strong> Attract & Sound +</p>
            <p><strong className="text-white">Open / Hover:</strong> Swirl</p>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-end justify-between pointer-events-auto">
        <div className="flex gap-2">
          {Object.entries(SHAPES_CONFIG).map(([shapeKey, config]) => (
            <button
              key={shapeKey}
              onClick={() => onManualShapeChange(shapeKey as ParticleShape)}
              className={`px-4 py-2 rounded-md text-xs font-bold tracking-wider transition-all border ${
                currentShape === shapeKey
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-black/40 border-white/10 text-gray-500 hover:border-white/30'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Camera Preview */}
        <div className={`relative w-32 h-24 bg-black border border-white/20 rounded-lg overflow-hidden transition-opacity duration-500 ${interactionMode === 'camera' ? 'opacity-100' : 'opacity-0'}`}>
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transform -scale-x-100 ${handData.detected ? 'blur-sm opacity-50' : 'opacity-80'}`}
            playsInline
            muted
          />
          {handData.detected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-green-500 rounded-full animate-ping" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};