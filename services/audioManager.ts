export class AudioManager {
  private ctx: AudioContext | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private isInitialized = false;

  constructor() {}

  async initialize() {
    if (this.isInitialized) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Setup Drone
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 55; // A1 (Low Drone)

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 100; // Start muffled
    this.droneFilter.Q.value = 1;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.1; // Start quiet

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);

    this.droneOsc.start();
    this.isInitialized = true;
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateInteraction(intensity: number) {
    if (!this.ctx || !this.droneFilter || !this.droneGain || !this.droneOsc) return;

    const now = this.ctx.currentTime;
    
    // Map intensity (0-1) to audio params
    // Intensity increases with pinch (close) or active movement
    const targetFreq = 100 + (intensity * 800); // Filter opens up
    const targetGain = 0.1 + (intensity * 0.2); // Volume increases slightly
    const targetPitch = 55 + (intensity * 5); // Pitch bends slightly

    this.droneFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.droneGain.gain.setTargetAtTime(targetGain, now, 0.1);
    this.droneOsc.frequency.setTargetAtTime(targetPitch, now, 0.2);
  }

  playShapeChangeSound() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 200;
    bandpass.Q.value = 0.5;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.0;

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);

    // Automation: "Whoosh"
    noise.start(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);

    bandpass.frequency.setValueAtTime(200, now);
    bandpass.frequency.exponentialRampToValueAtTime(1000, now + 1.0);

    noise.stop(now + 2.0);
  }

  dispose() {
    if (this.droneOsc) this.droneOsc.stop();
    if (this.ctx) this.ctx.close();
    this.isInitialized = false;
  }
}