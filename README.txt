
Jazz Chord Trainer — PWA (Grand Piano emulation)
------------------------------------------------
Files:
- index.html
- app.js
- manifest.json
- service-worker.js
- piano-samples/ (preloaded .wav files for MIDI 36..84)

How to deploy:
1) Upload the entire folder to GitHub Pages or Netlify as a static site.
2) Open the URL in Safari on your iPhone.
3) Tap Share → Add to Home Screen to install.

Notes:
- These WAVs are high-quality synthesized grand-style samples generated locally for offline testing.
- To use actual recorded Steinway/Yamaha samples, replace piano-samples/<MIDI>.wav with real WAVs (44.1 kHz mono) preserving filenames (e.g., 60.wav = middle C).
