// =======================
//  High-Quality Audio Engine
//  Grand piano samples + metronome + chord vamps
// =======================

(function () {
  // Expose a single global object
  const AudioEngine = {};
  window.AudioEngine = AudioEngine;

  // ---------- Private state ----------
  let audioCtx = null;
  let masterGain = null;
  let metroGain = null;
  let sampleManager = null;
  let currentVampTimer = null;

  // Config
  const MIN_MIDI = 36;
  const MAX_MIDI = 84;

  // ---------- Utilities ----------
  function log(...args) {
    console.log("[AudioEngine]", ...args);
  }

  function ensureCtxTimeOffset(t) {
    const now = audioCtx.currentTime;
    if (typeof t !== "number" || t < now + 0.001) {
      return now + 0.001;
    }
    return t;
  }

  // ---------- Sample Manager ----------
  class SampleManager {
    constructor(ctx, outputNode) {
      this.ctx = ctx;
      this.output = outputNode;
      this.buffers = new Map(); // midi -> AudioBuffer
    }

    buildSampleUrls(midi) {
      const n = String(midi);
      const n3 = n.padStart(3, "0");
      return [
        `piano-samples/midi-${n}.wav`,
        `piano-samples/piano-${n}.wav`,
        `piano-samples/${n}.wav`,
        `piano-samples/${n3}.wav`,
        `piano-samples/piano_${n}.wav`,
      ];
    }

    async loadNote(midi) {
      if (this.buffers.has(midi)) {
        return this.buffers.get(midi);
      }
      const urls = this.buildSampleUrls(midi);
      for (const url of urls) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const arr = await resp.arrayBuffer();
          const buf = await this.ctx.decodeAudioData(arr);
          this.buffers.set(midi, buf);
          log(`Loaded sample for MIDI ${midi} from ${url}`);
          return buf;
        } catch (e) {
          // try next pattern
        }
      }
      log(`⚠️ No sample found for MIDI ${midi}`);
      this.buffers.set(midi, null);
      return null;
    }

    async preloadRange(minMidi, maxMidi) {
      for (let m = minMidi; m <= maxMidi; m++) {
        await this.loadNote(m);
      }
    }

    playNote(midi, when, duration, velocity = 0.9) {
      const buf = this.buffers.get(midi);
      if (!buf) return;

      when = ensureCtxTimeOffset(when);
      const ctx = this.ctx;

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const g = ctx.createGain();
      const amp = Math.max(0.0, Math.min(1.0, velocity));

      const attack = 0.005;
      const release = 0.35;

      g.gain.setValueAtTime(0.0, when);
      g.gain.linearRampToValueAtTime(amp, when + attack);
      g.gain.setTargetAtTime(0.0, when + duration, release);

      src.connect(g).connect(this.output);

      src.start(when);
      src.stop(when + duration + 2.0);
    }
  }

  // ---------- Metronome ----------
  function scheduleClick(time, isDownbeat) {
    time = ensureCtxTimeOffset(time);
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    const freq = isDownbeat ? 2000 : 1400;
    const dur = 0.05;
    const peak = isDownbeat ? 0.7 : 0.5;

    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(g).connect(metroGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  // ---------- Chord scheduling ----------
  function scheduleBlockChord(midiNotes, startTime, sustainSeconds) {
    const baseTime = ensureCtxTimeOffset(startTime);
    const micro = 0.003; // small spread to hear each tone
    midiNotes.forEach((m, i) => {
      sampleManager.playNote(m, baseTime + i * micro, sustainSeconds, 0.95);
    });
  }

  function scheduleArpeggio(midiNotes, startTime, sustainSeconds, secPerBeat) {
    const baseTime = ensureCtxTimeOffset(startTime);
    const span = Math.min(secPerBeat * 0.9, 0.7); // how long to sweep through notes
    const step = Math.max(0.04, span / Math.max(1, midiNotes.length));

    midiNotes.forEach((m, i) => {
      const t = baseTime + i * step;
      sampleManager.playNote(m, t, sustainSeconds * 0.9, 0.95);
    });
  }

  // ---------- Vamp loop ----------
  function startChordVamp(midiNotes, options) {
    if (!audioCtx || !sampleManager) {
      log("AudioEngine not initialized");
      return;
    }
    // stop existing loop
    if (currentVampTimer) {
      clearInterval(currentVampTimer);
      currentVampTimer = null;
    }

    const bpm = options.bpm || 96;
    const bars = options.bars || 8;
    const sustain = options.sustain || 3.0;
    const mode = options.mode || "block"; // "block", "arpeggio", "both"
    const metronome = !!options.metronome;
    const swing = !!options.swing;

    const beatsPerBar = 4;
    const secPerBeat = 60 / bpm;
    const loopDur = bars * beatsPerBar * secPerBeat;

    function scheduleOneLoop(offsetSeconds) {
      const startBase = ensureCtxTimeOffset(audioCtx.currentTime + offsetSeconds);
      for (let b = 0; b < bars * beatsPerBar; b++) {
        const beatIndex = b % beatsPerBar;
        let t = startBase + b * secPerBeat;
        if (swing && (beatIndex === 1 || beatIndex === 3)) {
          t += secPerBeat * 0.07; // light swing on off-beats
        }

        if (mode === "block" || mode === "both") {
          scheduleBlockChord(midiNotes, t, sustain);
        }
        if (mode === "arpeggio" || mode === "both") {
          scheduleArpeggio(midiNotes, t, sustain, secPerBeat);
        }
        if (metronome) {
          scheduleClick(t, beatIndex === 0);
        }
      }
    }

    // schedule first loop immediately
    scheduleOneLoop(0.05);

    // schedule repeated loops
    currentVampTimer = setInterval(() => {
      scheduleOneLoop(0.05);
    }, loopDur * 1000);
  }

  // ---------- AudioContext init / teardown ----------
  function unlockContext(ctx) {
    // iOS requires a sound to start in a user gesture
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  }

  async function init() {
    if (audioCtx && audioCtx.state !== "closed") {
      await audioCtx.resume();
      return;
    }

    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      alert("Web Audio API not supported in this browser.");
      return;
    }

    audioCtx = new Ctor({ latencyHint: "interactive" });

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(audioCtx.destination);

    metroGain = audioCtx.createGain();
    metroGain.gain.value = 0.7;
    metroGain.connect(masterGain);

    sampleManager = new SampleManager(audioCtx, masterGain);

    unlockContext(audioCtx);

    log("Preloading piano samples...");
    await sampleManager.preloadRange(MIN_MIDI, MAX_MIDI);
    log("Piano samples ready.");
  }

  async function stopAll() {
    if (currentVampTimer) {
      clearInterval(currentVampTimer);
      currentVampTimer = null;
    }
    if (audioCtx && audioCtx.state !== "closed") {
      try {
        await audioCtx.close();
      } catch (e) {
        // ignore
      }
    }
    audioCtx = null;
    masterGain = null;
    metroGain = null;
    sampleManager = null;
  }

  // ---------- Public API ----------
  AudioEngine.init = init; // must be called from a user gesture (e.g., Start Audio click)

  /**
   * Start a looping chord vamp.
   * @param {number[]} midiNotes - chord voicing as MIDI numbers.
   * @param {object} options:
   *   - bpm: number
   *   - bars: number
   *   - sustain: seconds
   *   - mode: "block" | "arpeggio" | "both"
   *   - metronome: boolean
   *   - swing: boolean
   */
  AudioEngine.playChordVamp = function (midiNotes, options) {
    startChordVamp(midiNotes, options || {});
  };

  AudioEngine.stopAll = stopAll;

  AudioEngine.isReady = function () {
    return !!(audioCtx && sampleManager);
  };
})();