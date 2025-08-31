# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.5] - 2025-08-31

### Fixed

- **Playback Controls**: Fixed an issue where the pause button was not working correctly. The play/pause toggle now functions properly.
- **Seek Functionality**: Fixed the seek functionality for both the progress bar and spectrogram. Users can now click on either element to change the playback position.
- **Audio Source Management**: Improved audio source management to prevent conflicts between play/pause operations and seeking.

## [1.3.4] - 2025-08-31

### Fixed

- **Audio Loop Continuation**: Fixed an issue where the audio would pause at the end instead of automatically restarting. The audio now properly loops continuously while maintaining perfect synchronization with the UI elements (progress bar and spectrogram).
- **Audio End Event Handling**: Improved the audio end event handling to ensure automatic restart when the track finishes playing, providing seamless looping functionality.

## [1.3.3] - 2025-08-31

### Fixed

- **Critical Audio Loop Synchronization**: Completely rewrote the audio loop and synchronization logic to ensure the UI (progress bar, spectrogram) stays perfectly in sync with the audio playback. The interface now properly updates immediately when the audio loops without requiring user intervention.
- **Audio Context Management**: Improved audio context management and resource cleanup to prevent memory leaks and ensure stable playback.

## [1.3.2] - 2025-08-31

### Fixed

- **Audio Loop UI Sync**: Fixed a critical issue where the progress bar and spectrogram would freeze at the end when the audio looped. The UI now properly resets to 0% immediately when the audio restarts, without requiring user intervention.
- **Audio Restart Logic**: Improved the audio restart mechanism by separating the UI update from the audio playback restart, ensuring smoother transitions when looping.

## [1.3.1] - 2025-08-31

### Fixed

- **Audio Loop UI Sync**: Fixed an issue where the progress bar and spectrogram would freeze when the audio looped. The UI now properly resets to 0% when the audio restarts.
- **jsmediatags Loading Error**: Fixed a runtime error that occurred when the jsmediatags library wasn't loaded before being used. Added a check to ensure the library is available before calling its methods.
- **Manifest Icon Path**: Fixed a potential syntax error in the manifest.json file by updating the icon path from "./logo.png" to "/logo.png".

## [1.3.0] - 2025-08-31

### Added
 - **Configuration profiles**: Create sound config profiles in the settings page

### Fixed

- **Audio Loop Bug**: Fixed a critical bug where the audio would continue playing in a loop, but the UI (progress bar, spectrogram) would reset and freeze, leading to state desynchronization and duplicate audio playback. The fix replaces the native Web Audio API loop with a manual implementation for precise state control.

## [1.2.0] - 2025-08-30

### Added

- **Bass Boost**: Added a new "Bass Boost" slider (0-100%) to control a lowshelf filter, increasing the gain of frequencies below 250Hz.

## [1.1.0] - 2025-08-30

### Added

- **Volume Booster**: Volume slider now ranges from 0% to 200%, allowing for volume boosting above 100%.
- **"Closer" Reverb Effect**: Reverb parameters have been tuned to produce a shorter, more intimate reverb sound.
- **Slider Touch Lock**: Page scrolling is now disabled when interacting with sliders on touch devices to prevent accidental scrolling.
- **Album Art Display**: The player now reads and displays embedded album art from the audio file. A fallback image is used if no art is found.

### Fixed

- **Build & Dev Server Errors**: Resolved multiple issues related to module imports (`jsmediatags`), asset pathing (`logo.png`), and Vite configuration that prevented the development server from starting correctly.
- **UI Screen Shake**: Fixed an issue where the screen would shift horizontally when clicking on sliders by forcing the scrollbar to always be visible.
- **Speed Slider Freeze**: Corrected a performance issue that caused the speed slider to freeze by throttling the state updates.
- **Console Errors**: Fixed all outstanding console errors, including 404s and script loading race conditions.

## [1.0.0] - 2025-08-29

### Added

- Initial release of Fluxos.
- Core features:
    - Upload and play audio files.
    - Real-time audio effects: Speed (Pitch), Reverb, and Volume controls.
    - Interactive audio waveform visualizer.
    - Light and Dark theme support.
    - Download the modified audio file as a WAV.