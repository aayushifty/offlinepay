/**
 * OfflinePay — Trinity Sci-Pitch 2026 Presentation Engine
 * Slide-by-Slide Tailored 3D Storytelling & High-Chroma Visuals
 * 1. Vault Database (Layers, Glowing Core, Ingress Packets, Shield Lock)
 * 2. Network Grid (Central Hub, Glowing Nodes, Visibly Severed Red Links)
 * 3. Two Phones (Crisp QR, Readable Screens, Cyan Wave, Signal Break -> Stored Offline)
 * 4. Sync Radar (Rotating Rings, Identifiable Devices, Packets, Interrupted Node)
 * 5. Floating Transaction Cards (Recognizable Cards, Visible Symbols, Deliberate Fan-Out)
 */

// Sound Synthesizer via Web Audio API
class SoundFx {
  constructor() {
    this.muted = false;
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.videoChains = new WeakMap();
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });

    // SFX bus: master gain -> soft limiter -> speakers. Overlapping tones can never clip.
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    this.master.connect(limiter);
    limiter.connect(this.ctx.destination);

    // Shared 1s white-noise buffer for whooshes and air textures
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (_) {}
    }
    return !!this.ctx && this.ctx.state === 'running';
  }

  ready() {
    if (this.muted) return false;
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  // One soft bell-like voice: smooth attack, exponential decay, gentle lowpass, stereo placement
  voice(freq, { type = 'sine', when = 0, attack = 0.006, decay = 0.35, gain = 0.12, pan = 0, cutoff = 6000, glideTo = null } = {}) {
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + decay * 0.8);
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.5;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(gain, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(filter);
    filter.connect(amp);
    let out = amp;
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      amp.connect(panner);
      out = panner;
    }
    out.connect(this.master);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  // Bell = fundamental + quiet octave partial, so chimes sound glassy instead of beepy
  bell(freq, opts = {}) {
    this.voice(freq, opts);
    this.voice(freq * 2, { ...opts, gain: (opts.gain || 0.12) * 0.22, decay: (opts.decay || 0.35) * 0.6 });
  }

  // Filtered-noise sweep: the "air" of a slide moving past
  whoosh({ when = 0, duration = 0.32, from = 600, to = 3200, gain = 0.05 } = {}) {
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + duration);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(gain, t + duration * 0.35);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  // Back-compat helper for any legacy callers
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.08) {
    if (!this.ready()) return;
    try { this.voice(freq, { type, decay: duration, gain: gainVal }); } catch (e) {}
  }

  slideChange() {
    if (!this.ready()) return;
    try {
      this.whoosh({ duration: 0.28, from: 500, to: 2600, gain: 0.035 });
      this.bell(659.25, { when: 0.02, decay: 0.32, gain: 0.07, pan: -0.15 });  // E5
      this.bell(987.77, { when: 0.09, decay: 0.45, gain: 0.06, pan: 0.15 });   // B5
    } catch (e) {}
  }

  verifySuccess() {
    if (!this.ready()) return;
    try {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {   // C major arpeggio
        this.bell(f, { when: i * 0.07, decay: 0.5 + i * 0.1, gain: 0.08, pan: -0.3 + i * 0.2 });
      });
    } catch (e) {}
  }

  dangerAlert() {
    if (!this.ready()) return;
    try {
      this.voice(330, { type: 'triangle', decay: 0.28, gain: 0.11, cutoff: 1400 });
      this.voice(247, { type: 'triangle', when: 0.16, decay: 0.4, gain: 0.11, cutoff: 1200 });
    } catch (e) {}
  }

  beamLaser() {
    if (!this.ready()) return;
    try {
      this.voice(1400, { type: 'sine', decay: 0.34, gain: 0.07, glideTo: 280 });
      this.whoosh({ duration: 0.36, from: 4000, to: 700, gain: 0.03 });
    } catch (e) {}
  }

  panelOpen() {
    if (!this.ready()) return;
    try {
      this.voice(440, { type: 'sine', decay: 0.18, gain: 0.06, glideTo: 660 });
      this.whoosh({ duration: 0.2, from: 800, to: 2400, gain: 0.02 });
    } catch (e) {}
  }

  panelClose() {
    if (!this.ready()) return;
    try {
      this.voice(660, { type: 'sine', decay: 0.18, gain: 0.05, glideTo: 420 });
    } catch (e) {}
  }

  clapConfirm() {
    if (!this.ready()) return;
    try {
      this.voice(1760, { type: 'sine', decay: 0.05, gain: 0.05 });
      this.bell(783.99, { when: 0.04, decay: 0.3, gain: 0.07 });   // G5
      this.bell(1174.66, { when: 0.1, decay: 0.42, gain: 0.06 });  // D6
    } catch (e) {}
  }

  click() {
    if (!this.ready()) return;
    try { this.voice(1800, { type: 'sine', decay: 0.04, gain: 0.04 }); } catch (e) {}
  }

  // Voice-clarity chain for interview/voiceover clips:
  // rumble cut -> mud cut -> presence lift -> air -> gentle compressor -> makeup -> brickwall limiter.
  // Only attaches when the AudioContext is actually running, because once a <video> is routed
  // through WebAudio it is silent while the context is suspended.
  async attachVideo(vid) {
    if (!vid) return null;
    const existing = this.videoChains.get(vid);
    if (existing) return existing;
    if (!(await this.resume())) return null;
    try {
      const ctx = this.ctx;
      const src = ctx.createMediaElementSource(vid);
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass'; highpass.frequency.value = 85; highpass.Q.value = 0.7;
      const mud = ctx.createBiquadFilter();
      mud.type = 'peaking'; mud.frequency.value = 280; mud.Q.value = 1.0; mud.gain.value = -3;
      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking'; presence.frequency.value = 3000; presence.Q.value = 0.9; presence.gain.value = 3.5;
      const air = ctx.createBiquadFilter();
      air.type = 'highshelf'; air.frequency.value = 8000; air.gain.value = 1.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -22; comp.knee.value = 10; comp.ratio.value = 3;
      comp.attack.value = 0.005; comp.release.value = 0.18;
      const makeup = ctx.createGain();
      makeup.gain.value = 1.35;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1.5; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.001; limiter.release.value = 0.08;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;

      src.connect(highpass);
      highpass.connect(mud);
      mud.connect(presence);
      presence.connect(air);
      air.connect(comp);
      comp.connect(makeup);
      makeup.connect(limiter);
      limiter.connect(analyser);
      analyser.connect(ctx.destination);

      const chain = { analyser, bins: new Uint8Array(analyser.frequencyBinCount) };
      this.videoChains.set(vid, chain);
      return chain;
    } catch (e) {
      console.warn('Voice chain unavailable, using native playback:', e);
      return null;
    }
  }
}

const sfx = new SoundFx();

// Procedural Equirectangular Studio Environment Map for High-Gloss Color Reflections
function createStudioEnvMap(renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep Midnight Studio Horizon
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0.0, '#060911');
  bgGrad.addColorStop(0.5, '#0d1527');
  bgGrad.addColorStop(1.0, '#04070e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Softbox 1: Electric Cyan Overhead Studio Light
  const cyanGrad = ctx.createRadialGradient(250, 160, 10, 250, 160, 220);
  cyanGrad.addColorStop(0, 'rgba(0, 240, 255, 0.95)');
  cyanGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.4)');
  cyanGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = cyanGrad;
  ctx.fillRect(0, 0, 500, 320);

  // Softbox 2: Cyber Emerald Key Softbox
  const emGrad = ctx.createRadialGradient(780, 200, 10, 780, 200, 240);
  emGrad.addColorStop(0, 'rgba(16, 185, 129, 0.95)');
  emGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.4)');
  emGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = emGrad;
  ctx.fillRect(520, 0, 504, 400);

  // Softbox 3: 24K Gold Rim Strip (for warm specular sheen on coins and keys)
  const goldGrad = ctx.createLinearGradient(0, 380, 1024, 380);
  goldGrad.addColorStop(0.2, 'rgba(251, 191, 36, 0)');
  goldGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.85)');
  goldGrad.addColorStop(0.8, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 340, 1024, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  pmremGenerator.dispose();
  return envMap;
}

// ─────────────────────────────────────────────────────────────
// Texture Helper: Phone Screens (Slide 3)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// High-Context 2D Texture Generators for 3D Shaders
// ─────────────────────────────────────────────────────────────

// Slide 1: Hero Offline Digital Wallet Screen
function createHeroWalletTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Background Fintech Navy/Emerald Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 2048);
  bg.addColorStop(0, '#04271c');
  bg.addColorStop(0.5, '#071624');
  bg.addColorStop(1, '#020b14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 2048);

  // Status Bar
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('09:41', 80, 80);
  ctx.fillText('⚡ OFFLINE MODE • SECURE', 500, 80);

  // Header Brand Bar
  const hGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  hGrad.addColorStop(0, '#059669');
  hGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 110, 1024, 180);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('OfflinePay Wallet', 80, 225);

  // Status Badge Pill
  ctx.fillStyle = '#022c1d';
  ctx.beginPath();
  ctx.roundRect(80, 320, 520, 72, 20);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('⚡ 100% OFFLINE VAULT', 110, 370);

  // Main Balance Card
  ctx.fillStyle = '#0c2e22';
  ctx.beginPath();
  ctx.roundRect(70, 420, 884, 380, 40);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '42px sans-serif';
  ctx.fillText('Available Offline Balance', 120, 510);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 125px sans-serif';
  ctx.fillText('Rs 2,500.00', 120, 670);

  ctx.fillStyle = '#34d399';
  ctx.font = '34px monospace';
  ctx.fillText('eSewa • Khalti Vault Reserve', 120, 740);

  // High-Contrast Bright QR Container
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(142, 840, 740, 740, 48);
  ctx.fill();
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 14;
  ctx.stroke();

  // QR Code Matrix
  ctx.fillStyle = '#021810';
  const cellSize = 60;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 === 0 || (r < 3 && c < 3) || (r < 3 && c > 6) || (r > 6 && c < 3)) {
        ctx.fillRect(212 + c * cellSize, 910 + r * cellSize, cellSize - 8, cellSize - 8);
      }
    }
  }

  // Laser Scanner Beam across QR
  ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.fillRect(160, 1190, 704, 32);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(160, 1202, 704, 8);

  // Bottom Cryptographic Seal Button
  const btnGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  btnGrad.addColorStop(0, '#059669');
  btnGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(100, 1640, 824, 180, 50);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HARDWARE SEALED • READY TO PAY', 512, 1750);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// 3D Embossed Golden Rupee Coin Face
function createRupeeCoinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Radial Gold Background
  const radial = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
  radial.addColorStop(0, '#fef08a');
  radial.addColorStop(0.5, '#f59e0b');
  radial.addColorStop(1, '#92400e');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 512, 512);

  // Outer Serrated Coin Edge
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 235, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 256, 215, 0, Math.PI * 2);
  ctx.stroke();

  // Embossed 'Rs' Currency Symbol
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 220px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Rs', 256, 260);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Rs', 252, 256);

  // Edge Text
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('• OFFLINEPAY • 2026 •', 256, 430);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 2: Floating "NO CELL SIGNAL ❌" Warning Sign
function createWarningSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark High-Contrast Cyber-Obsidian Card Background
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, 0, 1024, 512);

  // Deep Crimson Header Banner
  const headGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  headGrad.addColorStop(0, '#7f1d1d');
  headGrad.addColorStop(0.5, '#991b1b');
  headGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = headGrad;
  ctx.fillRect(0, 0, 1024, 90);

  // Red Hazard Status Pill
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.roundRect(40, 24, 340, 44, 22);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('● CONNECTION FAILED', 65, 54);

  // Inner Card Container
  ctx.fillStyle = '#0b1322';
  ctx.beginPath();
  ctx.roundRect(30, 115, 964, 365, 24);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Strikethrough Signal Bars Icon (Clean & High Contrast)
  const barX = 75;
  const barY = 320;
  // Bar 1 (dead)
  ctx.fillStyle = '#334155';
  ctx.fillRect(barX, barY - 40, 22, 40);
  // Bar 2 (dead)
  ctx.fillRect(barX + 32, barY - 70, 22, 70);
  // Bar 3 (dead)
  ctx.fillRect(barX + 64, barY - 105, 22, 105);
  // Bar 4 (dead)
  ctx.fillRect(barX + 96, barY - 145, 22, 145);

  // Bright Red Diagonal Slash
  ctx.strokeStyle = '#ff0055';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(barX - 10, barY + 10);
  ctx.lineTo(barX + 130, barY - 160);
  ctx.stroke();

  // Bold Warning Text (Crisp Pure White)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('NO CELL SIGNAL', 245, 205);

  // Error Code Badge
  ctx.fillStyle = '#fee2e2';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('⚠️ SERVER UNREACHABLE (TIMEOUT)', 245, 275);

  // Explanation line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '32px sans-serif';
  ctx.fillText('Standard digital wallets spin & abort', 245, 345);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('⚡ OfflinePay Vault solves this air-gap', 245, 410);

  // Card Outer Neon Border
  ctx.strokeStyle = '#ff0055';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 1012, 500);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 4: Countertop QR Standee for Bazaar Shop Stall
function createQRStandeeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  // White Acrylic Standee
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 768);

  // Emerald Top Brand Header
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, 512, 160);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OfflinePay', 256, 75);

  ctx.font = 'bold 24px monospace';
  ctx.fillText('OFFLINE MERCHANT STAND', 256, 125);

  // Subheader
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('SCAN TO PAY OFFLINE', 256, 215);

  // QR Code
  ctx.fillStyle = '#022c1d';
  const cSize = 34;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0 || (r < 2 && c < 2) || (r < 2 && c > 5) || (r > 5 && c < 2)) {
        ctx.fillRect(120 + c * cSize, 260 + r * cSize, cSize - 4, cSize - 4);
      }
    }
  }

  // Merchant Name & Wallets Accepted
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Himalayan Tea Stall #04', 256, 610);

  ctx.fillStyle = '#64748b';
  ctx.font = '22px sans-serif';
  ctx.fillText('Accepts eSewa • Khalti • Zero Internet', 256, 660);

  ctx.textAlign = 'start';
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 8: Verified Prototype Checkmark Screen for Finale
// Slide 7: Revenue Model HUD & Stream Textures
function createRevenueHUDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1024, 512);
  bg.addColorStop(0, '#04271c');
  bg.addColorStop(0.5, '#061a29');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 480, 36);
  ctx.fill();

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 38px monospace';
  ctx.fillText('💰 OFFLINEPAY MONETIZATION MATRIX', 60, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('3 Sustainable Revenue Streams', 60, 160);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '34px monospace';
  ctx.fillText('• Stream 1: Wallet Recovery Splits (Rs. 0.10–0.25 / Txn)', 60, 235);
  ctx.fillText('• Stream 2: High-Volume Merchant Subs (Rs. 200–500 / Mo)', 60, 300);
  ctx.fillText('• Stream 3: Commercial Bank SDK Annual Software License', 60, 365);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('✔ 85%+ GROSS PROFIT MARGIN • ZERO SERVER AT CHECKOUT', 60, 440);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function createRevenueStreamTexture(streamNum, title, rate, subtitle, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#091220';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 240, 24);
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(streamNum + ': ' + title, 256, 55);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(rate, 256, 125);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px sans-serif';
  ctx.fillText(subtitle, 256, 175);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('● HIGH MARGIN • SCALABLE', 256, 215);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function createCheckmarkScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Deep Emerald/Cyan Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 2048);
  bg.addColorStop(0, '#04271c');
  bg.addColorStop(0.5, '#032030');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 2048);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TRINITY INTERNATIONAL COLLEGE', 512, 160);
  ctx.fillText('SCI-PITCH 2026 • +2 SCIENCE', 512, 230);

  // Giant Glowing Emerald Circle with Checkmark
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(512, 680, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 20;
  ctx.stroke();

  // White Bold Checkmark (✔)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 42;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(380, 680);
  ctx.lineTo(470, 780);
  ctx.lineTo(650, 560);
  ctx.stroke();

  // Title Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('PROTOTYPE VERIFIED', 512, 1100);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('LIVE DEMO IN HAND', 512, 1200);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '38px monospace';
  ctx.fillText('• Standalone Android APK', 512, 1340);
  ctx.fillText('• iOS WebCrypto PWA', 512, 1420);
  ctx.fillText('• Embedded Wallet SDK Ready', 512, 1500);

  // Launch Button
  const btnGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  btnGrad.addColorStop(0, '#10b981');
  btnGrad.addColorStop(1, '#00f0ff');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(112, 1660, 800, 180, 50);
  ctx.fill();

  ctx.fillStyle = '#03140e';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('READY FOR PILOT 🚀', 512, 1775);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// 3D Map Pin Helper
function create3DMapPin(colorHex) {
  const pinGroup = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 20),
    new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.2 })
  );
  head.position.y = 0.42;
  pinGroup.add(head);
  addNeonEdges(head, 0xffffff, 2);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.45, 16),
    new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.2 })
  );
  cone.rotation.x = Math.PI;
  cone.position.y = 0.2;
  pinGroup.add(cone);
  addNeonEdges(cone, 0xffffff, 2);

  return pinGroup;
}

// Slide 4: Bus Amber LED Route Marquee Texture
function createBusMarqueeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BUS 104 • RATNAPARK ➔ LAGANKHEL', 256, 52);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('⚡ TAP TO PAY OFFLINE • ZERO NET', 256, 96);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 4: Bazaar Stall Neon Overhead Signboard
function createBazaarBannerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 512, 0);
  bg.addColorStop(0, '#042f2e');
  bg.addColorStop(1, '#064e3b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☕ HIMALAYAN TEA KIOSK', 256, 52);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('OFFLINEPAY ACCEPTED HERE', 256, 94);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 4: Floating Air-Gap Commerce Grid HUD
function createEcosystemHUDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 20);
  ctx.fill();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('📍 AIR-GAP COMMERCE GRID', 256, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('P2P Optical Mesh Active', 256, 92);

  ctx.fillStyle = '#10b981';
  ctx.font = '22px monospace';
  ctx.fillText('● 100% Signal-Independent', 256, 130);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 5: Cryptography Security Dashboard Hologram
function createCryptoHologramTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1024, 512);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(0.6, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 480, 36);
  ctx.fill();

  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = '#c084fc';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('🔐 HARDWARE SECURITY SEAL (ON-DEVICE)', 60, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('Uncopyable Digital Signature Seal', 60, 160);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '36px monospace';
  ctx.fillText('• Sequential Numbered Receipt: Check #101 ➔ #102', 60, 235);
  ctx.fillText('• Anti-Duplicate Safeguard: Duplicate Checks Rejected', 60, 300);
  ctx.fillText('• Daily Offline Limit: Capped at Rs. 2,000 Reserve', 60, 365);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('✔ TAMPER-PROOF HARDWARE SEAL • ZERO DOUBLE-SPENDING', 60, 440);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 6: Financial Metric Pillar Badges
function createEconBadgeTexture(year, title, stat, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 236, 24);
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(year, 256, 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(stat, 256, 130);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(title, 256, 185);

  ctx.fillStyle = colorHex;
  ctx.font = '22px monospace';
  ctx.fillText('● Zero Hardware Capex', 256, 220);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 7: Disaster Emergency HUD Texture
function createDisasterHUDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1024, 512);
  bg.addColorStop(0, '#022c22');
  bg.addColorStop(0.5, '#071f30');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 480, 36);
  ctx.fill();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('🚨 DISASTER PROTOCOL: ACTIVE (EARTHQUAKE / FLOOD)', 60, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('Aegis Financial Resilience Grid', 60, 160);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '36px sans-serif';
  ctx.fillText('• Telecom Grid: DOWN ❌ • Cellular Data: 0 Bars', 60, 235);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('• OfflinePay: 100% OPERATIONAL ✔ (Zero Interruption)', 60, 300);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '34px sans-serif';
  ctx.fillText('• Essential rations, emergency clinics & supplies continue', 60, 365);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('🛡️ PROTECTING 30M+ CITIZENS IN CRITICAL DEAD ZONES', 60, 440);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Active Pitch Deck Slides (Strictly 7 Slides for Trinity Sci-Pitch)
const SLIDES = [
  // ── Slide 1: The Problem (real user testimonials) ──────
  {
    id: 'live-problem',
    kicker: 'Slide 1 • The Problem',
    kickerType: 'danger',
    title: 'When the Signal Drops, <span class="highlight-danger">Payments Die</span>',
    subtitle: 'Real eSewa, Khalti &amp; mobile-banking users, in their own words',
    videoSrc: 'problem-live.mp4',
    bullets: [
      { icon: '📡', text: 'Signal Dead Zones', glow: 'glow-red' },
      { icon: '⏳', text: 'Endless Payment Timeouts', glow: 'glow-orange' },
      { icon: '🛑', text: 'Checkout Lines Freeze', glow: 'glow-rose' },
      { icon: '💵', text: 'Forced Back to Cash', glow: 'glow-amber' }
    ],
    prompter: {
      pitchScript: `"Good morning, judges. Raise your hand if a digital payment has ever just… spun. And spun. Don't tell me. Let them tell you. These are real eSewa, Khalti and mobile-banking users. Different apps, same story: the signal drops, the payment dies, and everyone goes back to cash. That's the problem we solved."`,
      technicalHighlight: `Every wallet today needs a live internet connection for every single payment: customer, server, merchant. Break any link and the payment fails. Different apps, one shared weak point: the network.`,
      demoCue: `Stop talking and let the testimonials play with sound. Make eye contact with the judges while users speak. Resume only when the clip ends.`,
      anticipatedQA: [
        { q: 'Who are the people in the video?', a: 'Real users of different payment apps (eSewa, Khalti and bank apps) we interviewed ourselves. Unscripted. We wanted to show the problem isn\'t one app. It\'s every app that depends on signal.' },
        { q: 'Won\'t 5G and better networks fix this anyway?', a: 'Signal doesn\'t go through concrete basements, steel buses or mountain valleys. Better networks shrink dead zones; they never remove them. And in a crowd at a festival, even full bars get jammed.' },
        { q: 'How big is this problem really?', a: 'Every failed payment is a sale that falls back to cash or doesn\'t happen at all. Ask anyone in this room: it has happened to you. Our pilot goal is to measure exactly how often, at real shops.' }
      ]
    }
  },

  // ── Slide 2: The Solution (10-second protocol video) ─
  {
    id: 'solution',
    kicker: 'Slide 2 • The Solution',
    kickerType: 'normal',
    title: 'Pay With <span class="highlight-green">Zero Bars</span>',
    subtitle: 'Phone to phone. No internet at checkout.',
    videoSrc: 'solution-demo.mp4',
    bullets: [
      { icon: '🤝', text: 'Scan. Seal. Done.', glow: 'glow-green' },
      { icon: '⚡', text: 'Instant Proof for the Merchant', glow: 'glow-cyan' },
      { icon: '🔄', text: 'Auto-Syncs When Back Online', glow: 'glow-green' }
    ],
    prompter: {
      pitchScript: `"So we asked: what if the payment didn't need the internet at all? Watch. The customer scans the merchant's QR. Their phone creates a sealed digital voucher, like a signed cheque. The merchant's phone checks the seal on the spot. Two seconds. Zero bars. When either phone gets signal again, it settles automatically with eSewa or Khalti."`,
      technicalHighlight: `No server is needed at the moment of payment. The customer's phone signs the voucher with a key locked in its security chip; the merchant's phone verifies that signature locally. Settlement happens later, in the background.`,
      demoCue: `Let the 10-second video play. Point at the three chips as they happen: Scan → Sealed Voucher → Auto-Sync.`,
      anticipatedQA: [
        { q: 'Does the merchant need new hardware?', a: 'No. Just the phone they already have. Camera to scan, screen to show the QR. Zero extra cost.' },
        { q: 'What if the merchant stays offline for days?', a: 'The sealed vouchers stay safely stored on their phone and settle the moment it connects, whether that\'s Wi-Fi tonight or signal next week.' },
        { q: 'How does the money actually move if nobody is online?', a: 'At checkout, nothing moves yet. It\'s a signed promise, like a cheque. The real transfer happens when a phone reconnects. Our safety rules on the next slide make sure that promise is always good.' }
      ]
    }
  },

  // ── Slide 3: Security, explained simply ─────────
  {
    id: 'architecture',
    kicker: 'Slide 3 • Security',
    kickerType: 'purple',
    title: 'Money You <span class="highlight-cyan">Can\'t Copy</span>',
    subtitle: 'Bank-grade security, explained like a checkbook',
    bullets: [
      { icon: '🔏', text: 'A Hardware Seal on Every Payment', glow: 'glow-cyan' },
      { icon: '🔢', text: 'Serial-Numbered. Never Reusable.', glow: 'glow-purple' },
      { icon: '🛡️', text: 'Rs. 2,000 Daily Offline Cap', glow: 'glow-cyan' }
    ],
    actionBtn: { text: '🔐 Verify Security Seals [Space]', fn: 'verifyHashChain' },
    prompter: {
      pitchScript: `"Now you're thinking: can't someone just copy that voucher and spend it twice? Think of a checkbook. Every payment carries a seal that only that phone's security chip can make, and a serial number: cheque 101, 102, 103. Reuse 101, and it's rejected instantly. And offline spending is capped at two thousand rupees a day, so the worst case is always small."`,
      technicalHighlight: `Three locks: (1) a signing key that never leaves the phone's secure hardware, (2) a counter that only goes up, so every voucher number is used once, (3) a daily offline limit that caps any possible loss.`,
      demoCue: `Press [Space] to fire "Verify Security Seals". Point at the chained seal tokens on the right as they light up.`,
      anticipatedQA: [
        { q: 'What if someone hacks or roots their phone?', a: 'The signing key lives inside the phone\'s secure hardware chip, the same one that protects fingerprints and Face ID. Even the phone\'s own operating system can\'t read it out.' },
        { q: 'What if I spend the same money on two merchants while offline?', a: 'The duplicate serial number is caught the moment either merchant syncs. The account is flagged and frozen, and because wallets are KYC-verified, we know exactly who did it. With a Rs. 2,000 cap, fraud just isn\'t worth it.' },
        { q: 'What if the customer doesn\'t actually have the money?', a: 'Offline spending comes from a small pre-loaded offline balance, set aside while online. You can\'t spend money you didn\'t reserve.' }
      ]
    }
  },

  // ── Slide 4: Target Users ───────────────
  {
    id: 'target-users',
    kicker: 'Slide 4 • Who It\'s For',
    kickerType: 'normal',
    title: 'Built for Where <span class="highlight-cyan">Signal Fails</span>',
    subtitle: 'High-frequency, small-ticket payments in low-signal places',
    bullets: [
      { icon: '☕', text: 'Tea Stalls &amp; Micro-Merchants', glow: 'glow-green' },
      { icon: '🚌', text: 'Highway Buses &amp; Microbuses', glow: 'glow-cyan' },
      { icon: '🍱', text: 'Canteen &amp; Campus Rush Lines', glow: 'glow-green' }
    ],
    actionBtn: { text: '📍 Explore Ecosystem [Space]', fn: 'scanUserSegments' },
    prompter: {
      pitchScript: `"Who needs this most? The tea stall under a tin roof. The bus driver on the highway, where signal disappears every few kilometres. The school canteen at lunch, where three hundred students hit one weak connection at once. Small payments, huge volume, and that's exactly where today's wallets break."`,
      technicalHighlight: `Same pattern in every segment: many small payments, low or overloaded signal, zero tolerance for waiting. OfflinePay needs nothing but the phones people already carry.`,
      demoCue: `Press [Space] for "Explore Ecosystem". Point at the tea stall and the bus nodes in the 3D scene.`,
      anticipatedQA: [
        { q: 'Why start with buses?', a: 'Buses are dead zones on wheels. Passengers can\'t wait 30 seconds for a timeout while the bus is moving. A two-second offline tap keeps boarding fast.' },
        { q: 'Do small shops pay to use it?', a: 'No. Everyday merchants and users get it free inside the wallet app they already use. Our customers are the wallets and large fleets.' },
        { q: 'Why not start in rural villages?', a: 'Cities have the most payment volume and the most surprise dead zones: basements, crowds, buses. We prove it there first, then expand outward.' }
      ]
    }
  },

  // ── Slide 5: Business Model ──────────────
  {
    id: 'business',
    kicker: 'Slide 5 • Business Model',
    kickerType: 'normal',
    title: 'An Engine, <span class="highlight-green">Not Another Wallet</span>',
    subtitle: 'We plug into the apps Nepal already trusts',
    bullets: [
      { icon: '🧩', text: 'Drop-in SDK for eSewa &amp; Khalti', glow: 'glow-green' },
      { icon: '💰', text: 'Micro-Fee per Offline Settlement', glow: 'glow-cyan' },
      { icon: '📈', text: 'Wallets Win Back Lost Payments', glow: 'glow-green' }
    ],
    actionBtn: { text: '💰 Inspect Economics [Space]', fn: 'inspectEconomics' },
    prompter: {
      pitchScript: `"We are not building another wallet. Nepal doesn't need a new app. It needs the apps it already trusts to stop failing. So OfflinePay is an engine: a small piece of software that eSewa, Khalti or any bank app plugs in. Their users never download anything new. The wallet keeps every payment it used to lose, and we earn a tiny fee on each one."`,
      technicalHighlight: `We never hold anyone's money. Customer funds and regulatory licences stay with the wallet and the bank. We provide the offline technology. That keeps us lightweight and fast to deploy.`,
      demoCue: `Press [Space] for "Inspect Economics". Point at the integration pipeline flowing into the partner hub.`,
      anticipatedQA: [
        { q: 'Why wouldn\'t eSewa just build this themselves?', a: 'They could, but secure offline payments are a hard specialist problem, and their teams are busy running a wallet. Plugging in a tested engine is faster and cheaper than building one from scratch. Banks buy security tech the same way.' },
        { q: 'Is this even allowed by Nepal Rastra Bank?', a: 'Because we never touch customer money, we work under our partner wallet\'s existing licence. Our path is to pilot together with a licensed partner, inside the central bank\'s rules, before any wider launch.' },
        { q: 'What if wallets say no?', a: 'Then we go to the next one. Every wallet loses the same failed payments, and the first to fix it gets an edge over the rest.' }
      ]
    }
  },

  // ── Slide 6: Market Comparison ───────────────────────────
  {
    id: 'comparison',
    kicker: 'Slide 6 • Why We Win',
    kickerType: 'cyan',
    title: 'Cash Reliability. <span class="highlight-cyan">Digital Brains.</span>',
    subtitle: 'The only option that works with zero bars and keeps the records',
    bullets: [],
    matrix: {
      columns: ['Physical Cash', 'Cloud Wallets', 'OfflinePay'],
      rows: [
        { label: 'Works with zero signal', cells: [['green', '✔ Always'], ['red', '✖ Fails'], ['green', '✔ Always']] },
        { label: 'Automatic records', cells: [['red', '✖ None'], ['green', '✔ Yes'], ['green', '✔ Yes']] },
        { label: 'Checkout speed', cells: [['cyan', 'Counting change'], ['red', 'Spins & times out'], ['green', '⚡ ~2 seconds']] },
        { label: 'Theft &amp; loss risk', cells: [['red', '✖ High'], ['green', '✔ Low'], ['green', '✔ Low, capped']] },
        { label: 'Extra hardware', cells: [['cyan', 'None'], ['cyan', 'None'], ['green', '✔ None']], highlight: true }
      ]
    },
    actionBtn: { text: '🛡️ Display Resilience [Space]', fn: 'displayImpact' },
    prompter: {
      pitchScript: `"Here's the whole market on one screen. Cash works everywhere, but leaves no records and can be lost or stolen. Cloud wallets keep perfect records, until the signal drops. OfflinePay is the only column that's green all the way down: the reliability of cash, with the brains of a digital wallet."`,
      technicalHighlight: `Offline when it has to be, online when it can be. Payments happen locally and instantly; records sync to the central ledger automatically once connected.`,
      demoCue: `Run your finger down the OfflinePay column. Pause on "Works with zero signal". Press [Space] for the resilience shield.`,
      anticipatedQA: [
        { q: 'What about card machines?', a: 'Card machines need a SIM or a phone line to approve a payment, so they fail in exactly the same dead zones. And most small shops in Nepal don\'t have one.' },
        { q: 'Are there competitors doing offline payments?', a: 'Some countries are experimenting with offline digital money, which tells us the idea is real. In Nepal, no major wallet offers it yet. We want to be the engine that brings it here first.' },
        { q: 'What stops a big company copying you?', a: 'Speed and focus. We\'re building one thing, offline payments, and the first wallet partnership gives us real-world data and trust that a copycat starts without.' }
      ]
    }
  },

  // ── Slide 7: Revenue Model ─────────────────────────────────
  {
    id: 'revenue',
    kicker: 'Slide 7 • Revenue Model',
    kickerType: 'normal',
    title: 'Three Ways <span class="highlight-green">We Get Paid</span>',
    subtitle: 'Users pay nothing extra. Partners earn back what they lose.',
    bullets: [
      { icon: '💸', text: 'Wallet Fee Split · Rs. 0.10–0.25 / Payment', glow: 'glow-green' },
      { icon: '🏪', text: 'Fleet &amp; Canteen Plans · Rs. 200–500 / Month', glow: 'glow-cyan' },
      { icon: '🏦', text: 'Bank SDK Licences · Annual', glow: 'glow-green' }
    ],
    actionBtn: { text: '💰 Ignite Revenue Streams [Space]', fn: 'igniteRevenue' },
    prompter: {
      pitchScript: `"How do we make money? Three ways. One: wallets share ten to twenty-five paisa on every offline payment we rescue, money they'd otherwise lose completely. Two: bus fleets and canteens pay a small monthly plan for their dashboard. Three: banks license our engine every year. Users pay nothing. Our ask today: help us land our first pilot partner. Thank you."`,
      technicalHighlight: `Payments are checked on the phones, not on our servers, so each transaction costs us almost nothing to run. We only process the later sync. That's what makes software margins possible.`,
      demoCue: `Press [Space] to "Ignite Revenue Streams". Deliver the ask slowly, then hold eye contact and stop talking.`,
      anticipatedQA: [
        { q: 'Why would wallets share their fee with you?', a: 'Because without us, that failed payment earns them zero, and the customer pays cash instead. Giving us a few paisa on a payment they\'d have lost is pure profit for them.' },
        { q: 'Will small shops be forced to pay a subscription?', a: 'Never. Small shops use the free tier inside their wallet. Paid plans are only for big operators like bus fleets and canteens that want settlement dashboards.' },
        { q: 'What are your next steps and what do you need?', a: 'Finish the working prototype, run a pilot with one canteen and one bus route to measure real failure rates, and use that data to sign our first wallet partner. We need mentorship and an introduction to a wallet or bank.' },
        { q: 'Are your margins realistic?', a: 'Our costs are low because the phones do the security work, not our servers. The exact margin we\'ll prove in the pilot. We\'d rather show you real numbers than promise big ones.' }
      ]
    }
  }
];

// Helper to add razor-sharp, radiant neon edge outlines on solid 3D geometries
function addNeonEdges(mesh, colorHex, linewidth = 2) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: colorHex, linewidth }));
  mesh.add(line);
  return line;
}

class PresentationApp {
  constructor() {
    this.currentSlideIndex = 0;
    this.totalSlides = SLIDES.length;
    this.container = document.getElementById('canvas-container');
    this.startTime = Date.now();
    this.isPrompterOpen = false;

    // Real-Time Clap Navigation System
    this.isClapNavActive = false;
    this.clapAudioCtx = null;
    this.clapStream = null;
    this.clapProcessor = null;
    this.clapRafId = null;
    this.lastClapTimestamp = 0;

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Camera settings
    this.targetCamera = { x: 0, y: 0.3, z: 6.2 };
    this.targetLookAt = { x: 0.9, y: 0, z: 0 };
    this.currentLookAt = { x: 0.9, y: 0, z: 0 };

    // 3D Objects
    this.stars = null;
    this.slideObjects = [];

    // Mouse / Touch Orbit
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.orbitYaw = 0;
    this.orbitPitch = 0;

    this.initThree();
    this.createStarfield();
    this.createMotes();
    this.buildSlideScenes();
    this.sceneEnterTime = performance.now();
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    this.needsVideoClear = false;
    this.bindEvents();
    this.updateResponsiveLayout();
    this.renderSlideUI(0);
    this.startTimer();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0.3, 6.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    if (THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    this.container.appendChild(this.renderer.domElement);

    // Apply Studio Environment Map for High-Gloss Color Reflections
    const envMap = createStudioEnvMap(this.renderer);
    this.scene.environment = envMap;

    // ─────────────────────────────────────────────────────────────
    // Sculpted Studio Lighting Rig: strong key, coloured rims, low ambient
    // so metal and glass pick up crisp specular highlights instead of looking flat.
    // ─────────────────────────────────────────────────────────────
    const sky = new THREE.HemisphereLight(0xbfe9ff, 0x1a1033, 0.85);
    this.scene.add(sky);

    const whiteKey = new THREE.DirectionalLight(0xffffff, 3.2);
    whiteKey.position.set(4, 6, 5);
    this.scene.add(whiteKey);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 2.6);
    cyanRim.position.set(-5, 3, 2);
    this.scene.add(cyanRim);

    const emeraldFill = new THREE.DirectionalLight(0x00ff88, 1.6);
    emeraldFill.position.set(2, -4, 4);
    this.scene.add(emeraldFill);

    const magentaRim = new THREE.DirectionalLight(0xe879f9, 2.8);
    magentaRim.position.set(-2, 3, -5);
    this.scene.add(magentaRim);

    // Moving specular "sweep" light: glides across the model so highlights shimmer
    this.sweepLight = new THREE.PointLight(0xffffff, 2.2, 12, 1.6);
    this.sweepLight.position.set(1.8, 1.5, 3.2);
    this.scene.add(this.sweepLight);

    const amberPoint = new THREE.PointLight(0xfbbf24, 2.0, 25);
    amberPoint.position.set(1.85, -0.6, 3.5);
    this.scene.add(amberPoint);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);
  }

  // Soft round glow sprite so particles render as crisp dots, not squares
  createGlowSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Light motes drifting upward around the 3D model
  createMotes() {
    const count = 160;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [[0.0, 0.94, 1.0], [0.06, 0.9, 0.55], [1.0, 0.78, 0.25], [0.9, 0.55, 1.0]];
    this.moteSeeds = [];
    for (let i = 0; i < count; i++) {
      const r = 1.2 + Math.random() * 1.6;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = Math.sin(a) * r;
      const c = palette[i % palette.length];
      colors.set(c, i * 3);
      this.moteSeeds.push({ speed: 0.12 + Math.random() * 0.25, sway: Math.random() * Math.PI * 2 });
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.07,
      map: this.glowSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.motes = new THREE.Points(geometry, material);
    this.scene.add(this.motes);
  }

  createStarfield() {
    const starCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 45;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 45;

      const r = Math.random();
      if (r > 0.75) {
        colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0;
      } else if (r > 0.5) {
        colors[i * 3] = 0.2; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.4;
      } else if (r > 0.25) {
        colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.4; colors[i * 3 + 2] = 0.95;
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.2;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.glowSprite = this.createGlowSprite();
    const material = new THREE.PointsMaterial({
      size: 0.09,
      map: this.glowSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  buildSlideScenes() {
    const OBJ_X = 1.95; // Perfectly centered in the right 50% stage area

    this.allSceneGroups = {};

    const createGroup = (id) => {
      const grp = new THREE.Group();
      grp.position.set(OBJ_X, 0, 0);
      grp.visible = false;
      this.scene.add(grp);
      this.allSceneGroups[id] = grp;
      return grp;
    };

    const gIdea = createGroup('idea');
    const gProblem = createGroup('problem');
    const gLiveProblem = createGroup('live-problem');
    const gSolution = createGroup('solution');
    const gTargetUsers = createGroup('target-users');
    const gScience = createGroup('science');
    const gBusiness = createGroup('business');
    const gBenefits = createGroup('benefits');
    const gConclusion = createGroup('conclusion');

    this.allSceneGroups['live-problem'] = gLiveProblem;
    this.allSceneGroups['solution'] = gSolution;
    this.allSceneGroups['architecture'] = gScience;
    this.allSceneGroups['science'] = gScience;
    this.allSceneGroups['target-users'] = gTargetUsers;
    this.allSceneGroups['business'] = gBusiness;
    this.allSceneGroups['comparison'] = gBenefits;
    this.allSceneGroups['benefits'] = gBenefits;
    this.allSceneGroups['revenue'] = gConclusion;
    this.allSceneGroups['vision'] = gConclusion;
    this.allSceneGroups['conclusion'] = gConclusion;
    this.allSceneGroups['idea'] = gIdea;
    this.allSceneGroups['problem'] = gProblem;

    this.slideObjects = SLIDES.map(s => this.allSceneGroups[s.id] || createGroup(s.id));

    // ─────────────────────────────────────────────────────────────
    // Slide: Hero Offline Digital Wallet Smartphone & 3D Gold Coin (Centered, Magnified & Radiant)
    // ─────────────────────────────────────────────────────────────
    const g0 = gIdea;
    const heroPhoneGroup = new THREE.Group();
    g0.add(heroPhoneGroup);

    // Sleek Obsidian Smartphone Chassis
    const phoneBodyGeom = new THREE.BoxGeometry(1.60, 3.20, 0.16);
    const phoneBodyMat = new THREE.MeshStandardMaterial({
      color: 0x09141f,
      metalness: 0.90,
      roughness: 0.15,
      emissive: 0x004d40,
      emissiveIntensity: 0.35
    });
    const phoneBody = new THREE.Mesh(phoneBodyGeom, phoneBodyMat);
    heroPhoneGroup.add(phoneBody);
    addNeonEdges(phoneBody, 0x00f0ff, 3); // Radiant Cyan Bezel
    addNeonEdges(phoneBody, 0x10b981, 2); // Emerald Inner Chamfer

    // Screen with Authentic Digital Wallet UI (Front & Back for continuous 360° visibility)
    const screenGeom = new THREE.PlaneGeometry(1.50, 3.06);
    const screenMat = new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() });
    
    // Front Screen
    const screen = new THREE.Mesh(screenGeom, screenMat);
    screen.position.z = 0.082;
    phoneBody.add(screen);

    // Back Screen (Facing outwards)
    const screenBack = new THREE.Mesh(screenGeom, screenMat);
    screenBack.position.z = -0.082;
    screenBack.rotation.y = Math.PI;
    phoneBody.add(screenBack);

    // Thick 3D Golden Rupee Coin Floating & Spinning Beside Phone
    const coinGeom = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 48);
    const coinTex = createRupeeCoinTexture();
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
      metalness: 0.95,
      roughness: 0.15,
      map: coinTex
    });
    const heroCoin = new THREE.Mesh(coinGeom, coinMat);
    heroCoin.rotation.x = Math.PI / 2;
    heroCoin.position.set(-0.85, 0.15, 0.35);
    heroPhoneGroup.add(heroCoin);
    addNeonEdges(heroCoin, 0xfde047, 2);

    // 3D Security Padlock Floating at Top-Right
    const lockGroup = new THREE.Group();
    const lockBodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.34, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.0, metalness: 0.8, roughness: 0.15 })
    );
    lockGroup.add(lockBodyMesh);
    addNeonEdges(lockBodyMesh, 0xffffff, 2);

    const shackle = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.045, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
    );
    shackle.position.y = 0.17;
    lockGroup.add(shackle);

    lockGroup.position.set(0.85, 1.35, 0.25);
    heroPhoneGroup.add(lockGroup);

    // Radiant Glowing Orbital Energy Rings
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.5,
      roughness: 0.1
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.038, 16, 80), ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    heroPhoneGroup.add(ring1);

    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 3.2,
      roughness: 0.1
    });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.032, 16, 80), ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    heroPhoneGroup.add(ring2);

    // Local Glow Lighting for Magnified Presence & Specular Sheen
    const phoneKeyLight = new THREE.PointLight(0x00f0ff, 3.5, 6.0);
    phoneKeyLight.position.set(1.2, 0.5, 1.4);
    heroPhoneGroup.add(phoneKeyLight);

    const coinGoldLight = new THREE.PointLight(0xf59e0b, 4.0, 5.0);
    coinGoldLight.position.set(-1.2, 0.8, 1.4);
    heroPhoneGroup.add(coinGoldLight);

    g0.userData = { heroPhoneGroup, heroCoin, lockGroup, ring1, ring2 };

    // ─────────────────────────────────────────────────────────────
    // Slide: The Telecom Cell Tower in Blackout & Severed Signal Waves
    // ─────────────────────────────────────────────────────────────
    const g1 = gProblem;

    // Main rotating tower assembly
    const towerGroup = new THREE.Group();
    towerGroup.position.set(0.65, -0.15, 0);
    towerGroup.scale.set(0.64, 0.64, 0.64);
    g1.add(towerGroup);

    // 1. Cyber-Concrete Station Foundation Pedestal Base
    const baseSlabGeom = new THREE.CylinderGeometry(1.65, 1.8, 0.22, 6);
    const baseSlabMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x020617
    });
    const baseSlab = new THREE.Mesh(baseSlabGeom, baseSlabMat);
    baseSlab.position.y = -1.55;
    towerGroup.add(baseSlab);
    addNeonEdges(baseSlab, 0xff0044, 2); // Glowing crimson hazard edge

    // 4 Heavy Steel Anchor Footings
    const footMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.15 });
    const footGeom = new THREE.BoxGeometry(0.32, 0.14, 0.32);

    // 2. Structural Steel Mast (4 Tapered Heavy Columns)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.15,
      emissive: 0x0f172a
    });
    const legGeom = new THREE.CylinderGeometry(0.065, 0.085, 3.1, 16);
    const legRadiusBottom = 0.82;
    const legRadiusTop = 0.26;

    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(ang => {
      // Anchor foot
      const foot = new THREE.Mesh(footGeom, footMat);
      foot.position.set(Math.cos(ang) * legRadiusBottom, -1.45, Math.sin(ang) * legRadiusBottom);
      towerGroup.add(foot);
      addNeonEdges(foot, 0x64748b, 1);

      // Tapered column
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(
        Math.cos(ang) * (legRadiusBottom + legRadiusTop) * 0.5,
        0,
        Math.sin(ang) * (legRadiusBottom + legRadiusTop) * 0.5
      );
      leg.rotation.z = Math.sin(ang) * 0.18;
      leg.rotation.x = Math.cos(ang) * -0.18;
      towerGroup.add(leg);
      addNeonEdges(leg, 0x38bdf8, 1);
    });

    // Cross-Girder Rings along mast height
    [-1.0, -0.35, 0.35, 1.0].forEach((y) => {
      const w = 1.35 * (1 - y * 0.18);
      const braceGeom = new THREE.BoxGeometry(w, 0.06, w);
      const brace = new THREE.Mesh(
        braceGeom,
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 })
      );
      brace.position.y = y;
      towerGroup.add(brace);
      addNeonEdges(brace, 0x00f0ff, 2);
    });

    // Lower Telemetry Equipment Deck Platform
    const lowerDeckGeom = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 6);
    const lowerDeckMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const lowerDeck = new THREE.Mesh(lowerDeckGeom, lowerDeckMat);
    lowerDeck.position.y = 1.05;
    towerGroup.add(lowerDeck);
    addNeonEdges(lowerDeck, 0x00f0ff, 2);

    // Backup Battery / Power Module on Base Slab
    const powerRackGeom = new THREE.BoxGeometry(0.7, 0.55, 0.5);
    const powerRackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const powerRack = new THREE.Mesh(powerRackGeom, powerRackMat);
    powerRack.position.set(0, -1.2, 0);
    towerGroup.add(powerRack);
    addNeonEdges(powerRack, 0xff0044, 2);

    // Upper Microwave Transceiver Platform & 4 Dishes
    const upperDeckGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 6);
    const upperDeck = new THREE.Mesh(upperDeckGeom, lowerDeckMat);
    upperDeck.position.y = 1.55;
    towerGroup.add(upperDeck);
    addNeonEdges(upperDeck, 0x00f0ff, 2);

    const dishGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.4,
      roughness: 0.2
    });
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(ang => {
      const dish = new THREE.Mesh(dishGeom, dishMat);
      dish.position.set(Math.cos(ang) * 0.45, 1.72, Math.sin(ang) * 0.45);
      dish.rotation.y = ang + Math.PI / 2;
      dish.rotation.x = 0.15;
      towerGroup.add(dish);
      addNeonEdges(dish, 0xff0044, 2);
    });

    // Tall Antenna Spire with Aircraft Obstruction Warning Beacon
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.045, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95 })
    );
    spire.position.y = 2.15;
    towerGroup.add(spire);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0044 })
    );
    beacon.position.y = 2.68;
    towerGroup.add(beacon);

    // Severed Glitching Sonar Shockwaves
    const waveGroup = new THREE.Group();
    waveGroup.position.y = 2.68;
    towerGroup.add(waveGroup);

    const brokenWaves = [];
    [0.75, 1.25, 1.75].forEach((r, i) => {
      const arcGeom = new THREE.TorusGeometry(r, 0.045, 16, 48);
      const arcMat = new THREE.MeshBasicMaterial({
        color: i === 2 ? 0xff0044 : 0xff3366,
        transparent: true,
        opacity: 0.85
      });
      const arc = new THREE.Mesh(arcGeom, arcMat);
      arc.rotation.x = Math.PI / 2;
      arc.userData = { baseRadius: r, phase: i * 0.33 };
      waveGroup.add(arc);
      brokenWaves.push(arc);
    });

    // 3. Eye-Catching 3D Warning Hologram Signboard (Mounted directly on slide root facing audience with ZERO specular glare)
    const signGeom = new THREE.BoxGeometry(1.80, 0.95, 0.08);
    const signMat = new THREE.MeshBasicMaterial({
      map: createWarningSignTexture()
    });
    const warningSign = new THREE.Mesh(signGeom, signMat);
    warningSign.position.set(-1.45, 0.25, 0.4);
    warningSign.rotation.y = 0.12; // Slightly angled towards center camera
    g1.add(warningSign);
    addNeonEdges(warningSign, 0xff0044, 2);

    g1.userData = { towerGroup, beacon, brokenWaves, warningSign };

    // ─────────────────────────────────────────────────────────────
    // Slide 2: Two Smartphones & Optical Wave
    // ─────────────────────────────────────────────────────────────
    const g2 = gSolution;
    const phoneGeom = new THREE.BoxGeometry(1.28, 2.45, 0.16);

    const phoneAFrame = new THREE.Mesh(phoneGeom, new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0x022c22, roughness: 0.2 }));
    phoneAFrame.position.set(-1.45, 0, 0);
    phoneAFrame.rotation.y = 0.32;
    g2.add(phoneAFrame);
    addNeonEdges(phoneAFrame, 0x00ff88, 3);

    const screenA = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenA.position.z = 0.082;
    phoneAFrame.add(screenA);

    const screenABack = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenABack.position.z = -0.082;
    screenABack.rotation.y = Math.PI;
    phoneAFrame.add(screenABack);

    const phoneBFrame = new THREE.Mesh(phoneGeom, new THREE.MeshStandardMaterial({ color: 0x082f49, emissive: 0x032d42, roughness: 0.2 }));
    phoneBFrame.position.set(1.45, 0, 0);
    phoneBFrame.rotation.y = -0.32;
    g2.add(phoneBFrame);
    addNeonEdges(phoneBFrame, 0x00f0ff, 3);

    const screenB = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenB.position.z = 0.082;
    phoneBFrame.add(screenB);

    const screenBBack = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenBBack.position.z = -0.082;
    screenBBack.rotation.y = Math.PI;
    phoneBFrame.add(screenBBack);

    const waveCoreGeom = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 16);
    const waveCoreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const waveCore = new THREE.Mesh(waveCoreGeom, waveCoreMat);
    waveCore.rotation.z = Math.PI / 2;
    g2.add(waveCore);

    g2.userData = { phoneAFrame, phoneBFrame, waveCore };

    // ─────────────────────────────────────────────────────────────
    // Slide 3: Real Target Ecosystem (Bazaar Shop + City Bus + QR Standee)
    // ─────────────────────────────────────────────────────────────
    const g3 = gTargetUsers;
    const ecoGroup = new THREE.Group();
    ecoGroup.position.set(0, -0.22, 0);
    g3.add(ecoGroup);

    // Floating City Slab / Terrain Base
    const slabGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.24, 48);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.6 });
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.y = -1.1;
    ecoGroup.add(slab);
    addNeonEdges(slab, 0x00f0ff, 2);

    // Concentric Glowing Neon Ground Rings
    const floorRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    floorRing1.rotation.x = Math.PI / 2;
    floorRing1.position.y = -0.96;
    ecoGroup.add(floorRing1);

    const floorRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    floorRing2.rotation.x = Math.PI / 2;
    floorRing2.position.y = -0.96;
    ecoGroup.add(floorRing2);

    // Dark Road Strip with Center Line
    const roadGeom = new THREE.BoxGeometry(4.6, 0.04, 1.25);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.position.set(0, -0.96, 0.6);
    ecoGroup.add(road);
    addNeonEdges(road, 0x38bdf8, 1);

    // 1. Merchant Shop Stall / Tea Kiosk
    const shopGroup = new THREE.Group();
    shopGroup.position.set(-1.15, -0.96, -0.5);
    ecoGroup.add(shopGroup);

    // Stall Counter Underglow
    const shopUnderglow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.6), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    shopUnderglow.position.y = 0.02;
    shopGroup.add(shopUnderglow);

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.72, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0x064e3b, emissiveIntensity: 0.45, roughness: 0.3 })
    );
    counter.position.y = 0.36;
    shopGroup.add(counter);
    addNeonEdges(counter, 0x10b981, 2);

    // Striped Awning Canopy
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.65, roughness: 0.2 })
    );
    awning.position.set(0, 1.08, 0.1);
    awning.rotation.x = 0.2;
    shopGroup.add(awning);
    addNeonEdges(awning, 0xffffff, 2);

    // Neon Bazaar Signboard
    const shopBanner = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.28, 0.06),
      new THREE.MeshBasicMaterial({ map: createBazaarBannerTexture() })
    );
    shopBanner.position.set(0, 1.35, 0.15);
    shopGroup.add(shopBanner);
    addNeonEdges(shopBanner, 0x10b981, 2);

    // Countertop QR Standee
    const standee = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.4, 0.04),
      new THREE.MeshBasicMaterial({ map: createQRStandeeTexture() })
    );
    standee.position.set(0.3, 0.92, 0.08);
    standee.rotation.y = -0.2;
    shopGroup.add(standee);
    addNeonEdges(standee, 0x10b981, 2);

    // Customer Smartphone scanning QR
    const buyerPhone = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.48, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.7 })
    );
    buyerPhone.position.set(0.28, 1.45, 0.32);
    buyerPhone.rotation.x = 0.45;
    shopGroup.add(buyerPhone);
    addNeonEdges(buyerPhone, 0x00f0ff, 2);

    // Scanning Laser Pyramid Beam from Customer Phone to QR Standee
    const scanBeamGeom = new THREE.ConeGeometry(0.32, 0.55, 4, 1, true);
    const scanBeamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.75 });
    const scanPyramid = new THREE.Mesh(scanBeamGeom, scanBeamMat);
    scanPyramid.position.set(0.29, 1.18, 0.2);
    scanPyramid.rotation.x = 0.45;
    shopGroup.add(scanPyramid);

    // Emerald Map Pin over Merchant Shop
    const shopPin = create3DMapPin(0x10b981);
    shopPin.position.set(0, 2.05, 0);
    shopGroup.add(shopPin);

    // 2. Public Transit City Bus
    const busGroup = new THREE.Group();
    busGroup.position.set(1.05, -0.96, 0.6);
    ecoGroup.add(busGroup);

    // Bus Underglow Light
    const busUnderglow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.6), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    busUnderglow.position.y = 0.02;
    busGroup.add(busUnderglow);

    // Bus Body Chassis (Vibrant Cyan)
    const busBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.65, metalness: 0.4, roughness: 0.2 })
    );
    busBody.position.y = 0.52;
    busGroup.add(busBody);
    addNeonEdges(busBody, 0x00f0ff, 2);

    // Amber LED Destination Marquee Board on Bus Front
    const busMarquee = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.64),
      new THREE.MeshBasicMaterial({ map: createBusMarqueeTexture() })
    );
    busMarquee.position.set(0.81, 0.72, 0);
    busMarquee.rotation.y = Math.PI / 2;
    busGroup.add(busMarquee);
    addNeonEdges(busMarquee, 0xf59e0b, 2);

    // Dark Window Ribbon Strip
    const winStrip = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.26, 0.74),
      new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.1, metalness: 0.9 })
    );
    winStrip.position.y = 0.62;
    busGroup.add(winStrip);

    // 4 Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const busWheels = [];
    [-0.52, 0.52].forEach(x => {
      [-0.38, 0.38].forEach(z => {
        const w = new THREE.Mesh(wheelGeom, wheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.15, z);
        busGroup.add(w);
        busWheels.push(w);
      });
    });

    // Glowing Headlights
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.55), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    headlight.position.set(0.81, 0.38, 0);
    busGroup.add(headlight);

    // Cyan Map Pin over City Bus
    const busPin = create3DMapPin(0x00f0ff);
    busPin.position.set(0, 1.55, 0);
    busGroup.add(busPin);

    // Floating Air-Gap Commerce Grid HUD Billboard
    const ecoHUD = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 0.06),
      new THREE.MeshBasicMaterial({ map: createEcosystemHUDTexture() })
    );
    ecoHUD.position.set(0, 1.45, -0.6);
    ecoGroup.add(ecoHUD);
    addNeonEdges(ecoHUD, 0x00f0ff, 2);

    // 6 Parabolic Jumping Payment Coins
    const tokenArcCoins = [];
    for (let c = 0; c < 6; c++) {
      const tc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.05, 20),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.95 })
      );
      tc.rotation.x = Math.PI / 2;
      tc.userData = { phase: c * (1 / 6) };
      ecoGroup.add(tc);
      tokenArcCoins.push(tc);
    }

    g3.userData = { ecoGroup, shopPin, busPin, busWheels, tokenArcCoins, scanPyramid, floorRing1, floorRing2, ecoHUD };

    // ─────────────────────────────────────────────────────────────
    // Slide 4: Applied Cryptography (3D Master Key & Interlocking Hash Chain)
    // ─────────────────────────────────────────────────────────────
    const g4 = gScience;
    const cryptoGroup = new THREE.Group();
    cryptoGroup.position.set(0, -0.22, 0);
    g4.add(cryptoGroup);

    // Cyber-Pedestal Base Platform with Hexagonal Chamfer
    const cyberPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.5, 0.24, 6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x1e1b4b, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 })
    );
    cyberPlinth.position.y = -1.15;
    cryptoGroup.add(cyberPlinth);
    addNeonEdges(cyberPlinth, 0xc084fc, 2);

    // Concentric Cryptographic Ring on Plinth
    const plinthRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = -1.02;
    cryptoGroup.add(plinthRing);

    // 1. Heavy 3D Titanium Vault Padlock
    const padlockBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.1, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x1e1b4b, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.15 })
    );
    padlockBody.position.set(-0.85, -0.25, 0);
    cryptoGroup.add(padlockBody);
    addNeonEdges(padlockBody, 0xc084fc, 3); // Neon Purple Perimeter

    // Padlock U-Shackle
    const lockShackle = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.095, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
    );
    lockShackle.position.set(-0.85, 0.3, 0);
    cryptoGroup.add(lockShackle);

    // Illuminated Cyan Keyhole
    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(-0.85, -0.25, 0);
    cryptoGroup.add(keyhole);

    // 2. Interlocking Physical 3D Chain Links (The Cryptographic Hash Chain)
    const chainLinks = [];
    const chainBlocks = [];
    const chainLinkCount = 4;
    const linkGeom = new THREE.TorusGeometry(0.44, 0.085, 16, 32);
    const linkMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      metalness: 0.8,
      roughness: 0.2
    });

    for (let l = 0; l < chainLinkCount; l++) {
      const link = new THREE.Mesh(linkGeom, linkMat);
      link.position.set(-0.35 + l * 0.62, 0.12 + (l % 2 === 0 ? 0.06 : -0.06), 0);
      if (l % 2 === 1) link.rotation.x = Math.PI / 2;
      link.scale.set(1.15, 0.68, 1.0);
      cryptoGroup.add(link);
      addNeonEdges(link, 0x00f0ff, 2);
      chainLinks.push(link);

      // Embedded Block Data Cube inside each chain link
      const blockCube = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.8, roughness: 0.2 })
      );
      blockCube.position.set(-0.35 + l * 0.62, 0.12, 0);
      cryptoGroup.add(blockCube);
      addNeonEdges(blockCube, 0xffffff, 2);
      chainBlocks.push(blockCube);
    }

    // 3. 3D Master Cryptographic Key (NIST P-256)
    const masterKey = new THREE.Group();
    const keyBow = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.085, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.85, metalness: 0.85, roughness: 0.15 })
    );
    masterKey.add(keyBow);
    addNeonEdges(keyBow, 0xffffff, 2);

    const keyCore = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 24), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    keyCore.rotation.x = Math.PI / 2;
    masterKey.add(keyCore);

    const keyShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.65, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.15 })
    );
    keyShaft.rotation.z = Math.PI / 2;
    keyShaft.position.x = 1.0;
    masterKey.add(keyShaft);

    const keyTooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.09), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    keyTooth1.position.set(1.45, -0.16, 0);
    masterKey.add(keyTooth1);
    addNeonEdges(keyTooth1, 0x00f0ff, 2);

    const keyTooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.09), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    keyTooth2.position.set(1.72, -0.13, 0);
    masterKey.add(keyTooth2);
    addNeonEdges(keyTooth2, 0x00f0ff, 2);

    masterKey.position.set(0.65, 0.75, 0.3);
    masterKey.rotation.z = -0.35;
    cryptoGroup.add(masterKey);

    // Radiant Cryptographic Laser Beam connecting Key to Keyhole
    const laserBeamGeom = new THREE.CylinderGeometry(0.035, 0.035, 1.5, 16);
    const laserBeamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const cryptoLaser = new THREE.Mesh(laserBeamGeom, laserBeamMat);
    cryptoLaser.rotation.z = Math.PI / 2.7;
    cryptoLaser.position.set(-0.1, 0.22, 0.15);
    cryptoGroup.add(cryptoLaser);

    // Floating Cryptographic Security Hologram Billboard
    const cryptoHUD = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.95, 0.06),
      new THREE.MeshBasicMaterial({ map: createCryptoHologramTexture() })
    );
    cryptoHUD.position.set(0, 1.45, -0.4);
    cryptoGroup.add(cryptoHUD);
    addNeonEdges(cryptoHUD, 0xc084fc, 2);

    g4.userData = { cryptoGroup, masterKey, chainLinks, chainBlocks, padlockBody, keyhole, cryptoLaser, plinthRing, cryptoHUD };

    // ─────────────────────────────────────────────────────────────
    // Slide 5: Non-Custodial B2B Economics (Ascending Chart + Coin Stacks + Growth Arrow)
    // ─────────────────────────────────────────────────────────────
    const g5 = gBusiness;
    const econGroup = new THREE.Group();
    econGroup.position.set(0, -0.32, 0);
    g5.add(econGroup);

    // Cyberpunk Financial Matrix Floor Slab
    const econFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.2, 36),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 })
    );
    econFloor.position.y = -1.2;
    econGroup.add(econFloor);
    addNeonEdges(econFloor, 0x10b981, 2);

    // 3 Ascending Bar Chart Pillars (Proportionately scaled to fit viewing frustum)
    const pillarData = [
      { h: 0.82, x: -1.2, col: 0x0284c7, em: 0x00f0ff, year: '2026', stat: 'Rs 0 CAPEX', title: '1,000 POS Nodes' },
      { h: 1.35, x: 0,    col: 0x10b981, em: 0x059669, year: '2027', stat: '50k MERCHANTS', title: 'eSewa & Khalti Partner' },
      { h: 1.95, x: 1.2,  col: 0xfbbf24, em: 0xf59e0b, year: '2028', stat: 'Rs 100Cr+ GMV', title: 'National Air-Gap Grid' }
    ];

    const chartPillars = [];
    const pillarBadges = [];
    const lightColumns = [];

    pillarData.forEach(pd => {
      // Bar Pillar
      const pGeom = new THREE.BoxGeometry(0.82, pd.h, 0.82);
      const pMat = new THREE.MeshStandardMaterial({
        color: pd.col,
        emissive: pd.em,
        emissiveIntensity: 0.7,
        metalness: 0.6,
        roughness: 0.2
      });
      const pillar = new THREE.Mesh(pGeom, pMat);
      pillar.position.set(pd.x, -1.05 + pd.h / 2, 0);
      econGroup.add(pillar);
      addNeonEdges(pillar, 0xffffff, 2);
      chartPillars.push(pillar);

      // Skyward Laser Light Column shooting from top of pillar (compact & non-clipping)
      const colGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.65, 12);
      const colMat = new THREE.MeshBasicMaterial({ color: pd.em, transparent: true, opacity: 0.85 });
      const lightCol = new THREE.Mesh(colGeom, colMat);
      lightCol.position.set(pd.x, -1.05 + pd.h + 0.32, 0);
      econGroup.add(lightCol);
      lightColumns.push(lightCol);

      // Floating 3D Metric Badge above each pillar
      const badgeTex = createEconBadgeTexture(pd.year, pd.title, pd.stat, '#' + pd.em.toString(16).padStart(6, '0'));
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.42, 0.05),
        new THREE.MeshBasicMaterial({ map: badgeTex })
      );
      badge.position.set(pd.x, -1.05 + pd.h + 0.32, 0.45);
      econGroup.add(badge);
      addNeonEdges(badge, pd.em, 2);
      pillarBadges.push(badge);
    });

    // Stacks of 3D Gold Rupee Coins at the Base
    const goldCoins = [];
    const coinGeomS6 = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24);
    const coinMatS6 = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
      metalness: 0.85,
      roughness: 0.18
    });

    [-1.2, 0, 1.2].forEach((px, stackIdx) => {
      const numCoins = (stackIdx + 1) * 3;
      for (let c = 0; c < numCoins; c++) {
        const coin = new THREE.Mesh(coinGeomS6, coinMatS6);
        coin.position.set(px + 0.35, -1.01 + c * 0.09, 0.5);
        econGroup.add(coin);
        addNeonEdges(coin, 0xffffff, 1);
        goldCoins.push(coin);
      }
    });

    // Soaring 3D Volumetric Growth / Profit Arrow
    const arrowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.7, -0.8, 0.45),
      new THREE.Vector3(-0.5, -0.2, 0.45),
      new THREE.Vector3(0.5, 0.6, 0.45),
      new THREE.Vector3(1.5, 1.25, 0.45)
    ]);
    const arrowTube = new THREE.Mesh(
      new THREE.TubeGeometry(arrowCurve, 32, 0.08, 12, false),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    econGroup.add(arrowTube);

    const arrowHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.48, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    arrowHead.position.set(1.5, 1.25, 0.45);
    arrowHead.rotation.z = -Math.PI / 4;
    econGroup.add(arrowHead);

    // Giant Glowing 3D Golden Rupee Emblem Floating at Arrow Apex (Framed Comfortably Inside Viewport)
    const apexCoin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.1, 32),
      new THREE.MeshStandardMaterial({ map: createRupeeCoinTexture(), metalness: 0.85, roughness: 0.2, emissive: 0xf59e0b, emissiveIntensity: 0.6 })
    );
    apexCoin.rotation.x = Math.PI / 2;
    apexCoin.position.set(1.5, 1.62, 0.45);
    econGroup.add(apexCoin);
    addNeonEdges(apexCoin, 0xffffff, 2);

    const apexHalo = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    apexHalo.position.set(1.5, 1.62, 0.45);
    econGroup.add(apexHalo);

    g5.userData = { econGroup, chartPillars, goldCoins, arrowHead, arrowTube, apexCoin, apexHalo, lightColumns, pillarBadges };

    // ─────────────────────────────────────────────────────────────
    // Slide 6: Social & Disaster Resilience (3D Aegis Shield & Heartbeat Lifeline)
    // ─────────────────────────────────────────────────────────────
    const g6 = gBenefits;
    const impactGroup = new THREE.Group();
    impactGroup.position.set(0, -0.15, 0);
    g6.add(impactGroup);

    // Luminous Geodesic Wireframe Forcefield Dome protecting the community
    const domeGeom = new THREE.SphereGeometry(2.4, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.35 });
    const forceDome = new THREE.Mesh(domeGeom, domeMat);
    forceDome.position.y = -1.2;
    impactGroup.add(forceDome);

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1.3);
    shieldShape.lineTo(0.9, 0.85);
    shieldShape.lineTo(0.9, -0.3);
    shieldShape.lineTo(0, -1.3);
    shieldShape.lineTo(-0.9, -0.3);
    shieldShape.lineTo(-0.9, 0.85);
    shieldShape.closePath();

    const shieldGeom = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 4
    });
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      metalness: 0.75,
      roughness: 0.18
    });
    const aegisShield = new THREE.Mesh(shieldGeom, shieldMat);
    impactGroup.add(aegisShield);
    addNeonEdges(aegisShield, 0x00f0ff, 3); // Radiant Neon Cyan Rim!

    // 3D Emergency First-Aid / Medical Lifeline Cross on Shield Crest
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.14), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.9 }));
    crossH.position.set(0, 0.65, 0.22);
    impactGroup.add(crossH);
    addNeonEdges(crossH, 0xffffff, 2);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.14), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.9 }));
    crossV.position.set(0, 0.65, 0.22);
    impactGroup.add(crossV);
    addNeonEdges(crossV, 0xffffff, 2);

    // 3D Extruded Heartbeat Lifeline (EKG Pulse Wave) on Shield Face
    const ekgCurve = new THREE.CurvePath();
    const ekgPts = [
      new THREE.Vector3(-0.7, -0.05, 0.25),
      new THREE.Vector3(-0.25, -0.05, 0.25),
      new THREE.Vector3(-0.15, 0.3, 0.25),
      new THREE.Vector3(0, -0.45, 0.25),
      new THREE.Vector3(0.12, 0.5, 0.25),
      new THREE.Vector3(0.25, -0.15, 0.25),
      new THREE.Vector3(0.35, -0.05, 0.25),
      new THREE.Vector3(0.7, -0.05, 0.25)
    ];
    for (let p = 0; p < ekgPts.length - 1; p++) {
      ekgCurve.add(new THREE.LineCurve3(ekgPts[p], ekgPts[p + 1]));
    }
    const ekgTube = new THREE.Mesh(
      new THREE.TubeGeometry(ekgCurve, 40, 0.05, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    impactGroup.add(ekgTube);

    // Stylized Low-Poly Mountain Peak Base (Himalayan Inclusion)
    const mountainGeom = new THREE.ConeGeometry(1.6, 1.1, 5);
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 });
    const mountain = new THREE.Mesh(mountainGeom, mountainMat);
    mountain.position.set(0, -1.6, 0);
    impactGroup.add(mountain);
    addNeonEdges(mountain, 0x10b981, 2);

    // Snow-Cap on Mountain Top
    const snowCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 0.45, 5),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, emissive: 0x38bdf8, emissiveIntensity: 0.3 })
    );
    snowCap.position.set(0, -1.25, 0);
    impactGroup.add(snowCap);
    addNeonEdges(snowCap, 0xffffff, 2);

    // 3 Low-Poly Himalayan Community Village Cottages around Base
    [-0.8, 0, 0.8].forEach((hx, hi) => {
      const hut = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.3, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0xf59e0b, emissiveIntensity: 0.4, roughness: 0.4 })
      );
      hut.position.set(hx, -1.55, 0.7 - Math.abs(hx) * 0.3);
      impactGroup.add(hut);
      addNeonEdges(hut, 0xfbbf24, 2);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.22, 4),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.6 })
      );
      roof.position.set(hx, -1.33, 0.7 - Math.abs(hx) * 0.3);
      roof.rotation.y = Math.PI / 4;
      impactGroup.add(roof);
    });

    // Emergency Satellite Transmitter Dish
    const satDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.15 })
    );
    satDish.position.set(0.9, -1.2, -0.4);
    satDish.rotation.x = -Math.PI / 3;
    impactGroup.add(satDish);
    addNeonEdges(satDish, 0x00f0ff, 2);

    // Floating Disaster Status HUD Billboard
    const disasterHUD = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.95, 0.06),
      new THREE.MeshBasicMaterial({ map: createDisasterHUDTexture() })
    );
    disasterHUD.position.set(0, 1.45, -0.5);
    impactGroup.add(disasterHUD);
    addNeonEdges(disasterHUD, 0x00f0ff, 2);

    // Deflective Forcefield Rings
    const forceRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.03, 16, 64), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
    const forceRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.025, 16, 64), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    forceRing1.rotation.x = Math.PI / 2.5;
    forceRing2.rotation.y = Math.PI / 3;
    impactGroup.add(forceRing1);
    impactGroup.add(forceRing2);

    g6.userData = { impactGroup, aegisShield, ekgTube, crossH, crossV, forceDome, forceRing1, forceRing2, disasterHUD, satDish };

    // ─────────────────────────────────────────────────────────────
    // Slide 7: Revenue Model Engine (3 Streams, Golden Vault & Bank SDK Core)
    // ─────────────────────────────────────────────────────────────
    const g7 = gConclusion;
    const revenueGroup = new THREE.Group();
    revenueGroup.position.set(0, -0.05, 0);
    g7.add(revenueGroup);

    // 1. Cyber-Financial Matrix Platform Base
    const revBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 2.7, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a101d, roughness: 0.3, metalness: 0.6 })
    );
    revBase.position.y = -1.15;
    revenueGroup.add(revBase);
    addNeonEdges(revBase, 0x10b981, 2);

    // Floating Revenue HUD Billboard on base
    const revenueHUD = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.05, 0.06),
      new THREE.MeshBasicMaterial({ map: createRevenueHUDTexture() })
    );
    revenueHUD.position.set(0, 1.48, -0.6);
    revenueGroup.add(revenueHUD);
    addNeonEdges(revenueHUD, 0x10b981, 2);

    // 3 Distinct Monetization Stream Pillars
    const streamPillars = [];

    // --- Stream 1 (Left): Digital Wallet Split (eSewa / Khalti) ---
    const s1Group = new THREE.Group();
    s1Group.position.set(-1.40, -1.05, 0.1);
    revenueGroup.add(s1Group);

    const s1Pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.95, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0x059669, emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.2 })
    );
    s1Pillar.position.y = 0.95 / 2;
    s1Group.add(s1Pillar);
    addNeonEdges(s1Pillar, 0x34d399, 2);
    streamPillars.push(s1Pillar);

    const s1Badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.48, 0.04),
      new THREE.MeshBasicMaterial({ map: createRevenueStreamTexture('STREAM 1', 'WALLET SPLITS', 'Rs 0.10–0.25', 'eSewa & Khalti Split', '#34d399') })
    );
    s1Badge.position.set(0, 1.40, 0);
    s1Group.add(s1Badge);

    // Dual Split Token Orbs (eSewa Green & Khalti Purple)
    const splitOrbs = [];
    const orb1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.9 }));
    orb1.position.set(-0.25, 0.75, 0);
    s1Group.add(orb1);
    splitOrbs.push(orb1);

    const orb2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.9 }));
    orb2.position.set(0.25, 0.75, 0);
    s1Group.add(orb2);
    splitOrbs.push(orb2);

    const splitLink = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    splitLink.rotation.z = Math.PI / 2;
    splitLink.position.set(0, 0.75, 0);
    s1Group.add(splitLink);

    // --- Stream 2 (Center, Apex): High-Volume Merchant Subscription Vault ---
    const s2Group = new THREE.Group();
    s2Group.position.set(0, -1.05, 0.35);
    revenueGroup.add(s2Group);

    const s2Pillar = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 1.35, 1.05),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0x312e81, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 })
    );
    s2Pillar.position.y = 1.35 / 2;
    s2Group.add(s2Pillar);
    addNeonEdges(s2Pillar, 0xfbbf24, 2);
    streamPillars.push(s2Pillar);

    const goldVault = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.68, 0.68),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.4, metalness: 0.95, roughness: 0.15 })
    );
    goldVault.position.set(0, 1.85, 0);
    s2Group.add(goldVault);
    addNeonEdges(goldVault, 0xffffff, 2);

    const vaultDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.9, roughness: 0.1 })
    );
    vaultDial.rotation.x = Math.PI / 2;
    vaultDial.position.set(0, 1.85, 0.38);
    s2Group.add(vaultDial);

    const s2Badge = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.50, 0.04),
      new THREE.MeshBasicMaterial({ map: createRevenueStreamTexture('STREAM 2', 'MERCHANT SUBS', 'Rs 200–500/Mo', 'Buses, Canteens, Tolls', '#fbbf24') })
    );
    s2Badge.position.set(0, 2.45, 0);
    s2Group.add(s2Badge);

    // --- Stream 3 (Right): Commercial Bank Enterprise B2B SDK Core ---
    const s3Group = new THREE.Group();
    s3Group.position.set(1.40, -1.05, 0.1);
    revenueGroup.add(s3Group);

    const s3Pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.05, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x0c2738, emissive: 0x0369a1, emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.2 })
    );
    s3Pillar.position.y = 1.05 / 2;
    s3Group.add(s3Pillar);
    addNeonEdges(s3Pillar, 0x38bdf8, 2);
    streamPillars.push(s3Pillar);

    const s3Badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.48, 0.04),
      new THREE.MeshBasicMaterial({ map: createRevenueStreamTexture('STREAM 3', 'BANK B2B SDK', 'Annual License', 'Commercial Banking App', '#38bdf8') })
    );
    s3Badge.position.set(0, 1.50, 0);
    s3Group.add(s3Badge);

    const bankShield = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8, metalness: 0.9 })
    );
    bankShield.position.set(0, 0.85, 0);
    s3Group.add(bankShield);
    addNeonEdges(bankShield, 0xffffff, 2);

    // 8 Orbiting 24K Gold Coins across the Revenue Engine
    const revGoldCoins = [];
    const revCoinGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24);
    const revCoinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15, emissive: 0x78350f, emissiveIntensity: 0.3 });

    for (let c = 0; c < 8; c++) {
      const coin = new THREE.Mesh(revCoinGeom, revCoinMat);
      coin.position.set(0, 0, 0);
      revenueGroup.add(coin);
      addNeonEdges(coin, 0xfef08a, 1);
      revGoldCoins.push(coin);
    }

    // Celebratory Golden & Emerald Halo Rings
    const revHalo1 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.035, 16, 64), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    revHalo1.rotation.x = Math.PI / 3;
    revenueGroup.add(revHalo1);

    const revHalo2 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.03, 16, 64), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    revHalo2.rotation.y = Math.PI / 4;
    revenueGroup.add(revHalo2);

    g7.userData = { revenueGroup, goldVault, vaultDial, bankShield, splitOrbs, pillars: streamPillars, goldCoins: revGoldCoins, halo1: revHalo1, halo2: revHalo2 };
  }

  goToSlide(index) {
    if (index < 0 || index >= this.totalSlides || index === this.currentSlideIndex) return;

    // Auto-collapse prompter on smaller viewports (<= 1024px) so it does not compress the main stage content
    if (window.innerWidth <= 1024 && this.isPrompterOpen) {
      this.closePrompter();
    }

    // Pause all video elements if leaving
    const existingProblemVid = document.getElementById('problem-live-video');
    if (existingProblemVid) {
      existingProblemVid.pause();
      existingProblemVid.currentTime = 0;
      existingProblemVid.muted = true;
    }
    const existingVid = document.getElementById('solution-demo-video');
    if (existingVid) {
      existingVid.pause();
      existingVid.currentTime = 0;
      existingVid.muted = true;
    }

    this.currentSlideIndex = index;
    this.sceneEnterTime = performance.now();
    this.needsVideoClear = true;
    sfx.slideChange();

    const currentSlide = SLIDES[index];
    const isVideoSlide = (currentSlide.id === 'live-problem' || currentSlide.id === 'solution');

    this.slideObjects.forEach((grp, i) => {
      grp.visible = (!isVideoSlide && i === index);
    });

    this.updateResponsiveLayout();
    this.renderSlideUI(index);
  }

  nextSlide() {
    if (this.currentSlideIndex < this.totalSlides - 1) {
      this.goToSlide(this.currentSlideIndex + 1);
    }
  }

  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.goToSlide(this.currentSlideIndex - 1);
    }
  }

  renderSlideUI(index) {
    const data = SLIDES[index];

    // Ensure corresponding 3D scene group is visible
    const isVideoSlide = (data.id === 'live-problem' || data.id === 'solution');
    this.slideObjects.forEach((grp, i) => {
      grp.visible = (!isVideoSlide && i === index);
    });

    // HUD Counter
    document.getElementById('hud-current-slide').textContent = String(index + 1).padStart(2, '0');
    document.getElementById('hud-total-slides').textContent = String(this.totalSlides).padStart(2, '0');

    // Navigation Dots
    const dotsContainer = document.getElementById('slide-dots');
    dotsContainer.innerHTML = '';
    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = `slide-dot ${i === index ? 'active' : ''}`;
      dot.title = `Slide ${i + 1}: ${SLIDES[i].title.replace(/<[^>]*>/g, '')}`;
      dot.onclick = () => this.goToSlide(i);
      dotsContainer.appendChild(dot);
    }

    const viewport = document.getElementById('slide-viewport');

    if (data.id === 'live-problem') {
      // Slide 1: Live Problem Statement - Attractive Keynote Bullet Cards + Video Kiosk
      viewport.innerHTML = `
        <div class="problem-split-container">
          <div class="problem-left-col">
            <div class="slide-kicker ${data.kickerType || 'danger'}">
              <span class="live-dot-pulse"></span> ${data.kicker}
            </div>
            
            <h1 class="slide-title">${data.title}</h1>
            <p class="slide-subtitle">${data.subtitle}</p>

            <div class="problem-bullets-stack">
              ${data.bullets.map((b, bi) => `
                <div class="problem-bullet-item ${b.glow || 'glow-red'}" style="--i:${bi}">
                  <span class="pbullet-icon-wrapper">${b.icon}</span>
                  <span class="pbullet-text">${b.text}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="problem-right-col">
            <div class="vertical-phone-kiosk">
              <div class="kiosk-speaker-notch"></div>
              <div class="kiosk-camera-lens"></div>
              <div class="kiosk-screen">
                <div class="kiosk-top-overlay">
                  <div class="kiosk-live-badge">
                    <span class="kiosk-pulse-red"></span>
                    <span>REAL USERS</span>
                  </div>
                  <div class="kiosk-audio-indicator">
                    <div class="audio-equalizer" id="kiosk-eq">
                      <span class="eq-bar"></span>
                      <span class="eq-bar"></span>
                      <span class="eq-bar"></span>
                      <span class="eq-bar"></span>
                    </div>
                    <button class="kiosk-sound-btn active" id="problem-sound-btn" onclick="event.stopPropagation(); presentation.toggleProblemVideoAudio()">
                      🔊 <span id="problem-sound-state">Audio: ON</span>
                    </button>
                  </div>
                </div>
                <video id="problem-live-video" src="problem-live.mp4" playsinline preload="auto" onclick="presentation.toggleProblemVideoPlay()"></video>
                <div class="kiosk-start-overlay hidden" id="problem-start-overlay" onclick="presentation.startProblemVideoWithSound()">
                  <div class="kiosk-play-pulse-btn">
                    <span class="kiosk-play-icon">▶</span>
                  </div>
                  <div class="kiosk-start-heading">TAP TO HEAR THEIR STORIES</div>
                  <div class="kiosk-start-sub">eSewa, Khalti &amp; mobile-banking users, in their own words</div>
                </div>
                <div class="kiosk-progress-bar">
                  <div class="kiosk-progress-fill" id="problem-progress-fill"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Autoplay problem live video with sound & safety fallback
      setTimeout(() => {
        const vid = document.getElementById('problem-live-video');
        const progressFill = document.getElementById('problem-progress-fill');
        const nextBtn = document.getElementById('problem-next-btn');
        const soundBtn = document.getElementById('problem-sound-btn');
        const soundState = document.getElementById('problem-sound-state');
        const overlay = document.getElementById('problem-start-overlay');

        if (!vid) return;

        vid.currentTime = 0;
        vid.muted = false;
        vid.volume = 1.0;

        vid.ontimeupdate = () => {
          if (progressFill && vid.duration) {
            const pct = (vid.currentTime / vid.duration) * 100;
            progressFill.style.width = `${pct}%`;
          }
        };

        vid.onended = () => {
          if (nextBtn) nextBtn.classList.add('pulse-ready');
          if (progressFill) progressFill.style.width = '100%';
          this.showToast('✨ That is the problem. Press [Space] for the fix.');
        };

        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (overlay) overlay.classList.add('hidden');
              if (soundBtn) soundBtn.classList.add('active');
              if (soundState) soundState.textContent = 'Audio: ON 🔊';
              this.routeVoice(vid, 'kiosk-eq');
            })
            .catch(err => {
              console.warn('Autoplay unmuted blocked by policy; waiting for user gesture at 0:', err);
              vid.pause();
              vid.currentTime = 0;
              if (overlay) overlay.classList.remove('hidden');
              if (soundBtn) soundBtn.classList.remove('active');
              if (soundState) soundState.textContent = 'Click for Sound 🔊';
              this.showToast('🔊 Tap the phone to play the testimonials with sound');
            });
        }
      }, 60);

    } else if (data.id === 'solution') {
      // Slide 2: Full-Screen Independent Theater Mode for 10-Second 3D Architecture Video
      viewport.innerHTML = `
        <div class="theater-fullscreen-container">
          <div class="theater-topbar">
            <div class="theater-top-title-group">
              <div class="theater-badge">
                <span class="theater-pulse-dot"></span>
                <span>OFFLINEPAY 3D ARCHITECTURE</span>
              </div>
              <h2 class="theater-main-title">Pay With Zero Bars. In 10 Seconds.</h2>
            </div>
            <button class="theater-sound-pill active" id="vid-audio-toggle" onclick="presentation.toggleVideoAudio()">
              <span class="audio-equalizer" id="theater-eq"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></span>
              <span id="vid-audio-state">Voiceover: ON</span>
            </button>
          </div>

          <div class="theater-screen-frame">
            <video id="solution-demo-video" src="solution-demo.mp4" playsinline preload="auto"></video>
            <div class="theater-progress-track">
              <div class="theater-progress-fill" id="vid-progress-fill"></div>
            </div>
          </div>

          <div class="theater-bottom-bar">
            <div class="theater-flow-chips">
              <span class="flow-chip active">1. Scan the QR</span>
              <span class="flow-arrow">➔</span>
              <span class="flow-chip active">2. Sealed Offline Voucher</span>
              <span class="flow-arrow">➔</span>
              <span class="flow-chip active">3. Auto-Sync to eSewa / Khalti</span>
            </div>

            <div class="theater-action-group">
              <button class="theater-btn replay-btn" onclick="presentation.replayTheaterVideo()" title="Replay 10-second video">
                🔄 Replay
              </button>
              <button class="theater-btn next-slide-btn" id="theater-next-btn" onclick="presentation.nextSlide()" title="Proceed to Slide 3 [Space or ➔]">
                <span>Next Slide</span> <span class="theater-arrow">➔</span> <kbd class="kbd-badge">Space</kbd>
              </button>
            </div>
          </div>
        </div>
      `;

      // Autoplay unmuted with safety fallback
      setTimeout(() => {
        const vid = document.getElementById('solution-demo-video');
        const progressFill = document.getElementById('vid-progress-fill');
        const nextBtn = document.getElementById('theater-next-btn');
        const soundState = document.getElementById('vid-audio-state');
        const soundBtn = document.getElementById('vid-audio-toggle');

        if (!vid) return;

        vid.currentTime = 0;
        vid.muted = false;
        vid.volume = 1.0;

        vid.ontimeupdate = () => {
          if (progressFill && vid.duration) {
            const pct = (vid.currentTime / vid.duration) * 100;
            progressFill.style.width = `${pct}%`;
          }
        };

        vid.onended = () => {
          if (nextBtn) {
            nextBtn.classList.add('pulse-ready');
          }
          if (progressFill) progressFill.style.width = '100%';
          this.showToast('✨ Paid. Offline. Press [Space] to see why it is secure.');
        };

        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (soundBtn) soundBtn.classList.add('active');
              if (soundState) soundState.textContent = 'Voiceover: ON';
              this.routeVoice(vid, 'theater-eq');
            })
            .catch(err => {
              console.warn('Autoplay unmuted restricted by browser policy:', err);
              vid.muted = true;
              vid.play().catch(() => {});
              if (soundBtn) soundBtn.classList.remove('active');
              if (soundState) soundState.textContent = 'Click to Unmute 🔊';
              this.showToast('🔊 Click the Voiceover pill to hear the narration');
            });
        }
      }, 60);

    } else if (data.id === 'comparison') {
      // Slide 6: Market Comparison Table
      viewport.innerHTML = `
        <div class="slide active">
          <div class="slide-kicker ${data.kickerType || 'cyan'}">${data.kicker}</div>
          <h1 class="slide-title">${data.title}</h1>
          ${data.subtitle ? `<div class="slide-subtitle">${data.subtitle}</div>` : ''}
          ${data.bullets.length ? `<div class="bullets-stack">` : '<div hidden>'}
            ${data.bullets.map((b, bi) => `
              <div class="bullet-item ${b.glow || ''}" style="--i:${bi}">
                <span class="bullet-icon">${b.icon}</span>
                <span class="bullet-text">${b.text}</span>
              </div>
            `).join('')}
          </div>

          <div class="comparison-card">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th></th>
                  ${data.matrix.columns.map((c, ci) => `<th class="${ci === data.matrix.columns.length - 1 ? 'col-hero' : ''}">${c}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.matrix.rows.map(r => `
                  <tr class="${r.highlight ? 'highlight-row' : ''}">
                    <td><strong>${r.label}</strong></td>
                    ${r.cells.map(([tone, label], ci) => `<td class="${ci === r.cells.length - 1 ? 'col-hero' : ''}"><span class="comp-badge ${tone}">${label}</span></td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${data.actionBtn ? `
            <button class="slide-action-btn" onclick="presentation.triggerSlideAction('${data.actionBtn.fn}')">
              ${data.actionBtn.text}
            </button>
          ` : ''}
        </div>
      `;
    } else {
      // Standard Slide View
      viewport.innerHTML = `
        <div class="slide active">
          <div class="slide-kicker ${data.kickerType || ''}">${data.kicker}</div>
          <h1 class="slide-title">${data.title}</h1>
          ${data.subtitle ? `<div class="slide-subtitle">${data.subtitle}</div>` : ''}
          ${data.bullets.length ? `<div class="bullets-stack">` : '<div hidden>'}
            ${data.bullets.map((b, bi) => `
              <div class="bullet-item ${b.glow || ''}" style="--i:${bi}">
                <span class="bullet-icon">${b.icon}</span>
                <span class="bullet-text">${b.text}</span>
              </div>
            `).join('')}
          </div>
          ${data.actionBtn ? `
            <button class="slide-action-btn" onclick="presentation.triggerSlideAction('${data.actionBtn.fn}')">
              ${data.actionBtn.text}
            </button>
          ` : ''}
        </div>
      `;
    }

    // Prompter update
    this.updatePrompter(data);
  }

  updatePrompter(data) {
    const p = data.prompter;
    if (!p) return;

    document.getElementById('prompter-title').textContent = `Slide ${this.currentSlideIndex + 1} Prompter`;
    document.getElementById('prompter-script').textContent = p.pitchScript || p.script || '';
    document.getElementById('prompter-takeaway').textContent = p.technicalHighlight || p.takeaway || '';
    document.getElementById('prompter-cue').textContent = p.demoCue || p.cue || '';

    const qaContainer = document.getElementById('prompter-qa');
    const qaList = p.anticipatedQA || p.qa || [];
    qaContainer.innerHTML = qaList.map(item => `
      <div class="qa-card">
        <div class="qa-q">Q: ${item.q}</div>
        <div class="qa-a">${item.a}</div>
      </div>
    `).join('');
  }

  showToast(message, isDanger = false) {
    const toast = document.getElementById('hud-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.borderColor = isDanger ? 'var(--danger)' : 'var(--primary)';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  triggerSlideAction(fnName) {
    if (this[fnName]) this[fnName]();
  }

  // Route a playing <video> through the voice-clarity chain and drive its equalizer from real audio
  routeVoice(vid, eqId) {
    sfx.attachVideo(vid).then(chain => {
      if (!chain || !vid.isConnected) return;
      const eq = document.getElementById(eqId);
      this.voiceMeter = { chain, vid, bars: eq ? Array.from(eq.querySelectorAll('.eq-bar')) : [] };
      if (eq) eq.classList.add('live');
    });
  }

  updateVoiceMeter() {
    const m = this.voiceMeter;
    if (!m) return;
    if (!m.vid.isConnected) { this.voiceMeter = null; return; }
    const { analyser, bins } = m.chain;
    analyser.getByteFrequencyData(bins);
    // Speech bands: body, vowels, consonants, sibilance
    const bands = [[1, 3], [3, 7], [7, 15], [15, 31]];
    const silent = m.vid.paused || m.vid.muted;
    m.bars.forEach((bar, i) => {
      const [a, b] = bands[i % 4];
      let sum = 0;
      for (let k = a; k < b; k++) sum += bins[k];
      const level = silent ? 0 : Math.min(1, (sum / ((b - a) * 255)) * 1.25);
      bar.style.height = `${3 + Math.round(level * 13)}px`;
    });
  }

  startProblemVideoWithSound() {
    const vid = document.getElementById('problem-live-video');
    const overlay = document.getElementById('problem-start-overlay');
    const soundBtn = document.getElementById('problem-sound-btn');
    const soundState = document.getElementById('problem-sound-state');
    const eq = document.getElementById('kiosk-eq');
    if (!vid) return;

    if (overlay) overlay.classList.add('hidden');
    vid.currentTime = 0;
    vid.muted = false;
    vid.volume = 1.0;

    vid.play().then(() => {
      if (soundBtn) soundBtn.classList.add('active');
      if (soundState) soundState.textContent = 'Audio: ON 🔊';
      if (eq) eq.classList.remove('muted');
      this.routeVoice(vid, 'kiosk-eq');
      this.showToast('🎙️ Real users, real failures, playing from the start');
    }).catch(err => {
      console.warn('Playback error:', err);
      vid.muted = true;
      if (eq) eq.classList.add('muted');
      vid.play().catch(() => {});
    });
  }

  toggleProblemVideoPlay() {
    const vid = document.getElementById('problem-live-video');
    const overlay = document.getElementById('problem-start-overlay');
    const eq = document.getElementById('kiosk-eq');
    if (!vid) return;

    if (overlay && !overlay.classList.contains('hidden')) {
      this.startProblemVideoWithSound();
      return;
    }

    if (vid.paused) {
      vid.play();
      if (eq && !vid.muted) eq.classList.remove('muted');
      this.showToast('▶️ Resumed testimonials');
    } else {
      vid.pause();
      if (eq) eq.classList.add('muted');
      this.showToast('⏸️ Paused testimonials');
    }
  }

  toggleProblemVideoAudio() {
    const vid = document.getElementById('problem-live-video');
    const btn = document.getElementById('problem-sound-btn');
    const stateSpan = document.getElementById('problem-sound-state');
    const overlay = document.getElementById('problem-start-overlay');
    const eq = document.getElementById('kiosk-eq');
    if (!vid) return;

    vid.muted = !vid.muted;
    if (!vid.muted) {
      vid.volume = 1.0;
      if (vid.currentTime < 6.0) {
        vid.currentTime = 0;
      }
      vid.play().catch(() => {});
      if (overlay) overlay.classList.add('hidden');
      if (btn) btn.classList.add('active');
      if (stateSpan) stateSpan.textContent = 'Audio: ON 🔊';
      if (eq) eq.classList.remove('muted');
      this.routeVoice(vid, 'kiosk-eq');
      this.showToast('🎙️ Testimonial audio on');
    } else {
      if (btn) btn.classList.remove('active');
      if (stateSpan) stateSpan.textContent = 'Audio: OFF 🔇';
      if (eq) eq.classList.add('muted');
      this.showToast('🔇 Testimonial audio muted');
    }
  }

  replayProblemVideo() {
    const vid = document.getElementById('problem-live-video');
    const nextBtn = document.getElementById('problem-next-btn');
    const progressFill = document.getElementById('problem-progress-fill');
    const overlay = document.getElementById('problem-start-overlay');
    const soundBtn = document.getElementById('problem-sound-btn');
    const soundState = document.getElementById('problem-sound-state');
    if (!vid) return;

    if (nextBtn) nextBtn.classList.remove('pulse-ready');
    if (progressFill) progressFill.style.width = '0%';
    if (overlay) overlay.classList.add('hidden');

    vid.currentTime = 0;
    vid.muted = false;
    vid.volume = 1.0;
    vid.play().then(() => {
      if (soundBtn) soundBtn.classList.add('active');
      if (soundState) soundState.textContent = 'Audio: ON 🔊';
      const eq = document.getElementById('kiosk-eq');
      if (eq) eq.classList.remove('muted');
      this.routeVoice(vid, 'kiosk-eq');
    }).catch(() => {
      vid.muted = true;
      const eq = document.getElementById('kiosk-eq');
      if (eq) eq.classList.add('muted');
      vid.play().catch(() => {});
    });

    sfx.slideChange();
    this.showToast('🔄 Replaying user testimonials');
  }

  firePaymentBeam() {
    this.replayTheaterVideo();
  }

  replayTheaterVideo() {
    const vid = document.getElementById('solution-demo-video');
    const nextBtn = document.getElementById('theater-next-btn');
    const progressFill = document.getElementById('vid-progress-fill');
    if (!vid) return;

    if (nextBtn) nextBtn.classList.remove('pulse-ready');
    if (progressFill) progressFill.style.width = '0%';

    vid.currentTime = 0;
    vid.muted = false;
    vid.volume = 1.0;
    vid.play().then(() => this.routeVoice(vid, 'theater-eq')).catch(() => {
      vid.muted = true;
      vid.play().catch(() => {});
    });

    sfx.beamLaser();
    this.showToast('⚡ Replaying the 10-second demo');
  }

  toggleVideoAudio() {
    const vid = document.getElementById('solution-demo-video');
    const btn = document.getElementById('vid-audio-toggle');
    const stateSpan = document.getElementById('vid-audio-state');
    if (!vid) return;

    vid.muted = !vid.muted;
    if (!vid.muted) {
      vid.volume = 1.0;
      vid.play().then(() => this.routeVoice(vid, 'theater-eq')).catch(() => {});
      if (btn) btn.classList.add('active');
      if (stateSpan) stateSpan.textContent = 'Voiceover: ON';
      this.showToast('🎙️ Voiceover on');
    } else {
      if (btn) btn.classList.remove('active');
      if (stateSpan) stateSpan.textContent = 'Click to Unmute 🔊';
      this.showToast('🔇 Voiceover muted');
    }
  }

  verifyHashChain() {
    sfx.verifySuccess();
    this.showToast('🔐 Hardware Security Seals Verified: Sequential Receipt #102 Sealed');
    const grp = this.slideObjects[2]?.userData;
    if (grp) {
      if (grp.masterKey) {
        grp.masterKey.rotation.z -= 0.5;
        setTimeout(() => grp.masterKey.rotation.z += 0.5, 300);
      }
      if (grp.chainLinks) {
        grp.chainLinks.forEach((link, idx) => {
          setTimeout(() => {
            link.scale.set(1.3, 0.8, 1.2);
            setTimeout(() => link.scale.set(1.1, 0.65, 1.0), 250);
          }, idx * 75);
        });
      }
    }
  }

  scanUserSegments() {
    sfx.verifySuccess();
    this.showToast('📍 Ecosystem Connected: Tea Merchant Standee & Transit Bus Synced');
    const grp = this.slideObjects[3]?.userData;
    if (grp) {
      if (grp.shopPin) {
        grp.shopPin.position.y += 0.35;
        setTimeout(() => grp.shopPin.position.y -= 0.35, 300);
      }
      if (grp.busPin) {
        setTimeout(() => {
          if (grp.busPin) grp.busPin.position.y += 0.35;
          setTimeout(() => { if (grp.busPin) grp.busPin.position.y -= 0.35; }, 300);
        }, 150);
      }
    }
  }

  inspectEconomics() {
    sfx.verifySuccess();
    this.showToast('💰 B2B Economics: Micro-fee Settlement & Zero Capex for Wallets');
    const grp = this.slideObjects[4]?.userData;
    if (grp) {
      if (grp.chartPillars) {
        grp.chartPillars.forEach((p, idx) => {
          p.scale.y = 1.35;
          setTimeout(() => p.scale.y = 1.0, 300 + idx * 80);
        });
      }
      if (grp.goldCoins) {
        grp.goldCoins.forEach((c, idx) => {
          c.position.y += 0.2;
          setTimeout(() => c.position.y -= 0.2, 250 + (idx % 3) * 60);
        });
      }
    }
  }

  displayImpact() {
    sfx.verifySuccess();
    this.showToast('🛡️ Network Resilience: Automated On-Device Security with Zero Connection');
    const grp = this.slideObjects[5]?.userData;
    if (grp && grp.aegisShield) {
      grp.aegisShield.scale.set(1.25, 1.25, 1.25);
      setTimeout(() => grp.aegisShield.scale.set(1.0, 1.0, 1.0), 350);
    }
  }

  igniteRevenue() {
    sfx.verifySuccess();
    this.showToast('💰 Revenue Engine Activated: 3 Streams Synced (85%+ Margin)');
    const grp = this.slideObjects[6]?.userData;
    if (grp) {
      if (grp.goldVault) {
        grp.goldVault.scale.set(1.4, 1.4, 1.4);
        setTimeout(() => grp.goldVault.scale.set(1.0, 1.0, 1.0), 350);
      }
      if (grp.vaultDial) {
        grp.vaultDial.rotation.z += Math.PI * 4;
      }
      if (grp.pillars) {
        grp.pillars.forEach((p, idx) => {
          setTimeout(() => {
            p.scale.y = 1.35;
            setTimeout(() => p.scale.y = 1.0, 250);
          }, idx * 100);
        });
      }
      if (grp.goldCoins) {
        grp.goldCoins.forEach((c) => {
          c.scale.set(1.5, 1.5, 1.5);
          setTimeout(() => c.scale.set(1.0, 1.0, 1.0), 300);
        });
      }
    }
  }

  launchPilot() {
    this.igniteRevenue();
  }

  togglePrompter(forceState) {
    const drawer = document.getElementById('prompter-drawer');
    const btn = document.getElementById('prompter-toggle-btn');
    const backdrop = document.getElementById('prompter-backdrop');
    this.isPrompterOpen = (typeof forceState === 'boolean') ? forceState : !this.isPrompterOpen;
    if (this.isPrompterOpen) sfx.panelOpen(); else sfx.panelClose();

    if (drawer) {
      drawer.classList.toggle('open', this.isPrompterOpen);
      drawer.setAttribute('aria-hidden', String(!this.isPrompterOpen));
    }
    if (btn) {
      btn.classList.toggle('active', this.isPrompterOpen);
      btn.setAttribute('aria-expanded', String(this.isPrompterOpen));
    }
    if (backdrop) {
      backdrop.classList.toggle('active', this.isPrompterOpen && window.innerWidth <= 1024);
    }
  }

  closePrompter() {
    if (this.isPrompterOpen) {
      this.togglePrompter(false);
    }
  }

  toggleFullscreen() {
    const hasNativeFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const isFS = hasNativeFS || !!this.isSimulatedFS;

    if (!isFS) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          this.setSimulatedFullscreen(true);
        });
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen().catch(() => {
          this.setSimulatedFullscreen(true);
        });
      } else {
        this.setSimulatedFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen().catch(() => {});
      }
      this.setSimulatedFullscreen(false);
    }
  }

  exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
      document.webkitExitFullscreen().catch(() => {});
    }
    this.setSimulatedFullscreen(false);
  }

  setSimulatedFullscreen(enable) {
    this.isSimulatedFS = !!enable;
    document.body.classList.toggle('fullscreen-mode', this.isSimulatedFS);
    document.documentElement.classList.toggle('fullscreen-mode', this.isSimulatedFS);
    this.syncFullscreenUI();
  }

  syncFullscreenUI() {
    const hasNativeFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!hasNativeFS && !this.isSimulatedFS) {
      document.body.classList.remove('fullscreen-mode');
      document.documentElement.classList.remove('fullscreen-mode');
    }
    const isFS = hasNativeFS || !!this.isSimulatedFS;
    document.body.classList.toggle('fullscreen-mode', isFS);
    document.documentElement.classList.toggle('fullscreen-mode', isFS);

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.textContent = isFS ? '🗗' : '⛶';
      fsBtn.title = isFS ? 'Exit Fullscreen [F]' : 'Toggle Fullscreen [F]';
      fsBtn.classList.toggle('active', isFS);
    }

    const floatingBar = document.getElementById('floating-fs-bar');
    if (floatingBar) {
      floatingBar.style.display = 'none';
    }

    this.updateResponsiveLayout();
  }

  toggleClapDetection() {
    // 1. Mandatory for iOS Safari: Synchronously instantiate & resume AudioContext inside user gesture call stack
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!this.clapAudioCtx || this.clapAudioCtx.state === 'closed') {
      this.clapAudioCtx = new AudioCtx();
    }
    if (this.clapAudioCtx && this.clapAudioCtx.state === 'suspended') {
      this.clapAudioCtx.resume().catch(() => {});
    }

    // Force-unlock iOS WebAudio hardware pipeline by playing a 1-sample silent buffer directly to destination
    try {
      if (this.clapAudioCtx) {
        const dummy = this.clapAudioCtx.createBuffer(1, 1, 22050);
        const src = this.clapAudioCtx.createBufferSource();
        src.buffer = dummy;
        src.connect(this.clapAudioCtx.destination);
        src.start(0);
      }
    } catch (_) {}

    this.executeToggleClap();
  }

  async executeToggleClap() {
    if (this.isClapNavActive) {
      this.stopClapDetection();
      this.showToast('👏 Clap Navigation: OFF');
    } else {
      const started = await this.startClapDetection();
      if (started) {
        this.showToast('👏 Clap Nav Active — Listening (Clap to advance!)');
      }
    }
  }

  async startClapDetection() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.showToast('⚠️ Microphone API not supported in this browser', true);
        return false;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.clapAudioCtx || this.clapAudioCtx.state === 'closed') {
        this.clapAudioCtx = new AudioCtx();
      }
      if (this.clapAudioCtx && this.clapAudioCtx.state === 'suspended') {
        await this.clapAudioCtx.resume().catch(() => {});
      }

      // Universal audio constraints:
      // echoCancellation: false, noiseSuppression: false, autoGainControl: false
      // are ESSENTIAL for iOS Safari so Apple Voice Processing does NOT suppress hand claps!
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false }
          });
        } catch (err2) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      this.clapStream = stream;
      const source = this.clapAudioCtx.createMediaStreamSource(stream);

      // Pre-amplifier GainNode: 2.0x calibrated gain (prevents speech from inflating into false triggers)
      const preAmp = this.clapAudioCtx.createGain();
      preAmp.gain.setValueAtTime(2.0, this.clapAudioCtx.currentTime);

      // Acoustic Bandpass Filter centered at 2,200 Hz (Q = 1.2):
      // Attenuates human voice fundamentals (85-255Hz) and main vowel formants (300-800Hz) by >30dB,
      // as well as table thumps (<200Hz) and high-pitch hiss (>6kHz),
      // while preserving 100% of the palm-clap impact resonance band (1.5kHz - 3.5kHz).
      const bandPass = this.clapAudioCtx.createBiquadFilter();
      bandPass.type = 'bandpass';
      bandPass.frequency.setValueAtTime(2200, this.clapAudioCtx.currentTime);
      bandPass.Q.setValueAtTime(1.2, this.clapAudioCtx.currentTime);

      // ScriptProcessorNode: 1024 samples (~21ms per buffer slice)
      // Runs directly on the audio engine stream without frame-skipping or requestAnimationFrame lag.
      const processor = this.clapAudioCtx.createScriptProcessor(1024, 1, 1);
      this.clapProcessor = processor;

      // CRITICAL FOR iOS SAFARI / WEBKIT:
      // Connect to destination via an inaudible gain (0.00001 = -100dB).
      // Unlike gain=0 (which causes WebKit to prune the graph as silent),
      // non-zero gain keeps the iOS audio hardware rendering clock continuously active!
      const silentGain = this.clapAudioCtx.createGain();
      silentGain.gain.setValueAtTime(0.00001, this.clapAudioCtx.currentTime);

      source.connect(preAmp);
      preAmp.connect(bandPass);
      bandPass.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(this.clapAudioCtx.destination);

      this.isClapNavActive = true;
      this.updateClapUI(true);

      let prevPeak = 0.005;
      let prevRms = 0.005;
      let noiseFloor = 0.008;

      const meterDot = document.getElementById('clap-meter-dot');
      const fsMeterDot = document.getElementById('fs-clap-meter');

      processor.onaudioprocess = (e) => {
        if (!this.isClapNavActive) return;

        const input = e.inputBuffer.getChannelData(0);
        const len = input.length;

        let peak = 0;
        let sumSq = 0;
        let zcr = 0;
        const qRms = [0, 0, 0, 0];

        // Divide 1024 samples into 4 sub-blocks of 256 samples (~5.3ms each)
        // Hand claps concentrate almost all acoustic power into a single sharp sub-block,
        // whereas speech and room sounds sustain energy uniformly across all 4 sub-blocks.
        for (let q = 0; q < 4; q++) {
          let qSum = 0;
          const qStart = q * 256;
          for (let i = qStart; i < qStart + 256; i++) {
            const val = Math.abs(input[i]);
            if (val > peak) peak = val;
            qSum += val * val;
            sumSq += val * val;
            if (i > 0 && ((input[i] >= 0 && input[i - 1] < 0) || (input[i] < 0 && input[i - 1] >= 0))) {
              zcr++;
            }
          }
          qRms[q] = Math.sqrt(qSum / 256);
        }

        const rms = Math.sqrt(sumSq / len);
        const crestFactor = peak / (rms + 0.0001);
        const deltaPeak = peak - prevPeak;

        const maxQ = Math.max(qRms[0], qRms[1], qRms[2], qRms[3]);
        const minQ = Math.min(qRms[0], qRms[1], qRms[2], qRms[3]);
        const temporalConcentration = maxQ / (minQ + 0.001);

        // Real-time audio meter animation (live visual proof of mic listening on iOS & desktop)
        if (meterDot || fsMeterDot) {
          const visualScale = Math.min(2.5, Math.max(0.6, 0.6 + rms * 15));
          const dotTransform = `scale(${visualScale})`;
          if (meterDot) meterDot.style.transform = dotTransform;
          if (fsMeterDot) fsMeterDot.style.transform = dotTransform;
        }

        // Slowly track ambient background room floor (smooth exponential average)
        noiseFloor = noiseFloor * 0.95 + rms * 0.05;

        const now = performance.now();
        const cooldown = 850; // 850ms debounce prevents double slide skips
        const cooldownPassed = (now - this.lastClapTimestamp) > cooldown;

        // TRUE CLAP SPECIFIC VERIFICATION:
        // 1. Peak >= 0.22: Rejects speech whispers, breathing, laptop typing, mouse clicks
        // 2. Delta Peak >= 0.12: Sharp step rise from baseline; speech ramps up gradually
        // 3. Crest Factor >= 3.2: Sharp impulse spike vs continuous voiced vowel waveforms
        // 4. Temporal Concentration >= 3.0: Impulse confined to <6ms vs speech sustained across 21ms
        // 5. Zero Crossing Rate >= 50: Wideband palm impact vs low table thumps, chair thuds, or mic rubs
        const isClap = (
          cooldownPassed &&
          peak >= 0.22 &&
          deltaPeak >= 0.12 &&
          crestFactor >= 3.2 &&
          temporalConcentration >= 3.0 &&
          zcr >= 50
        );

        if (isClap) {
          this.lastClapTimestamp = now;
          this.onClapDetected(peak);
        }

        prevPeak = peak;
        prevRms = rms;
      };

      return true;

    } catch (err) {
      console.warn('Microphone access error:', err);
      this.isClapNavActive = false;
      this.updateClapUI(false);
      this.showToast('⚠️ Microphone permission required for Clap Navigation', true);
      return false;
    }
  }

  stopClapDetection() {
    this.isClapNavActive = false;
    if (this.clapProcessor) {
      this.clapProcessor.onaudioprocess = null;
      try { this.clapProcessor.disconnect(); } catch (_) {}
      this.clapProcessor = null;
    }
    if (this.clapStream) {
      this.clapStream.getTracks().forEach(t => t.stop());
      this.clapStream = null;
    }
    if (this.clapAudioCtx) {
      this.clapAudioCtx.close().catch(() => {});
      this.clapAudioCtx = null;
    }
    this.updateClapUI(false);
  }

  updateClapUI(active) {
    const clapBtn = document.getElementById('clap-toggle-btn');
    if (clapBtn) {
      clapBtn.classList.toggle('active', active);
      clapBtn.title = active ? 'Clap Navigation: ON [C]' : 'Toggle Clap Navigation [C]';
    }
    const fsClapBtn = document.getElementById('fs-clap-btn');
    const fsClapLabel = document.getElementById('fs-clap-label');
    if (fsClapBtn) {
      fsClapBtn.classList.toggle('active', active);
    }
    if (fsClapLabel) {
      fsClapLabel.textContent = active ? 'Clap Nav: ON' : 'Clap Nav: OFF';
    }
  }

  onClapDetected(level = 0) {
    try {
      if (typeof sfx !== 'undefined' && sfx.clapConfirm) {
        sfx.clapConfirm();
      }
    } catch (_) {}

    const pct = Math.round(level * 100);
    this.showToast(`👏 Clap Verified! (${pct}%) ➔ Next Slide`);

    try {
      const clapBtn = document.getElementById('clap-toggle-btn');
      const fsClapBtn = document.getElementById('fs-clap-btn');
      const meterDot = document.getElementById('clap-meter-dot');
      const fsMeterDot = document.getElementById('fs-clap-meter');

      [clapBtn, fsClapBtn].forEach(btn => {
        if (btn) {
          btn.classList.add('clap-pulse');
          setTimeout(() => btn.classList.remove('clap-pulse'), 550);
        }
      });

      [meterDot, fsMeterDot].forEach(dot => {
        if (dot) {
          dot.style.background = '#00f0ff';
          dot.style.boxShadow = '0 0 16px #00f0ff';
          dot.style.transform = 'scale(3)';
          setTimeout(() => {
            if (dot) {
              dot.style.background = '#10b981';
              dot.style.boxShadow = '0 0 10px #10b981';
            }
          }, 400);
        }
      });
    } catch (_) {}

    // Advance to next slide unconditionally!
    this.nextSlide();
  }

  toggleMute() {
    sfx.muted = !sfx.muted;
    const btn = document.getElementById('sound-toggle-btn');
    btn.classList.toggle('active', !sfx.muted);
    btn.textContent = sfx.muted ? '🔇' : '🔊';
    if (!sfx.muted) sfx.click();
  }

  startTimer() {
    const timerEl = document.getElementById('hud-timer');
    setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  getSlideScale(slideId) {
    switch (slideId) {
      case 'cover':
      case 'idea':
        return 1.15;
      case 'problem':
        return 0.84;
      case 'solution':
        return 0.82;
      case 'architecture':
      case 'science':
        return 0.88;
      case 'business':
        return 0.82;
      case 'comparison':
      case 'benefits':
        return 0.80;
      case 'revenue':
      case 'revenue':
      case 'vision':
      case 'conclusion':
        return 0.84;
      case 'target-users':
        return 0.76;
      default:
        return 0.82;
    }
  }

  getSlideYOffset(slideId) {
    switch (slideId) {
      case 'cover':
      case 'idea':
        return 0;
      case 'problem':
        return -0.15;
      case 'solution':
        return 0;
      case 'architecture':
      case 'science':
        return -0.12;
      case 'business':
        return -0.22;
      case 'comparison':
      case 'benefits':
        return -0.14;
      case 'vision':
      case 'conclusion':
        return -0.15;
      case 'target-users':
        return -0.18;
      default:
        return 0;
    }
  }

  updateResponsiveLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const isPortrait = h > w;
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('fullscreen-mode'));

    if (this.camera) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(w, h);
    }

    // Auto-sync prompter backdrop on responsive changes
    const backdrop = document.getElementById('prompter-backdrop');
    if (backdrop) {
      backdrop.classList.toggle('active', this.isPrompterOpen && w <= 1024);
    }

    if (isPortrait) {
      // Mobile / Portrait Tablet: Center 3D model gracefully in upper viewport
      const scaleFactor = aspect < 0.55 ? 0.65 : 0.74;
      const posY = aspect < 0.55 ? 1.40 : 1.20;
      
      this.targetCamera = { x: 0, y: 0.1, z: aspect < 0.55 ? 7.2 : 6.6 };
      this.targetLookAt = { x: 0, y: 0.4, z: 0 };

      this.slideObjects.forEach((grp, idx) => {
        const slideData = SLIDES[idx];
        const slideId = slideData ? slideData.id : null;
        const scaleVal = this.getSlideScale(slideId) * scaleFactor;
        grp.position.set(0, posY, 0);
        grp.scale.set(scaleVal, scaleVal, scaleVal);
      });
    } else {
      // Landscape (laptop -> 4K): centre the model in the right half of the frustum and
      // shrink it only when that half is too narrow or short, keeping a true 50/50 split.
      const camZ = w < 1100 ? 5.85 : 5.75;
      this.targetCamera = { x: 0, y: 0.08, z: camZ };
      this.targetLookAt = { x: 0, y: 0, z: 0 };
      const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * camZ;
      const halfW = halfH * aspect;
      // Scenes extend right of their origin, so anchor slightly left of the right-half centre
      const posX = halfW * 0.42;
      const MODEL_RADIUS = 2.0;
      const fit = Math.min(1, (halfW * 0.44) / MODEL_RADIUS, (halfH * 0.78) / MODEL_RADIUS);

      this.slideObjects.forEach((grp, idx) => {
        const slideData = SLIDES[idx];
        const slideId = slideData ? slideData.id : null;
        const scaleVal = this.getSlideScale(slideId) * fit;
        const yOff = this.getSlideYOffset(slideId);
        grp.position.set(posX, yOff + 0.1, 0);
        grp.scale.set(scaleVal, scaleVal, scaleVal);
      });
    }

    this.slideObjects.forEach(grp => { grp.userData.baseScale = grp.scale.x; });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.updateResponsiveLayout();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateResponsiveLayout(), 120);
    });

    // Browser fullscreen state change listeners
    const onFullscreenChange = () => {
      const hasNativeFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!hasNativeFS) {
        this.isSimulatedFS = false;
        document.body.classList.remove('fullscreen-mode');
        document.documentElement.classList.remove('fullscreen-mode');
      }
      this.syncFullscreenUI();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    // First-interaction gesture: auto-start problem video with sound on first user gesture & unlock WebAudio
    const triggerAudioOnFirstGesture = () => {
      const vid = document.getElementById('problem-live-video');
      const overlay = document.getElementById('problem-start-overlay');
      if (vid && this.currentSlideIndex === 0 && (vid.paused || (overlay && !overlay.classList.contains('hidden')))) {
        this.startProblemVideoWithSound();
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.clapAudioCtx && AudioCtx) {
        this.clapAudioCtx = new AudioCtx();
      }
      if (this.clapAudioCtx && this.clapAudioCtx.state === 'suspended') {
        this.clapAudioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('click', triggerAudioOnFirstGesture, { once: true });
    window.addEventListener('touchstart', triggerAudioOnFirstGesture, { once: true, passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        const vid = document.getElementById('problem-live-video');
        const overlay = document.getElementById('problem-start-overlay');
        if (this.currentSlideIndex === 0 && vid && (vid.paused || (overlay && !overlay.classList.contains('hidden')))) {
          this.startProblemVideoWithSound();
          return;
        }
        const currentSlide = SLIDES[this.currentSlideIndex];
        if (e.key === ' ' && currentSlide && currentSlide.actionBtn) {
          this.triggerSlideAction(currentSlide.actionBtn.fn);
        } else {
          this.nextSlide();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        this.prevSlide();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'n' || e.key === 'N') {
        this.togglePrompter();
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (this.isPrompterOpen) {
          this.closePrompter();
          return;
        }
        if (document.body.classList.contains('fullscreen-mode') && !document.fullscreenElement) {
          this.setSimulatedFullscreen(false);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        this.toggleClapDetection();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleMute();
      } else if (e.key >= '1' && e.key <= '7') {
        const target = parseInt(e.key) - 1;
        if (target < this.totalSlides) this.goToSlide(target);
      }
    });

    // Mouse Drag for 3D Camera Orbit
    this.container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('fullscreen-mode'));
      if (isFS) {
        const topHud = document.querySelector('.top-hud');
        if (topHud) {
          if (e.clientY < 65) {
            topHud.classList.add('hover-active');
          } else {
            topHud.classList.remove('hover-active');
          }
        }
        const bottomHud = document.querySelector('.bottom-hud');
        if (bottomHud) {
          if (e.clientY > window.innerHeight - 80) {
            bottomHud.classList.add('hover-active');
          } else {
            bottomHud.classList.remove('hover-active');
          }
        }
      }
      if (this.isDragging) {
        const dx = e.clientX - this.prevMouseX;
        const dy = e.clientY - this.prevMouseY;
        this.orbitYaw += dx * 0.005;
        this.orbitPitch += dy * 0.005;
        this.orbitPitch = Math.max(-0.5, Math.min(0.5, this.orbitPitch));
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
      }
    });

    // Touch Support: Orbit on 3D Drag + Horizontal Swipe to Change Slides
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        this.isDragging = true;
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.prevMouseX;
        const dy = e.touches[0].clientY - this.prevMouseY;
        this.orbitYaw += dx * 0.006;
        this.orbitPitch += dy * 0.006;
        this.orbitPitch = Math.max(-0.5, Math.min(0.5, this.orbitPitch));
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      this.isDragging = false;

      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        // Intentional swipe gesture detection (horizontal, fast, > 48px)
        if (elapsed < 420 && Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
          const target = e.target;
          if (!target || (!target.closest('button') && !target.closest('.slide-dot') && !target.closest('video') && !target.closest('aside'))) {
            if (deltaX < 0) {
              this.nextSlide();
            } else {
              this.prevSlide();
            }
          }
        }
      }
    }, { passive: true });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const currentSlide = SLIDES[this.currentSlideIndex];
    const isVideoSlide = (currentSlide && (currentSlide.id === 'live-problem' || currentSlide.id === 'solution'));

    // Completely pause 3D WebGL rendering while full-screen videos are playing.
    // This gives 100% of GPU decoding & compositor throughput to the video, eliminating all lag & frame drops!
    this.updateVoiceMeter();

    if (isVideoSlide) {
      // Render one empty frame so the previous slide's model never lingers behind the video,
      // then pause WebGL so the GPU is free for smooth video decoding.
      if (this.needsVideoClear) {
        this.needsVideoClear = false;
        if (this.motes) this.motes.visible = false;
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    const time = Date.now() * 0.001;

    if (this.stars) {
      this.stars.rotation.y = time * 0.02;
      this.stars.material.opacity = 0.5 + Math.sin(time * 1.3) * 0.08;
    }

    const idx = this.currentSlideIndex;
    const grp = this.slideObjects[idx];

    // Spring-in entrance (ease-out-expo) + gentle pointer parallax on the active scene
    if (grp) {
      const k = Math.min(1, (performance.now() - this.sceneEnterTime) / 1100);
      const ease = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      const base = grp.userData.baseScale || grp.scale.x;
      grp.scale.setScalar(base * (0.82 + 0.18 * ease));
      this.pointer.sx += (this.pointer.x - this.pointer.sx) * 0.05;
      this.pointer.sy += (this.pointer.y - this.pointer.sy) * 0.05;
      grp.rotation.y = (1 - ease) * -0.7 + this.pointer.sx * 0.18;
      grp.rotation.x = this.pointer.sy * 0.08;
    }

    if (this.motes && grp) {
      this.motes.visible = true;
      this.motes.position.copy(grp.position);
      const pos = this.motes.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const seed = this.moteSeeds[i];
        let y = pos.getY(i) + seed.speed * 0.012;
        if (y > 2.2) y = -2.2;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(time * 0.8 + seed.sway) * 0.0015);
      }
      pos.needsUpdate = true;
      const fadeIn = Math.min(1, (performance.now() - this.sceneEnterTime) / 800);
      this.motes.material.opacity = 0.75 * fadeIn;
    }

    if (this.sweepLight && grp) {
      this.sweepLight.position.set(grp.position.x + Math.sin(time * 0.6) * 2.4, 1.2 + Math.cos(time * 0.45) * 0.8, 3.0);
    }

    // Dynamic 3D Scene Animations (Data-Driven, not index-dependent)
    if (grp && grp.visible && grp.userData) {
      if (grp.userData.heroPhoneGroup) {
        grp.userData.heroPhoneGroup.rotation.y = time * 0.45;
        grp.userData.heroPhoneGroup.rotation.x = Math.sin(time * 0.7) * 0.08;
        grp.userData.heroPhoneGroup.position.y = Math.sin(time * 1.8) * 0.07;

        if (grp.userData.heroCoin) {
          grp.userData.heroCoin.rotation.z = time * 2.2;
          grp.userData.heroCoin.position.y = 0.15 + Math.sin(time * 2.8) * 0.09;
          grp.userData.heroCoin.rotation.x = (Math.PI / 2) + Math.cos(time * 2.0) * 0.14;
        }
        if (grp.userData.lockGroup) {
          grp.userData.lockGroup.position.y = 1.35 + Math.sin(time * 2.2) * 0.07;
          grp.userData.lockGroup.rotation.y = Math.sin(time * 1.6) * 0.3;
        }
        if (grp.userData.ring1) {
          grp.userData.ring1.rotation.z = time * 0.9;
          grp.userData.ring1.rotation.x = (Math.PI / 3) + Math.sin(time * 1.4) * 0.12;
        }
        if (grp.userData.ring2) {
          grp.userData.ring2.rotation.z = -time * 0.7;
          grp.userData.ring2.rotation.y = (Math.PI / 4) + Math.cos(time * 1.2) * 0.12;
        }
      }
      else if (grp.userData.towerGroup) {
        grp.userData.towerGroup.rotation.y = time * 0.38;
        grp.userData.towerGroup.position.y = -0.15 + Math.sin(time * 1.6) * 0.04;
        if (grp.userData.beacon) {
          const strobe = (time * 2.8) % 1.0;
          const isFlash = (strobe < 0.12 || (strobe > 0.24 && strobe < 0.36));
          const flashScale = isFlash ? 1.7 : 0.25;
          grp.userData.beacon.scale.set(flashScale, flashScale, flashScale);
        }
        if (grp.userData.brokenWaves) {
          grp.userData.brokenWaves.forEach((w, i) => {
            w.rotation.z = time * (1.2 + i * 0.4);
            const tWave = (time * 1.4 + (w.userData.phase || i * 0.33)) % 1.0;
            const waveScale = 0.8 + tWave * 0.7;
            w.scale.set(waveScale, waveScale, waveScale);
            if (w.material) w.material.opacity = Math.max(0, 1.0 - tWave * 0.9);
          });
        }
        if (grp.userData.warningSign) {
          grp.userData.warningSign.position.y = 0.25 + Math.sin(time * 2.0) * 0.05;
          grp.userData.warningSign.rotation.y = 0.12 + Math.sin(time * 1.4) * 0.06;
        }
      }
      else if (grp.userData.phoneAFrame) {
        grp.userData.phoneAFrame.rotation.y = 0.32 + Math.sin(time * 1.5) * 0.12;
        if (grp.userData.phoneBFrame) {
          grp.userData.phoneBFrame.rotation.y = -0.32 - Math.sin(time * 1.5) * 0.12;
        }
        if (grp.userData.waveCore) {
          grp.userData.waveCore.rotation.y = time * 2;
        }
      }
      else if (grp.userData.ecoGroup) {
        grp.userData.ecoGroup.rotation.y = time * 0.35;
        grp.userData.ecoGroup.rotation.x = 0.22 + Math.sin(time * 0.6) * 0.05;
        grp.userData.ecoGroup.position.y = -0.22 + Math.sin(time * 1.6) * 0.04;

        if (grp.userData.floorRing1) grp.userData.floorRing1.rotation.z = time * 0.6;
        if (grp.userData.floorRing2) grp.userData.floorRing2.rotation.z = -time * 0.5;
        if (grp.userData.scanPyramid) {
          const pulse = 1.0 + Math.sin(time * 7.0) * 0.15;
          grp.userData.scanPyramid.scale.set(pulse, 1.0, pulse);
          if (grp.userData.scanPyramid.material) {
            grp.userData.scanPyramid.material.opacity = 0.55 + Math.sin(time * 8.0) * 0.35;
          }
        }
        if (grp.userData.ecoHUD) {
          grp.userData.ecoHUD.position.y = 1.45 + Math.sin(time * 1.5) * 0.05;
        }
        if (grp.userData.shopPin) {
          grp.userData.shopPin.position.y = 1.85 + Math.abs(Math.sin(time * 2.6)) * 0.12;
        }
        if (grp.userData.busPin) {
          grp.userData.busPin.position.y = 1.45 + Math.abs(Math.sin(time * 2.6 + 1.2)) * 0.12;
        }
        if (grp.userData.busWheels) {
          grp.userData.busWheels.forEach(w => {
            w.rotation.z = -time * 4.5;
          });
        }
        if (grp.userData.tokenArcCoins) {
          grp.userData.tokenArcCoins.forEach(tc => {
            const t = (time * 0.75 + tc.userData.phase) % 1;
            tc.position.x = -1.15 + t * 2.2;
            tc.position.y = -0.2 + Math.sin(t * Math.PI) * 0.95;
            tc.position.z = -0.3 + t * 0.75;
            tc.rotation.y = time * 5.0;
          });
        }
      }
      else if (grp.userData.cryptoGroup) {
        grp.userData.cryptoGroup.rotation.y = time * 0.36;
        grp.userData.cryptoGroup.rotation.x = 0.10 + Math.sin(time * 0.6) * 0.04;
        grp.userData.cryptoGroup.position.y = -0.22 + Math.sin(time * 1.8) * 0.04;

        if (grp.userData.plinthRing) grp.userData.plinthRing.rotation.z = time * 0.7;
        if (grp.userData.cryptoLaser) {
          grp.userData.cryptoLaser.material.opacity = 0.6 + Math.sin(time * 10.0) * 0.35;
          grp.userData.cryptoLaser.scale.x = 1.0 + Math.sin(time * 12.0) * 0.25;
          grp.userData.cryptoLaser.scale.z = 1.0 + Math.sin(time * 12.0) * 0.25;
        }
        if (grp.userData.cryptoHUD) {
          grp.userData.cryptoHUD.position.y = 1.45 + Math.sin(time * 1.6) * 0.05;
        }
        if (grp.userData.masterKey) {
          grp.userData.masterKey.position.y = 0.75 + Math.sin(time * 2.0) * 0.10;
          grp.userData.masterKey.rotation.y = Math.sin(time * 1.5) * 0.35;
          grp.userData.masterKey.rotation.z = -0.35 + Math.cos(time * 1.4) * 0.08;
        }
        if (grp.userData.chainBlocks) {
          grp.userData.chainBlocks.forEach((b, bi) => {
            b.rotation.y = time * 2.0 + bi * 0.5;
            b.rotation.x = Math.sin(time * 2.2 + bi) * 0.25;
          });
        }
        if (grp.userData.chainLinks) {
          grp.userData.chainLinks.forEach((link, l) => {
            link.position.y = 0.12 + (l % 2 === 0 ? 0.06 : -0.06) + Math.sin(time * 2.8 + l * 0.9) * 0.08;
            if (l % 2 === 0) {
              link.rotation.y = Math.sin(time * 2.2 + l) * 0.25;
            } else {
              link.rotation.z = Math.sin(time * 2.2 + l) * 0.25;
            }
          });
        }
      }
      else if (grp.userData.econGroup) {
        grp.userData.econGroup.rotation.y = time * 0.38;
        grp.userData.econGroup.rotation.x = 0.08 + Math.sin(time * 0.5) * 0.03;
        grp.userData.econGroup.position.y = -0.32 + Math.sin(time * 1.5) * 0.04;

        if (grp.userData.apexCoin) {
          grp.userData.apexCoin.rotation.z = time * 2.5;
          grp.userData.apexCoin.position.y = 1.62 + Math.sin(time * 3.0) * 0.06;
        }
        if (grp.userData.apexHalo) {
          grp.userData.apexHalo.rotation.z = -time * 1.5;
          grp.userData.apexHalo.scale.setScalar(1.0 + Math.sin(time * 3.5) * 0.08);
        }
        if (grp.userData.lightColumns) {
          grp.userData.lightColumns.forEach((col, ci) => {
            col.scale.y = 0.8 + Math.sin(time * 5.0 + ci * 1.4) * 0.25;
            if (col.material) col.material.opacity = 0.7 + Math.sin(time * 6.0 + ci) * 0.25;
          });
        }
        if (grp.userData.goldCoins) {
          grp.userData.goldCoins.forEach((c, i) => {
            c.rotation.y = time * 1.5 + i * 0.25;
          });
        }
        if (grp.userData.arrowHead) {
          const pulse = 1.0 + Math.sin(time * 4.0) * 0.18;
          grp.userData.arrowHead.scale.set(pulse, pulse, pulse);
        }
      }
      else if (grp.userData.impactGroup) {
        grp.userData.impactGroup.rotation.y = time * 0.38;
        grp.userData.impactGroup.rotation.x = Math.sin(time * 0.6) * 0.05;
        grp.userData.impactGroup.position.y = -0.15 + Math.sin(time * 1.6) * 0.04;

        if (grp.userData.forceDome) {
          grp.userData.forceDome.rotation.y = time * 0.28;
        }
        if (grp.userData.satDish) {
          grp.userData.satDish.rotation.z = Math.sin(time * 1.6) * 0.22;
          grp.userData.satDish.rotation.y = Math.cos(time * 1.2) * 0.18;
        }
        if (grp.userData.disasterHUD) {
          grp.userData.disasterHUD.position.y = 1.45 + Math.sin(time * 1.5) * 0.05;
        }
        const phase = (time * 2.4) % 1.0;
        let beat = 0;
        if (phase < 0.15) beat = Math.sin((phase / 0.15) * Math.PI) * 0.40;
        else if (phase >= 0.22 && phase < 0.35) beat = Math.sin(((phase - 0.22) / 0.13) * Math.PI) * 0.25;
        
        if (grp.userData.ekgTube) {
          grp.userData.ekgTube.scale.set(1.0 + beat, 1.0 + beat, 1.0 + beat);
        }
        if (grp.userData.crossH && grp.userData.crossV) {
          const crossGlow = 0.75 + beat * 0.8;
          grp.userData.crossH.material.emissiveIntensity = crossGlow;
          grp.userData.crossV.material.emissiveIntensity = crossGlow;
        }
        if (grp.userData.forceRing1) grp.userData.forceRing1.rotation.z = time * 1.0;
        if (grp.userData.forceRing2) grp.userData.forceRing2.rotation.z = -time * 0.8;
      }
      else if (grp.userData.revenueGroup) {
        grp.userData.revenueGroup.rotation.y = time * 0.35;
        grp.userData.revenueGroup.rotation.x = Math.sin(time * 0.5) * 0.04;
        grp.userData.revenueGroup.position.y = -0.10 + Math.sin(time * 1.5) * 0.04;

        if (grp.userData.goldVault) {
          grp.userData.goldVault.rotation.y = time * 0.8;
          grp.userData.goldVault.position.y = 1.85 + Math.sin(time * 2.2) * 0.05;
        }
        if (grp.userData.vaultDial) {
          grp.userData.vaultDial.rotation.z = time * 2.2;
        }
        if (grp.userData.bankShield) {
          grp.userData.bankShield.rotation.y = -time * 0.9;
          grp.userData.bankShield.position.y = 0.85 + Math.sin(time * 2.5) * 0.05;
        }
        if (grp.userData.splitOrbs) {
          grp.userData.splitOrbs.forEach((orb, oi) => {
            orb.position.y = 0.75 + Math.sin(time * 3.0 + oi * Math.PI) * 0.08;
            orb.rotation.y = time * 1.8 + oi;
          });
        }
        if (grp.userData.goldCoins) {
          grp.userData.goldCoins.forEach((coin, ci) => {
            const angle = time * 1.1 + ci * (Math.PI / 4);
            const radius = 1.65;
            coin.position.x = Math.cos(angle) * radius;
            coin.position.z = Math.sin(angle) * radius;
            coin.position.y = 0.25 + Math.sin(time * 2.5 + ci) * 0.2;
            coin.rotation.y = time * 2.8 + ci;
          });
        }
        if (grp.userData.halo1) grp.userData.halo1.rotation.z = time * 0.8;
        if (grp.userData.halo2) grp.userData.halo2.rotation.z = -time * 0.6;
      }
      else if (grp.userData.finaleGroup) {
        grp.userData.finaleGroup.rotation.y = time * 0.40;
      }
    }

    // Automatic cinematic drift when user is not manually dragging
    if (!this.isDragging) {
      this.autoOrbitTime = (this.autoOrbitTime || 0) + 0.005;
      const autoYaw = Math.sin(this.autoOrbitTime * 0.6) * 0.10;
      const autoPitch = Math.cos(this.autoOrbitTime * 0.5) * 0.03;

      this.orbitYaw += (autoYaw - this.orbitYaw) * 0.03;
      this.orbitPitch += (autoPitch - this.orbitPitch) * 0.03;
    }

    // Camera smoothing with orbit controls
    const baseCamX = this.targetCamera.x + Math.sin(this.orbitYaw) * 0.7;
    const baseCamY = this.targetCamera.y + this.orbitPitch * 0.3;
    const baseCamZ = this.targetCamera.z + Math.cos(this.orbitYaw) * 0.7;

    this.camera.position.x += (baseCamX - this.camera.position.x) * 0.06;
    this.camera.position.y += (baseCamY - this.camera.position.y) * 0.06;
    this.camera.position.z += (baseCamZ - this.camera.position.z) * 0.06;

    this.currentLookAt.x += (this.targetLookAt.x - this.currentLookAt.x) * 0.06;
    this.currentLookAt.y += (this.targetLookAt.y - this.currentLookAt.y) * 0.06;
    this.currentLookAt.z += (this.targetLookAt.z - this.currentLookAt.z) * 0.06;

    this.camera.lookAt(this.currentLookAt.x, this.currentLookAt.y, this.currentLookAt.z);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.presentation = new PresentationApp();
});
