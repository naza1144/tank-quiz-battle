class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmMuted: boolean = false;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private bgmGain: GainNode | null = null;
  private bgmIntensity: 'NORMAL' | 'CRITICAL_HP' | 'PANIC' = 'NORMAL';

  constructor() {
    if (typeof window !== 'undefined') {
      // Try immediate auto-start
      setTimeout(() => {
        this.initContext();
        this.startBgm();
      }, 100);

      // Instant unblock on any user gesture across the whole page
      const triggerAutoplay = () => {
        if (!this.isMuted && !this.isBgmMuted) {
          this.initContext();
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          if (!this.bgmTimer) {
            this.startBgm();
          }
        }
      };

      const events = ['click', 'pointerdown', 'touchstart', 'touchend', 'keydown', 'mousedown', 'focus'];
      events.forEach(evt => {
        window.addEventListener(evt, triggerAutoplay, { passive: true });
        document.addEventListener(evt, triggerAutoplay, { passive: true });
      });
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleBgm(): boolean {
    this.isBgmMuted = !this.isBgmMuted;
    if (this.isBgmMuted) {
      this.stopBgm();
    } else if (!this.isMuted) {
      this.startBgm();
    }
    return !this.isBgmMuted;
  }

  public isBgmActive(): boolean {
    return !this.isBgmMuted && !this.isMuted;
  }

  // --- DYNAMIC ADAPTIVE 8-BIT BGM ENGINE ---
  // Modulates tempo, pitch, and arpeggios based on HP & Round Timer (Normal -> Critical HP -> Panic)
  public updateGameStateAudio(hp: number, maxHp: number, roundTimeRemaining: number) {
    let nextIntensity: 'NORMAL' | 'CRITICAL_HP' | 'PANIC' = 'NORMAL';

    if (roundTimeRemaining > 0 && roundTimeRemaining <= 35) {
      nextIntensity = 'PANIC'; // 🚨 Final 35 seconds countdown!
    } else if (hp === 1 && maxHp > 1) {
      nextIntensity = 'CRITICAL_HP'; // 💔 1 HP left - Danger mode!
    } else {
      nextIntensity = 'NORMAL';
    }

    if (nextIntensity !== this.bgmIntensity) {
      this.bgmIntensity = nextIntensity;
      if (this.bgmTimer) {
        this.stopBgm();
        this.startBgm();
      }
    }

    if (!this.bgmTimer && !this.isMuted && !this.isBgmMuted && roundTimeRemaining > 0) {
      this.startBgm();
    }
  }

  public startBgm() {
    if (this.isMuted || this.isBgmMuted || this.bgmTimer) return;
    this.initContext();
    if (!this.ctx) return;

    // Create master BGM gain node
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.bgmGain.connect(this.ctx.destination);

    // Chiptune melody notes (C4, D4, E4, G4, A4, C5, Bb4, etc.)
    const baseMelody = [
      261.63, 0, 329.63, 392.00, 523.25, 0, 392.00, 329.63,
      293.66, 0, 349.23, 440.00, 587.33, 0, 440.00, 349.23,
      329.63, 0, 392.00, 493.88, 659.25, 0, 493.88, 392.00,
      466.16, 440.00, 392.00, 349.23, 293.66, 329.63, 349.23, 392.00
    ];

    const baseBass = [
      130.81, 130.81, 130.81, 130.81, 146.83, 146.83, 146.83, 146.83,
      164.81, 164.81, 164.81, 164.81, 174.61, 174.61, 196.00, 196.00
    ];

    // Pitch multiplier based on intensity
    const pitchMultiplier = this.bgmIntensity === 'PANIC' ? 1.122 : 1.0; // +2 semitones in Panic mode!
    const melody = baseMelody.map(freq => freq * pitchMultiplier);
    const bass = baseBass.map(freq => freq * pitchMultiplier);

    // Adaptive Tempo: Normal ~107 BPM (140ms), Critical ~136 BPM (110ms), Panic ~166 BPM (90ms)
    const stepDuration = 
      this.bgmIntensity === 'PANIC' ? 90 : 
      this.bgmIntensity === 'CRITICAL_HP' ? 110 : 
      140;

    const tick = () => {
      if (!this.ctx || this.isMuted || this.isBgmMuted) {
        this.stopBgm();
        return;
      }

      const now = this.ctx.currentTime;
      const stepDurSec = stepDuration / 1000;
      const mNote = melody[this.bgmStep % melody.length];
      const bNote = bass[Math.floor(this.bgmStep / 2) % bass.length];

      // 1. Lead Chiptune Square Wave
      if (mNote > 0 && this.bgmGain) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(mNote, now);

        g.gain.setValueAtTime(0.06, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + stepDurSec * 0.8);

        osc.connect(g);
        g.connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + stepDurSec * 0.8);
      }

      // 2. Triangle Wave Bassline
      if (this.bgmStep % 2 === 0 && this.bgmGain) {
        const bOsc = this.ctx.createOscillator();
        const bG = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bNote, now);

        bG.gain.setValueAtTime(0.09, now);
        bG.gain.exponentialRampToValueAtTime(0.01, now + stepDurSec * 1.6);

        bOsc.connect(bG);
        bG.connect(this.bgmGain);
        bOsc.start(now);
        bOsc.stop(now + stepDurSec * 1.6);
      }

      // 3. Fast High-Intensity Arpeggiator (Critical HP & Panic Mode)
      if (this.bgmIntensity !== 'NORMAL' && this.bgmGain) {
        const arpNotes = [mNote * 1.5, mNote * 2, mNote * 2.5];
        const arpNote = arpNotes[this.bgmStep % arpNotes.length];
        if (arpNote > 0) {
          const arpOsc = this.ctx.createOscillator();
          const arpG = this.ctx.createGain();
          arpOsc.type = 'sawtooth';
          arpOsc.frequency.setValueAtTime(arpNote, now);
          arpG.gain.setValueAtTime(0.02, now);
          arpG.gain.exponentialRampToValueAtTime(0.001, now + stepDurSec * 0.5);
          arpOsc.connect(arpG);
          arpG.connect(this.bgmGain);
          arpOsc.start(now);
          arpOsc.stop(now + stepDurSec * 0.5);
        }
      }

      // 4. 8-bit Noise Hi-Hat & Snare Percussion (Accelerated in Panic)
      if (this.bgmGain) {
        if (this.bgmIntensity === 'PANIC') {
          // Double-time frantic snare & hi-hats
          if (this.bgmStep % 2 === 0) {
            this.playNoisePercussion(now, this.bgmStep % 4 === 2);
          }
        } else {
          if (this.bgmStep % 4 === 2 || this.bgmStep % 8 === 6) {
            this.playNoisePercussion(now, this.bgmStep % 8 === 6);
          }
        }
      }

      this.bgmStep++;
    };

    this.bgmTimer = window.setInterval(tick, stepDuration);
  }

  public stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playNoisePercussion(time: number, isSnare: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const bufferSize = this.ctx.sampleRate * (isSnare ? 0.05 : 0.02);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isSnare ? 'bandpass' : 'highpass';
    filter.frequency.value = isSnare ? 1000 : 5000;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(isSnare ? 0.04 : 0.02, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + (isSnare ? 0.05 : 0.02));

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + (isSnare ? 0.05 : 0.02));
  }

  // --- 8-BIT RETRO SOUND EFFECTS ---

  // 1. Arcade Button / Menu Select Blip
  public playSelect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1760, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // 2. Arcade Game Start / Coin Insert
  public playStart() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [987.77, 1318.51]; // B5, E6 (Classic Nintendo Coin Sound)
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.07);

      gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.07 + (i === 1 ? 0.35 : 0.07));

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + i * 0.07);
      osc.stop(this.ctx!.currentTime + i * 0.07 + (i === 1 ? 0.35 : 0.07));
    });
  }

  // 3. Tank Shooting (Retro Square Wave Frequency Slide)
  public playShoot() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // 4. Brick / Steel Hit (Arcade Impact)
  public playHit(isSteel: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isSteel ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(isSteel ? 900 : 250, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isSteel ? 450 : 60, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // 5. Tank Explosion (Classic 8-bit Noise Rumble)
  public playExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // White noise explosion
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.4);
  }

  // 6. Quiz Correct (8-bit Level-Up Fanfare)
  public playQuizCorrect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.07);

      gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.07 + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + i * 0.07);
      osc.stop(this.ctx!.currentTime + i * 0.07 + 0.14);
    });
  }

  // 7. Quiz Wrong (8-bit Descending Buzzer)
  public playQuizWrong() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.setValueAtTime(110, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // 8. No Ammo Click
  public playNoAmmo() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // 9. Countdown Tick (Chiptune Ping)
  public playCountdownTick(isFinal: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isFinal ? 1200 : 700, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // 10. Vote Blip
  public playVote() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // 11. Victory / Game Over Fanfare
  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 523.25];
    const durations = [0.12, 0.12, 0.12, 0.22, 0.12, 0.4];
    let time = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time);
      osc.stop(time + durations[i]);

      time += durations[i];
    });
  }
}

export const soundFx = new RetroSoundEngine();
