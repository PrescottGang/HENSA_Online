// src/hooks/useNotificationSound.js
import { useCallback } from "react";

// Types de sons disponibles selon le type de notification
const SOUNDS = {
  // Annonce officielle — deux bips montants
  announcement: [
    { freq: 880,  start: 0,    duration: 0.12 },
    { freq: 1100, start: 0.15, duration: 0.12 },
  ],

  // Like — un bip court et aigu
  like: [
    { freq: 1200, start: 0, duration: 0.08 },
  ],

  // Commentaire — deux bips rapides
  comment: [
    { freq: 900, start: 0,    duration: 0.08 },
    { freq: 900, start: 0.12, duration: 0.08 },
  ],

  // Publication — bip grave puis aigu
  publication: [
    { freq: 660,  start: 0,    duration: 0.1 },
    { freq: 990,  start: 0.13, duration: 0.1 },
    { freq: 1320, start: 0.26, duration: 0.1 },
  ],

  // Par défaut — bip simple
  default: [
    { freq: 880, start: 0, duration: 0.1 },
  ],
};

export const useNotificationSound = () => {
  const play = useCallback((type = "default") => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx   = new AudioContext();
      const beeps = SOUNDS[type] || SOUNDS.default;

      beeps.forEach(({ freq, start, duration }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type            = "sine";
        osc.frequency.value = freq;

        // Fade in / fade out propre
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3,  ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0,    ctx.currentTime + start + duration);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime  + start + duration + 0.05);
      });
    } catch (e) {
      console.warn("Son de notification non disponible:", e);
    }
  }, []);

  return { play };
};