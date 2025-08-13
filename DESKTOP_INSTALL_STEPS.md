# WhyMaker Desktop Packaging (macOS first)

This checklist tracks progress to build a macOS desktop app (no code signing/notarization), then we’ll do Windows.

Notes
- No code signing / notarization (users may need right-click → Open on first run).
- OCR (Tesseract) will be bundled for “just works” image/scanned PDF OCR.

## Phase 0 — Prep (One-time)
- [ ] Xcode CLT installed: `xcode-select --install`
- [ ] Homebrew installed: https://brew.sh
- [ ] PyInstaller installed: `pip install pyinstaller`
- [ ] Tesseract installed (for bundling assets): `brew install tesseract`
- [ ] Optional: `create-dmg` installed: `brew install create-dmg`

## Phase 1 — Export frontend (Next.js → static files)
Done
- [x] Export the frontend and copy it into the repo as `frontend_build/`:
  1. `cd whymaker-chatbot-interface`
  2. `npm ci`
  3. `npm run build`  (this now also exports to `out/` because `output: 'export'` is set)
  4. `cd ..`
  5. `rm -rf frontend_build && cp -R whymaker-chatbot-interface/out frontend_build`

Proceed to Phase 2.

## Phase 2 — Bundle OCR assets (mac)
Current step
- [ ] Create directories and copy Tesseract binary + tessdata:
  ```bash
  mkdir -p packaging/macos/bin packaging/macos/tessdata
  # Copy the tesseract binary installed by Homebrew
  cp "$(brew --prefix)/bin/tesseract" packaging/macos/bin/
  # Copy language data (at least eng.traineddata) via the stable opt path
  cp -R "$(brew --prefix)/opt/tesseract/share/tessdata/"* packaging/macos/tessdata/
  # Verify
  ls -la packaging/macos/bin
  ls -la packaging/macos/tessdata | head -n 20
  ```
  Expected: `packaging/macos/bin/tesseract` exists and `packaging/macos/tessdata/eng.traineddata` exists.

## Phase 3 — PyInstaller app bundle
- [ ] Add `run_local.py` launcher (serves UI, starts FastAPI, sets OCR paths)
- [ ] Add `whymaker-mac.spec` for PyInstaller
- [ ] Build: `pyinstaller whymaker-mac.spec`
- [ ] Verify `dist/WhyMaker.app` launches and opens http://127.0.0.1:8000

## Phase 4 — Create DMG
- [ ] Create a DMG: e.g. `create-dmg ... WhyMaker.dmg dist/`

## Phase 5 — Manual first-run instructions
- [ ] Document first run on macOS (right-click → Open)

## Phase 6 — Windows packaging (later)
- [ ] Mirror the process with PyInstaller + Inno Setup installer