// Jazz Chord Trainer — Salamander piano with low-root doubling
// Bass Root uses the same grand piano samples in a lower octave,
// so it sustains and decays with the chord.

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Theory data ----------

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
    13:    [0, 4, 7, 10, 21],
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

  // ---------- DOM elements ----------

  const btnStartAudio   = document.getElementById('btnStartAudio');
  const btnStartSession = document.getElementById('btnStartSession');
  const btnNextChord    = document.getElementById('btnNextChord');
  const btnStopSession  = document.getElementById('btnStopSession');
  const btnBassToggle   = document.getElementById('btnBassToggle');

  const bpmInput        = document.getElementById('bpmInput');
  const sustainInput    = document.getElementById('sustainInput');

  const qualitiesRow    = document.getElementById('qualitiesRow');
  const keysRow         = document.getElementById('keysRow');

  const chordLabel      = document.getElementById('chordLabel');
  const scaleHint       = document.getElementById('scaleHint');
  const statusLine      = document.getElementById('statusLine');

  function log(msg) {
    console.log('[JCT]', msg);
    statusLine.textContent = msg;
  }

  // ---------- Build chips ----------

  function makeChip(label, container) {
    const div = document.createElement('div');
    div.className = 'chip active';
    div.textContent = label;
    div.dataset.value = label;
    div.addEventListener('click', () => {
      div.classList.toggle('active');
    });
    container.appendChild(div);
  }

  Object.keys(CHORD_QUALITIES).forEach(q => makeChip(q, qualitiesRow));
  ROOTS.forEach(r => makeChip(r, keysRow));

  function getActive(container, fallbackList) {
    const chips = Array.from(container.querySelectorAll('.chip.active'));
    if (!chips.length) return fallbackList.slice();
    return chips.map(c => c.dataset.value);
  }

  // ---------- Tone.js instruments ----------

  let sampler = null;
  let audioReady = false;

  async function ensureAudio() {
    if (audioReady) return;
    await Tone.start();
    log('Audio context started. Loading piano...');

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
      onload: () => log('Grand piano loaded. Ready.')
    }).toDestination();

    audioReady = true;
  }

  // ---------- Helpers ----------

  function midiToName(midi) {
    const octave = Math.floor(midi / 12) - 1;
    const name = SEMITONE_TO_NOTE_SHARP[midi % 12];
    return `${name}${octave}`;
  }

  function pickChord() {
    const activeQualities = getActive(qualitiesRow, Object.keys(CHORD_QUALITIES));
    const activeRoots     = getActive(keysRow, ROOTS);

    const q = activeQualities[Math.floor(Math.random()*activeQualities.length)];
    const r = activeRoots[Math.floor(Math.random()*activeRoots.length)];

    let intervals = CHORD_QUALITIES[q];

    if (q === '7alt') {
      const base = [0,4,7,10];
      const alts = [13,15,18,20];
      const picked = [];
      while (picked.length < 2) {
        const x = alts[Math.floor(Math.random()*alts.length)];
        if (!picked.includes(x)) picked.push(x);
      }
      intervals = base.concat(picked);
    }

    const rootMidi = 48 + (NOTE_TO_SEMITONE[r] || 0); // around C3
    const midiNotes = intervals.map(iv => rootMidi + iv);
    const noteNames = midiNotes.map(midiToName);

    return { rootMidi, rootName: r, quality: q, noteNames };
  }

  function showChordInfo() {
    if (!currentChord) return;
    const label = `${currentChord.rootName}${currentChord.quality}`;
    chordLabel.textContent = label;
    scaleHint.textContent = SCALE_SUGGESTIONS[currentChord.quality] || '';
    log(`Chord: ${label}`);
  }

  // ---------- Playback ----------

  let sessionActive = false;
  let currentChord = null;
  let loopTimer = null;
  let bassEnabled = false;

  function playChordNow() {
    if (!sampler || !currentChord) return;
    const sustainSec = parseFloat(sustainInput.value) || 3;
    const now = Tone.now();

    const modeRadio = document.querySelector('input[name="playbackMode"]:checked');
    const mode = modeRadio ? modeRadio.value : 'block';

    // --- Low root using the same piano sampler ---
    if (bassEnabled) {
      // rootMidi is main register (~C3). Drop one octave for bass.
      const bassMidi = currentChord.rootMidi - 12;
      const bassNote = midiToName(bassMidi);
      sampler.triggerAttackRelease(bassNote, sustainSec, now);
    }

    // --- Chord in main register ---
    if (mode === 'block' || mode === 'both') {
      currentChord.noteNames.forEach(n => {
        sampler.triggerAttackRelease(n, sustainSec, now);
      });
    }

    if (mode === 'arp' || mode === 'both') {
      const step = 0.12;
      currentChord.noteNames.forEach((n, i) => {
        sampler.triggerAttackRelease(n, sustainSec, now + i*step);
      });
    }
  }

  function startVampLoop() {
    if (!currentChord) return;
    clearInterval(loopTimer);

    const bpm = parseFloat(bpmInput.value) || 96;
    const beatsPerBar = 4;
    const secPerBeat = 60.0 / bpm;
    const sustainSec = parseFloat(sustainInput.value) || 3;
    const period = Math.max(sustainSec, beatsPerBar * secPerBeat);

    playChordNow();
    loopTimer = setInterval(playChordNow, period * 1000);
  }

  // ---------- Button handlers ----------

  btnStartAudio.addEventListener('click', async () => {
    await ensureAudio();
  });

  btnStartSession.addEventListener('click', async () => {
    await ensureAudio();
    sessionActive = true;
    currentChord = pickChord();
    showChordInfo();
    startVampLoop();
  });

  btnNextChord.addEventListener('click', async () => {
    if (!audioReady) {
      await ensureAudio();
    }
    if (!sessionActive) sessionActive = true;
    currentChord = pickChord();
    showChordInfo();
    startVampLoop();
  });

  btnStopSession.addEventListener('click', () => {
    sessionActive = false;
    clearInterval(loopTimer);
    log('Stopped.');
  });

  btnBassToggle.addEventListener('click', () => {
    bassEnabled = !bassEnabled;
    if (bassEnabled) {
      btnBassToggle.textContent = 'Bass Root: On';
      btnBassToggle.style.backgroundColor = '#2f6bff';
      btnBassToggle.style.color = '#fff';
    } else {
      btnBassToggle.textContent = 'Bass Root: Off';
      btnBassToggle.style.backgroundColor = '';
      btnBassToggle.style.color = '';
    }
    if (sessionActive && currentChord) {
      startVampLoop();
    }
  });

  // SPACE for Next Chord (desktop)
  window.addEventListener('keydown', ev => {
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (sessionActive) {
        btnNextChord.click();
      }
    }
  });

});
