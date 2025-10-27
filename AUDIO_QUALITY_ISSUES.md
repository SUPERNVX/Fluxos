# Audio Quality Issues Investigation

## Overview
This document tracks the ongoing audio quality issues in the Fluxos project and attempts to resolve them.

## Problem Statement
Users report that the audio quality is degraded when processed through the application compared to playing the original audio file directly:
- Audio sounds "muffled" (abafado)
- Reduced volume compared to original file
- Audio appears compressed or lacks full dynamic range
- Audio seems "focused" only in center, lacking spatial expansion
- After recent fixes, audio became distorted ("estourado")

## Root Cause Analysis

### Issue 1: Muffled Sound and Reduced Volume
**Root Cause:** Bass boost filter (lowshelf type at 250Hz) was always connected in the signal path, even when the bass setting was 0. Even with 0dB gain, biquad filters can introduce phase shifts and other artifacts that change the audio character.

### Issue 2: Distortion After Initial Fix
**Root Cause:** When implementing bypass solutions, I incorrectly created parallel signal paths where the same audio signal was split and then recombined, causing signal doubling and phase interference.

### Issue 3: Complex Signal Routing
**Root Cause:** The audio graph has multiple signal paths (dry + 4 reverb paths) that are mixed together, which can cause phase cancellation and level changes.

## Fix Attempts

### Attempt 1: Always-Active Bass Boost Filter (Original State)
```javascript
// Original simple connection
currentNode.connect(bassBoost);
bassBoost.connect(ctx.destination);
```
**Result:** Muffled sound due to filter artifacts even at 0 gain

### Attempt 2: Parallel Path with Crossfade
```javascript
// Created parallel paths
currentNode.connect(bassBoost);  // To bass boost filter  
currentNode.connect(bassDirectPath);  // Direct path

// Both paths combined
bassBoost.connect(bassBoostSignal);
bassDirectPath.connect(bassDirectSignal);
bassBoostSignal.connect(bassOutput);
bassDirectSignal.connect(bassOutput);
bassOutput.connect(ctx.destination);
```
**Result:** Signal duplication caused distortion ("estourado") because same signal sent through both paths

### Attempt 3: Bypass System with Gain Control
**Approach:** Control gains to have either processed or direct path active, not both
**Result:** Still had signal duplication issue due to connecting same input to multiple paths

### Attempt 4: Simplified Connection (Current State)
**Approach:** Return to simple connection, only control the filter gain parameter
**Current Result:** Less distortion but may still have minor phase artifacts from filter

## Technical Details

### Filter Artifacts
- Biquad filters can introduce phase shifts, group delay, and other artifacts even when gain is set to 0dB
- Lowshelf filters particularly can have phase effects that change the perceived sound

### Signal Path Architecture
- Source → Multiple parallel paths (dry + 4 reverbs) → Mixed at mainGain → Bass boost → Destination
- Multiple gain nodes and routing can affect dynamic range and perceived loudness
- Complex routing may introduce subtle phase issues

## Recommended Long-term Solutions

### 1. True Bypass Implementation
Create a switching mechanism that completely removes the filter from the signal path when not in use:
```javascript
// Conceptual approach - requires dynamic routing
if (bassLevel > 0) {
    currentNode.connect(bassBoost);
    bassBoost.connect(destination);
} else {
    currentNode.connect(destination); // Bypass filter entirely
}
```

### 2. Higher Quality Filter Design
- Use oversampling to reduce aliasing
- Implement linear-phase filters if phase is critical
- Consider using minimum-phase filters for less audible artifacts

### 3. Signal Path Optimization
- Minimize number of processing nodes in the main signal path
- Use more efficient reverb switching (single convolver with impulse switching)
- Normalize levels after processing to maintain consistent loudness

## Current State

The build is stable, but there are still minor audio quality artifacts due to the bass boost filter being in the signal path at all times. This is a compromise between functionality and audio purity.

## Next Steps for Investigation

1. **Measure Phase Response:** Use tools to measure phase changes introduced by the filter
2. **Compare Spectral Analysis:** Compare frequency response of original vs processed audio
3. **Implement Dynamic Routing:** Create proper bypass switching without signal duplication
4. **Test Different Filter Types:** Experiment with different biquad filter types for neutrality
5. **Level Normalization:** Add automatic gain control to compensate for processing loss/gain

## Impact on Users

- Audio quality is acceptable but not pristine
- Most users won't notice minor artifacts during casual listening
- Audiophiles or professional users may detect the quality degradation
- No functional impact - all features work correctly