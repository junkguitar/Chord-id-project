// app.js — Jazz Chord Trainer using Tone.Sampler + Salamander Grand + Upright Bass

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Music theory helpers ----------

  const NOTE_TO_SEMITONE = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
    'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
  };

  const SEMITONE_TO_NOTE_SHARP = [
    'C','C#','D','D#','E','F','F#','G','G#','A','A#','B'
  ];

  const CHORD_QUALITIES = {
    maj7:  [0, 4, 7, 11],
    '6/9': [0, 4, 7, 9, 14],
    m7:    [0, 3, 7, 10],
    m9:    [0, 3, 7, 10, 14],
    m11:   [0, 3, 7, 10, 14, 17],
    7:     [0, 4, 7, 10],
    13:    [0, 4, 7, 10, 14, 21],
    '7b9': [0, 4, 7, 10, 13],
    '7#9': [0, 4, 7, 10, 15],
    '7#11':[0, 4, 7, 10, 18],
    '7b13':[0, 4, 7, 10, 20],
    '7alt':[0, 4, 7, 10, 13, 15, 18, 20],
    m7b5:  [0, 3, 6, 10],
    dim7:  [0, 3, 6, 9],
    mMaj7: [0, 3, 7, 11],
  };

  const SCALE_SUGGESTIONS = {
    maj7:  "Major (Ionian) or Lydian (#11)",
    '6/9': "Major pentatonic / Major scale",
    m7:    "Dorian / Aeolian; minor pentatonic/blues",
    m9:    "Dorian with 9; melodic minor on IV",
    m11:   "Dorian; avoid natural 3",
    7:     "Mixolydian; blues; bebop dominant",
    13:    "Mixolydian with 13; avoid 11 or #11",
    '7b9': "Phrygian dominant or altered; dim H-W",
    '7#9': "Altered scale; minor pentatonic superimposition",
    '7#11':"Lydian dominant (melodic minor on V)",
    '7b13':"Mixolydian b13 (melodic minor Mode 5)",
    '7alt':"Altered (melodic minor b7) / dim H-W",
    m7b5:  "Locrian / Locrian #2",
    dim7:  "Whole-Half diminished",
    mMaj7: "Melodic minor (ascending)",
  };

  const ROOTS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  // ---------- UI elements ----------

  const qualitiesRow = document.getElementById('qualitiesRow');
  const keysRow      = document.getElementById('keysRow');
  const statusLine   = document.getElementById('statusLine');
  const chordLabel   = document.getElementById('chordLabel');
  const scaleHint    = document.getElementById('scaleHint');
  const logBox       = document.getElementById('logBox');

  const btnStartAudio   = document.getElementById('btnStartAudio');
  const btnStartSession = document.getElementById('btnStartSession');
  const btnNextChord    = document.getElementById('btnNextChord');
  const btnStopSession  = document.getElementById('btnStopSession');
  const bpmInput        = document.getElementById('bpmInput');
  const sustainInput    = document.getElementById('sustainInput');

  // Add Bass ON/OFF chip
  const playbackCard = document.querySelector(".card");
  const bassChip = document.createElement("div");
  bassChip.className = "chip";
  bassChip.textContent = "Bass Root";
  bassChip.style.marginTop = "10px";
  bassChip.style.display = "inline-block";
  bassChip.dataset.value = "bass";
  bassChip.addEventListener("click", () => {
    bassChip.classList.toggle("active");
    log("Bass = " + (bassChip.classList.contains("active") ? "ON" : "OFF"));
  });
  playbackCard.appendChild(bassChip);

  // ---------- Logging ----------

  function log(msg) {
    console.log('[JCT]', msg);
    if (!logBox) return;
    logBox.textContent += msg + '\n';
    logBox.scrollTop = logBox.scrollHeight;
  }

  // ---------- Build chips for qualities & keys ----------

  function makeChip(label, value, container, cls) {
    const div = document.createElement('div');
    div.className = 'chip ' + cls;
    div.textContent = label;
    div.dataset.value = value;
    div.addEventListener('click', () => {
      div.classList.toggle('active');
    });
    container.appendChild(div);
  }

  Object.keys(CHORD_QUALITIES).forEach(q => {
    makeChip(q, q, qualitiesRow, 'quality-chip');
  });

  ROOTS.forEach(r => {
    makeChip(r, r, keysRow, 'key-chip');
  });

  // ---------- Tone.js sampler ----------

  let sampler = null;
  let bass = null;
  let audioReady = false;
  let sessionActive = false;
  let vampTimer = null;
  let currentChord = null;

  async function ensureAudio() {
    if (audioReady) return;
    await Tone.start();
    log('Audio context started.');

    // Piano
    sampler = new Tone.Sampler({
      urls: {
        A0:'A0.mp3', C1:'C1.mp3', 'D#1':'Ds1.mp3', 'F#1':'Fs1.mp3', A1:'A1.mp3',
        C2:'C2.mp3', 'D#2':'Ds2.mp3', 'F#2':'Fs2.mp3', A2:'A2.mp3',
        C3:'C3.mp3', 'D#3':'Ds3.mp3', 'F#3':'Fs3.mp3', A3:'A3.mp3',
        C4:'C4.mp3', 'D#4':'Ds4.mp3', 'F#4':'Fs4.mp3', A4:'A4.mp3',
        C5:'C5.mp3', 'D#5':'Ds5.mp3', 'F#5':'Fs5.mp3', A5:'A5.mp3',
        C6:'C6.mp3', 'D#6':'Ds6.mp3', 'F#6':'Fs6.mp3', A6:'A6.mp3',
        C7:'C7.mp3', 'D#7':'Ds7.mp3', 'F#7':'Fs7.mp3', A7:'A7.mp3',
        C8:'C8.mp3'
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload: () => log('Grand piano loaded.')
    }).toDestination();

    // Upright Bass
    bass = new Tone.Sampler({
      urls: {
        C1: "C1.mp3",
        F1: "F1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        F2: "F2.mp3",
        A2: "A2.mp3"
      },
      baseUrl: "https://raw.githubusercontent.com/junkguitar/bass-samples/main/upright/",
      onload: () => log("Bass loaded.")
    }).toDestination();

    audioReady = true;
    statusLine.textContent = 'Audio ready. Press Start Session.';
  }

  // ---------- Music helpers ----------

  function midiToName(midi) {
    const octave = Math.floor(midi / 12) - 1;
    const name = SEMITONE_TO_NOTE_SHARP[midi % 12];
    return `${name}${octave}`;
  }

  function choose(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getSelectedValues(selector, fallback) {
    const chips = Array.from(document.querySelectorAll(selector + '.active'));
    if (!chips.length) return fallback.slice();
    return chips.map(c => c.dataset.value);
  }

  function pickChord() {
    const allQualities = Object.keys(CHORD_QUALITIES);
    const allKeys = ROOTS;

    const qualities = getSelectedValues('.quality-chip', allQualities);
    const keys      = getSelectedValues('.key-chip', allKeys);

    const quality  = choose(qualities);
    const rootName = choose(keys);

    const intervals = CHORD_QUALITIES[quality];
    let ints = intervals;

    // Random subset for 7alt
    if (quality === '7alt') {
      const base = [0,4,7,10];
      const alts = [13,15,18,20];
      const picked = [];
      while (picked.length < 2) {
        const x = choose(alts);
        if (!picked.includes(x)) picked.push(x);
      }
      ints = base.concat(picked);
    }

    const rootMidi = 48 + (NOTE_TO_SEMITONE[rootName] || 0); // around C3
    const midiNotes = ints.map(iv => rootMidi + iv);
    const noteNames = midiNotes.map(midiToName);

    return { rootName, quality, noteNames };
  }

  // ---------- Play chord (piano + optional bass) ----------

  function playChord(chord, mode, sustainSeconds) {
    if (!sampler) return;
    const now = Tone.now();

    // BASS (root only)
    if (bass && bassChip.classList.contains("active")) {
      const root = chord.noteNames[0];            // "C4"
      const pitchClass = root.replace(/[0-9]/g, "");  // "C"
      const bassNote = pitchClass + "2";              // "C2"
      bass.triggerAttackRelease(bassNote, sustainSeconds * 1.3, now);
    }

    // PIANO
    if (mode === 'arp' || mode === 'both') {
      const step = 0.12;
      chord.noteNames.forEach((n, i) => {
        sampler.triggerAttackRelease(n, sustainSeconds, now + i * step);
      });
    }
    if (mode === 'block' || mode === 'both') {
      chord.noteNames.forEach(n => {
        sampler.triggerAttackRelease(n, sustainSeconds, now);
      });
    }
  }

  // ---------- Session control ----------

  function startVampLoop() {
    clearInterval(vampTimer);
    const sustainSeconds = parseFloat(sustainInput.value) || 3;
    const bpm = parseFloat(bpmInput.value) || 96;
    const secPerBeat = 60 / bpm;
    const vampPeriod = Math.max(sustainSeconds, secPerBeat * 4);

    const mode = (document.querySelector('input[name="playbackMode"]:checked') || {}).value || 'block';

    playChord(currentChord, mode, sustainSeconds);
    vampTimer = setInterval(() => {
      playChord(currentChord, mode, sustainSeconds);
    }, vampPeriod * 1000);
  }

  function nextChord() {
    if (!sessionActive) return;
    currentChord = pickChord();

    const label = `${currentChord.rootName}${currentChord.quality}`;
    chordLabel.textContent = label;
    statusLine.textContent = 'Chord active.';
    scaleHint.textContent = SCALE_SUGGESTIONS[currentChord.quality] || '';

    startVampLoop();
  }

  // ---------- Button handlers ----------

  btnStartAudio.addEventListener('click', async () => {
    if (audioReady) {
      statusLine.textContent = 'Audio already ready.';
      return;
    }
    statusLine.textContent = 'Loading piano & bass...';
    await ensureAudio();
  });

  btnStartSession.addEventListener('click', () => {
    if (!audioReady) {
      statusLine.textContent = 'Start Audio first.';
      return;
    }
    sessionActive = true;
    log('Session started.');
    nextChord();
  });

  btnNextChord.addEventListener('click', () => {
    if (!audioReady) {
      statusLine.textContent = 'Tap Start Audio first.';
      return;
    }
    if (!sessionActive) {
      sessionActive = true;
      log("Auto-starting session via Next button.");
    }
    nextChord();
  });

  btnStopSession.addEventListener('click', () => {
    sessionActive = false;
    clearInterval(vampTimer);
    chordLabel.textContent = '—';
    scaleHint.textContent = '';
    statusLine.textContent = 'Session stopped.';
    log('Session stopped.');
  });

  // SPACE (desktop)
  window.addEventListener('keydown', ev => {
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (sessionActive) nextChord();
    }
  });

});
