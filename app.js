// ---------------------------------------
// GLOBALS
// ---------------------------------------
let sampler = null;     // piano
let bass = null;        // bass sampler
let audioStarted = false;

let sessionActive = false;
let currentChord = null;
let loopTimer = null;
let bassEnabled = false;

// DOM elements
const btnStartAudio   = document.getElementById('btnStartAudio');
const btnStartSession = document.getElementById('btnStartSession');
const btnNextChord    = document.getElementById('btnNextChord');
const btnStopSession  = document.getElementById('btnStopSession');
const statusLine      = document.getElementById('statusLine');

const bpmInput        = document.getElementById('bpmInput');
const sustainInput    = document.getElementById('sustainInput');

// ---------------------------------------
// Logging helper
// ---------------------------------------
function log(msg) {
  console.log("[APP]", msg);
  if (statusLine) statusLine.textContent = msg;
}

// ---------------------------------------
// Insert Bass Toggle Button Safely
// ---------------------------------------
let btnBassToggle = null;

(function insertBassButton() {
  const playbackSection = document.querySelector("#playbackSection");
  if (!playbackSection) {
    console.error("Could not find playbackSection");
    return;
  }

  const row = document.createElement("div");
  row.className = "field-row";

  btnBassToggle = document.createElement("button");
  btnBassToggle.className = "btn";
  btnBassToggle.textContent = "Bass Root: Off";
  btnBassToggle.style.padding = "8px 14px";

  row.appendChild(btnBassToggle);
  playbackSection.appendChild(row);
})();

// ---------------------------------------
// Bass Toggle Logic
// ---------------------------------------
if (btnBassToggle) {
  btnBassToggle.addEventListener("click", () => {
    bassEnabled = !bassEnabled;

    if (bassEnabled) {
      btnBassToggle.textContent = "Bass Root: On";
      btnBassToggle.style.background = "#2f6bff";
      btnBassToggle.style.color = "#fff";
    } else {
      btnBassToggle.textContent = "Bass Root: Off";
      btnBassToggle.style.background = "";
      btnBassToggle.style.color = "";
    }

    if (sessionActive) startVampLoop();
  });
}

// ---------------------------------------
// AUDIO INIT
// ---------------------------------------
async function ensureAudio() {
  if (audioStarted) return;
  await Tone.start();
  audioStarted = true;

  log("Audio started. Loading instruments...");

  // Piano
  sampler = new Tone.Sampler({
    urls: {
      "A0":"A0.mp3","C1":"C1.mp3","D#1":"Ds1.mp3","F#1":"Fs1.mp3",
      "A1":"A1.mp3","C2":"C2.mp3","D#2":"Ds2.mp3","F#2":"Fs2.mp3",
      "A2":"A2.mp3","C3":"C3.mp3","D#3":"Ds3.mp3","F#3":"Fs3.mp3",
      "A3":"A3.mp3","C4":"C4.mp3","D#4":"Ds4.mp3","F#4":"Fs4.mp3",
      "A4":"A4.mp3","C5":"C5.mp3","D#5":"Ds5.mp3","F#5":"Fs5.mp3",
      "A5":"A5.mp3","C6":"C6.mp3","D#6":"Ds6.mp3","F#6":"Fs6.mp3",
      "A6":"A6.mp3","C7":"C7.mp3","D#7":"Ds7.mp3","F#7":"Fs7.mp3",
      "A7":"A7.mp3","C8":"C8.mp3"
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    onload: () => log("Grand piano ready.")
  }).toDestination();

  // Bass sampler
  bass = new Tone.Sampler({
    urls: {
      "C1": "C1.mp3",
      "F1": "F1.mp3",
      "A1": "A1.mp3",
      "C2": "C2.mp3",
      "F2": "F2.mp3",
      "A2": "A2.mp3"
    },
    baseUrl: "https://raw.githubusercontent.com/junkguitar/bass-samples/main/upright/",
    onload: () => log("Upright bass ready.")
  }).toDestination();
}

// ---------------------------------------
// SELECTABLE QUALITIES & KEYS
// ---------------------------------------
const qualities = ["maj7","6/9","m7","m9","m11","7","13","7b9","7#9","7#11","7b13","7alt","m7b5","dim7","mMaj7"];
const keys = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

const qualityChipsContainer = document.getElementById("qualityChips");
const keyChipsContainer = document.getElementById("keyChips");

function buildChips(list, container) {
  list.forEach(item => {
    const chip = document.createElement("div");
    chip.className = "chip active";
    chip.textContent = item;
    chip.dataset.value = item;
    chip.onclick = () => {
      chip.classList.toggle("active");
    };
    container.appendChild(chip);
  });
}

buildChips(qualities, qualityChipsContainer);
buildChips(keys, keyChipsContainer);

function getActive(container) {
  const chips = [...container.querySelectorAll(".chip.active")];
  return chips.map(c => c.dataset.value);
}

// ---------------------------------------
// CHORD GENERATION
// ---------------------------------------
function chooseRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateChord() {
  const activeKeys = getActive(keyChipsContainer);
  const activeQualities = getActive(qualityChipsContainer);

  const root = chooseRandom(activeKeys.length ? activeKeys : keys);
  const quality = chooseRandom(activeQualities.length ? activeQualities : qualities);

  let chordNotes;

  const rootMidi = {
    C:48,Db:49,D:50,Eb:51,E:52,F:53,Gb:54,G:55,Ab:56,A:57,Bb:58,B:59
  }[root];

  const offsets = {
    maj7:[0,4,7,11],
    "6/9":[0,4,7,9,14],
    m7:[0,3,7,10],
    m9:[0,3,7,10,14],
    m11:[0,3,7,10,14,17],
    "7":[0,4,7,10],
    "13":[0,4,7,10,21],
    "7b9":[0,4,7,10,13],
    "7#9":[0,4,7,10,15],
    "7#11":[0,4,7,10,18],
    "7b13":[0,4,7,10,20],
    "7alt":[0,4,7,10,13,15],
    m7b5:[0,3,6,10],
    dim7:[0,3,6,9],
    mMaj7:[0,3,7,11]
  }[quality];

  chordNotes = offsets.map(o => rootMidi + o)
                      .map(n => Tone.Frequency(n, "midi").toNote());

  currentChord = {
    root,
    quality,
    noteNames: chordNotes
  };
}

// ---------------------------------------
// PLAYBACK
// ---------------------------------------
function playChord() {
  if (!sampler || !currentChord) return;
  const sustain = parseFloat(sustainInput.value);
  const now = Tone.now();
  const mode = document.querySelector("input[name='mode']:checked").value;

  // ---- BASS ROOT ----
  if (bassEnabled && bass) {
    const rootPC = currentChord.noteNames[0].replace(/[0-9]/g, "");
    const bassNote = rootPC + "2";
    bass.triggerAttackRelease(bassNote, sustain * 1.3, now);
  }

  // ---- PIANO ----
  if (mode === "block" || mode === "both") {
    currentChord.noteNames.forEach(n => {
      sampler.triggerAttackRelease(n, sustain, now);
    });
  }

  if (mode === "arp" || mode === "both") {
    const step = 0.12;
    currentChord.noteNames.forEach((n, i) => {
      sampler.triggerAttackRelease(n, sustain, now + i * step);
    });
  }
}

// ---------------------------------------
// VAMP LOOP
// ---------------------------------------
function startVampLoop() {
  if (loopTimer) clearInterval(loopTimer);

  const bmp = parseInt(bpmInput.value);
  const ms = (60_000 / bmp) * 4;

  playChord();
  loopTimer = setInterval(() => playChord(), ms);
}

// ---------------------------------------
// SESSION CONTROLS
// ---------------------------------------
btnStartAudio.addEventListener("click", ensureAudio);

btnStartSession.addEventListener("click", async () => {
  await ensureAudio();
  generateChord();
  statusLine.textContent = `${currentChord.root}${currentChord.quality}`;
  sessionActive = true;
  startVampLoop();
});

btnNextChord.addEventListener("click", () => {
  if (!sessionActive) return;
  generateChord();
  statusLine.textContent = `${currentChord.root}${currentChord.quality}`;
  startVampLoop();
});

btnStopSession.addEventListener("click", () => {
  sessionActive = false;
  clearInterval(loopTimer);
  statusLine.textContent = "Stopped.";
});

// SPACEBAR
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    if (sessionActive) btnNextChord.click();
  }
});
