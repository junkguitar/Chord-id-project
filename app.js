let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Required for iOS: play a silent buffer inside the click event
        const buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
        const dummy = audioCtx.createBufferSource();
        dummy.buffer = buffer;
        dummy.connect(audioCtx.destination);
        dummy.start(0);

        console.log("Audio unlocked");
    }

    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}
// app.js - Jazz Chord Trainer PWA (uses preloaded piano-samples/<midi>.wav)
const SR = 44100;
const SAMPLE_PATH = 'piano-samples/'; // contains 36..84.wav
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_LIST = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const QUALITY_ORDER = ["maj7","6/9","m7","m9","m11","7","13","7b9","7#9","7#11","7b13","7alt","m7b5","dim7","mMaj7"];
const CHORD_QUALITIES = {"maj7":[0,4,7,11],"6/9":[0,4,7,9,14],"m7":[0,3,7,10],"m9":[0,3,7,10,14],"m11":[0,3,7,10,14,17],"7":[0,4,7,10],"13":[0,4,7,10,14,21],"7b9":[0,4,7,10,13],"7#9":[0,4,7,10,15],"7#11":[0,4,7,10,18],"7b13":[0,4,7,10,20],"7alt":[0,4,7,10,13,15,18,20],"m7b5":[0,3,6,10],"dim7":[0,3,6,9],"mMaj7":[0,3,7,11]};

let audioCtx = null;
let bufferCache = {};
let running = false;
let qualities = new Set(QUALITY_ORDER);
let keys = new Set(KEY_LIST);
let order = 'random';
let current = {root:'C', quality:'maj7', voicing:[]};

async function startAudio(){
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  window.master = audioCtx.createGain(); window.master.gain.value = 0.9; window.master.connect(audioCtx.destination);
  await preloadSamples();
}

async function preloadSamples(){
  const midiList = Array.from({length: 85-36}, (_,i)=>i+36);
  const promises = midiList.map(m=>fetch(`${SAMPLE_PATH}${m}.wav`).then(r=>r.arrayBuffer()).then(b=>audioCtx.decodeAudioData(b)).then(buf=>{ bufferCache[m]=buf; }));
  await Promise.all(promises);
  console.log('Loaded', Object.keys(bufferCache).length, 'samples');
}

function midiForRoot(name){
  const map = {'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'Gb':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11};
  return 48 + (map[name]||0);
}

function buildVoicing(rootMidi, intervals, voicing='drop2', register_mid=60, extensions='high'){
  let ints = intervals;
  if (JSON.stringify(ints) === JSON.stringify(CHORD_QUALITIES['7alt'])){
    const alts=[13,15,18,20]; ints = [0,4,7,10, alts[Math.floor(Math.random()*alts.length)], alts[Math.floor(Math.random()*alts.length)]];
  }
  const basics = new Set([0,3,4,7,10,11]);
  let kept = [];
  for(const iv of ints){
    if (extensions==='none'){ if (basics.has(iv)) kept.push(iv); }
    else if (extensions==='basic'){ if (basics.has(iv) || iv===13 || iv===14) kept.push(iv); }
    else kept.push(iv);
  }
  if (!kept.includes(0)) kept.push(0);
  if (!kept.includes(7)) kept.push(7);
  kept = Array.from(new Set(kept)).sort((a,b)=>a-b);
  if (kept.length>6){
    const core=[0,4,7,10,11,3];
    const coreKeep = kept.filter(iv=>core.includes(iv));
    const others = kept.filter(iv=>!core.includes(iv));
    others.sort(()=>Math.random()-0.5);
    kept = Array.from(new Set(coreKeep.concat(others.slice(0, Math.max(0, 6-coreKeep.length)))));
    kept.sort((a,b)=>a-b);
  }
  let notes = kept.map(iv=>rootMidi+iv);
  const target = [];
  for(let n of notes){
    while(n < register_mid - 7) n += 12;
    while(n > register_mid + 9) n -= 12;
    target.push(n);
  }
  target.sort((a,b)=>a-b);
  if (voicing==='drop2' && target.length>=4){
    const s2 = target[target.length-2]-12;
    const v = target.slice(0,-2).concat([s2, target[target.length-1]]);
    return Array.from(new Set(v)).sort((a,b)=>a-b);
  }
  return Array.from(new Set(target));
}

function playSample(midi, when=0, gain=1.0, pan=0){
  const buf = bufferCache[midi];
  if (!buf) return null;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain(); g.gain.value = gain;
  const p = audioCtx.createStereoPanner(); p.pan.value = pan;
  src.connect(g); g.connect(p); p.connect(window.master);
  src.start(audioCtx.currentTime + when);
  return src;
}

function playVoicing(noteList, mode='block'){
  // noteList is list of MIDI numbers
  const now = 0; // relative
  if (mode === 'block'){
    noteList.forEach((m,i)=>{
      playSample(m, 0, 1.0, (i/(noteList.length-1))*2-1);
    });
  } else if (mode === 'arp'){
    noteList.forEach((m,i)=>{
      playSample(m, i*0.06, 0.95, (i/(noteList.length-1))*2-1);
    });
  } else { // both
    noteList.forEach((m,i)=>{
      playSample(m, 0, 1.0, (i/(noteList.length-1))*2-1);
      playSample(m, i*0.04 + 0.06, 0.6, (i/(noteList.length-1))*2-1);
    });
  }
}

function chooseRootRandom(){
  const arr = Array.from(keys);
  const r = arr[Math.floor(Math.random()*arr.length)];
  return r;
}

function pickRandomQuality(){
  const arr = Array.from(qualities);
  return arr[Math.floor(Math.random()*arr.length)];
}

async function nextChordPlay(){
  if (!audioCtx) await startAudio();
  const quality = pickRandomQuality();
  const rootName = chooseRootRandom();
  const intervals = CHORD_QUALITIES[quality] || CHORD_QUALITIES['maj7'];
  const rootMidi = midiForRoot(rootName);
  const voicing = buildVoicing(rootMidi, intervals, 'drop2', 60, 'high');
  current = {root:rootName, quality, voicing};
  document.getElementById('nowChord').textContent = `${rootName}${quality}`;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  playVoicing(voicing, mode);
}

document.getElementById('start').onclick = ()=> startAudio();
document.getElementById('startSession').onclick = ()=> { nextChordPlay(); };
document.getElementById('stopSession').onclick = ()=> { /* future: stop/clear */ };

window.addEventListener('keydown', (e)=>{
  if (e.code === 'Space'){
    e.preventDefault();
    nextChordPlay();
  }
});

// UI build for qualities & keys
function mkPills(containerId, items, setRef){
  const cont = document.getElementById(containerId);
  cont.innerHTML = '';
  items.forEach(it=>{
    const d = document.createElement('div');
    d.className = 'pill' + (setRef.has(it)?' active':'');
    d.textContent = it;
    d.onclick = ()=>{ if (setRef.has(it)) setRef.delete(it); else setRef.add(it); d.classList.toggle('active'); };
    cont.appendChild(d);
  });
}
mkPills('qualities', QUALITY_ORDER, qualities);
mkPills('keys', KEY_LIST, keys);

document.getElementById('allQ').onclick = ()=>{ QUALITY_ORDER.forEach(q=>qualities.add(q)); mkPills('qualities', QUALITY_ORDER, qualities); };
document.getElementById('noneQ').onclick = ()=>{ qualities.clear(); mkPills('qualities', QUALITY_ORDER, qualities); };
document.getElementById('allK').onclick = ()=>{ KEY_LIST.forEach(k=>keys.add(k)); mkPills('keys', KEY_LIST, keys); };
document.getElementById('noneK').onclick = ()=>{ keys.clear(); mkPills('keys', KEY_LIST, keys); };

// register service worker
if ('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').then(()=>console.log('sw ok')); }

// install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt = e; document.getElementById('installBtn').style.display = 'inline-block'; });
document.getElementById('installBtn').onclick = async ()=>{ if (deferredPrompt){ deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; console.log(choice); } };
