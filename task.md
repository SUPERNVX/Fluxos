# Ethereal Echo Implementation

- [ ] Analyze `ETHEREAL_ECHO_REPORT.md` to understand the effect logic.
- [ ] Update `AudioState` interface in `src/types/audio.ts` to include `etherealEcho` toggle.
- [ ] Update `DEFAULT_AUDIO_STATE` in `src/constants/audioConfig.ts`.
- [ ] Implement "Ethereal Echo" logic in `AudioEngine.ts`.
    - [ ] It should likely enable multiple reverbs simultaneously (Hall + Plate + Room?) without reducing dry volume.
- [ ] Add a toggle button for "Ethereal Echo" in the UI.
    - [ ] Check `src/components/AudioPlayer.tsx` or `src/components/VideoPlayer.tsx` or wherever controls are.
- [ ] Verify the effect.
