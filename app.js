<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Jazz Chord Trainer — Grand Piano</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/modern-normalize/2.0.0/modern-normalize.min.css" />

  <style>
    body {
      background:#0b0e12;
      color:#eee;
      font-family:system-ui, sans-serif;
      padding:20px;
      line-height:1.5;
    }

    h1 {
      text-align:center;
      margin-bottom:10px;
      font-size:28px;
    }

    .card {
      background:#131820;
      padding:20px;
      border-radius:12px;
      margin-bottom:25px;
      box-shadow:0 0 20px rgba(0,0,0,0.3);
    }

    .btn {
      background:#2c2f36;
      color:white;
      border:none;
      padding:10px 16px;
      border-radius:8px;
      margin-right:10px;
      font-size:16px;
    }
    .btn-primary {
      background:#2f6bff;
    }
    .btn-danger {
      background:#c62828;
    }
    .btn:active { opacity:0.7; }

    .chip {
      display:inline-block;
      padding:6px 14px;
      border-radius:20px;
      background:#1d232d;
      margin:4px;
      cursor:pointer;
    }
    .chip.selected {
      background:#2f6bff;
      color:#fff;
    }

    .field-row { margin-top:10px; }

    #currentChordBox {
      font-size:32px;
      font-weight:600;
      text-align:center;
      padding:20px;
      margin-top:15px;
    }
  </style>
</head>

<body>

<h1>Jazz Chord Trainer — Grand Piano</h1>
<div style="text-align:center;margin-top:-5px;">
  Random roots • Jazz qualities • SPACE or button to advance
</div>


<!-- SESSION -->
<div class="card">
  <h2>SESSION</h2>

  <button id="btnStartAudio" class="btn btn-primary">Start Audio</button>
  <button id="btnStartSession" class="btn">Start Session</button>
  <button id="btnNextChord" class="btn">Next Chord</button>
  <button id="btnStopSession" class="btn btn-danger">Stop</button>

  <p style="font-size:14px;margin-top:10px;">
    On iPhone/iPad you must tap <b>Start Audio</b> first.<br>
    Then tap <b>Start Session</b>. Use <b>Next Chord</b> to advance.
    On desktop you may also press <b>SPACE</b>.
  </p>
</div>


<!-- PLAYBACK -->
<div class="card" id="playbackSection">
  <h2>PLAYBACK</h2>

  <label><input type="radio" name="pb" value="block" checked> Block</label>
  <label style="margin-left:20px;"><input type="radio" name="pb" value="arp"> Arpeggio</label>
  <label style="margin-left:20px;"><input type="radio" name="pb" value="both"> Both</label>

  <div class="field-row">
    BPM: <input id="bpmInput" type="number" value="96" style="width:70px;margin-left:5px;">
    <span style="margin-left:20px;">Sustain (s):</span>
    <input id="sustainInput" type="number" value="3" style="width:70px;margin-left:5px;">
  </div>
</div>


<!-- QUALITIES -->
<div class="card">
  <h2>QUALITIES</h2>
  <div id="qualityContainer"></div>
  <p style="font-size:14px;">Tap to include / exclude. If none selected, all qualities are used.</p>
</div>


<!-- KEYS -->
<div class="card">
  <h2>KEYS</h2>
  <div id="keyContainer"></div>
  <p style="font-size:14px;">Tap keys to include. If none selected, all 12 are used.</p>
</div>


<!-- CURRENT CHORD -->
<div class="card">
  <h2>CURRENT CHORD</h2>
  <div id="currentChordBox">—</div>
</div>


<!-- LOG -->
<div class="card">
  <h2>DEBUG LOG</h2>
  <pre id="logBox"
       style="background:#0a0d12;padding:10px;height:120px;overflow-y:auto;font-size:12px;"></pre>
</div>


<!-- Tone.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js"></script>

<!-- App logic -->
<script src="app.js"></script>

</body>
</html>
