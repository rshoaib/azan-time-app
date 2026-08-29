// Static asset stub for Jest.
//
// constants/reciters.ts does `require('../assets/audio/azan.mp3')` so the app
// can hand a real audio source to expo-audio. Jest has no loader for binary
// assets and fails parsing the mp3 itself, so every suite that reaches the
// reciter table needs this. Metro handles the real thing at runtime.
module.exports = 1;
