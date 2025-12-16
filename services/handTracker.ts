import { HandData } from "../types";

// Types for MediaPipe globals which are loaded via script tags
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export class HandTracker {
  private hands: any;
  private camera: any;
  private onResultsCallback: (data: HandData) => void;
  private videoElement: HTMLVideoElement;
  private lastShapeConfidence = 0;
  private detectedShapeBuffer: number[] = [];

  constructor(videoElement: HTMLVideoElement, onResults: (data: HandData) => void) {
    this.videoElement = videoElement;
    this.onResultsCallback = onResults;
  }

  async initialize() {
    if (!window.Hands) {
      console.error("MediaPipe Hands not loaded");
      return;
    }

    this.hands = new window.Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    this.hands.onResults(this.processResults.bind(this));

    if (window.Camera) {
      this.camera = new window.Camera(this.videoElement, {
        onFrame: async () => {
          await this.hands.send({ image: this.videoElement });
        },
        width: 640,
        height: 480,
      });
      await this.camera.start();
    }
  }

  private processResults(results: any) {
    let data: HandData = {
      fingersUp: 0,
      isPinching: false,
      pinchDistance: 1,
      handPosition: { x: 0.5, y: 0.5 },
      detected: false,
    };

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      data.detected = true;

      // Calculate Fingers Up
      // Thumb: Check x difference for simplicity relative to wrist/MCP depending on hand, 
      // but simple Tip vs IP joint x check works for broad gestures if hand is upright.
      // Better: Check if tip is higher (y check) than lower joints for 4 fingers.
      // Thumb is trickier. We'll use a vector check or simple distance check.
      
      const fingers = [false, false, false, false, false];
      
      // Thumb (4) vs IP (3)
      // Check if thumb tip is extended away from palm. 
      // Simple heuristic: distance from wrist (0) to tip (4) > distance from wrist to IP (3)
      // Actually for gestures, simple y check is often not enough for thumb.
      // We will assume "Up" means extended.
      
      // Simple logic:
      // Index (8), Middle (12), Ring (16), Pinky (20)
      // If Tip.y < PIP.y (Top is 0 in screen coords), finger is up.
      
      if (landmarks[8].y < landmarks[6].y) fingers[1] = true; // Index
      if (landmarks[12].y < landmarks[10].y) fingers[2] = true; // Middle
      if (landmarks[16].y < landmarks[14].y) fingers[3] = true; // Ring
      if (landmarks[20].y < landmarks[18].y) fingers[4] = true; // Pinky
      
      // Thumb: check if x distance from pivot is significant? 
      // Let's rely on simple X check if hand is roughly vertical.
      // If Tip x is further from Pinky MCP x than Thumb IP x... a bit complex.
      // Simpler: Check distance between Tip (4) and Index Base (5). If far, open.
      const thumbTip = landmarks[4];
      const indexBase = landmarks[5];
      const thumbDist = Math.hypot(thumbTip.x - indexBase.x, thumbTip.y - indexBase.y);
      if (thumbDist > 0.05) fingers[0] = true;

      data.fingersUp = fingers.filter(f => f).length;

      // Hand Position (Index Tip)
      data.handPosition = {
        x: 1 - landmarks[8].x, // Mirror x
        y: landmarks[8].y
      };

      // Pinch Detection (Thumb Tip 4 and Index Tip 8)
      const pinchDist = Math.hypot(landmarks[8].x - landmarks[4].x, landmarks[8].y - landmarks[4].y);
      data.pinchDistance = pinchDist;
      data.isPinching = pinchDist < 0.05; // Threshold
    }

    this.onResultsCallback(data);
  }

  stop() {
    if (this.camera) {
      // Camera utils doesn't have a clean stop in some versions, but we can stop the video element
      const stream = this.videoElement.srcObject as MediaStream;
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
    }
    if (this.hands) {
      this.hands.close();
    }
  }
}