
class SoundService {
  private sounds: { [key: string]: HTMLAudioElement } = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.sounds = {
        correct: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'),
        incorrect: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
        warning: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
        complete: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),
      };

      // Preload sounds
      Object.values(this.sounds).forEach(audio => {
        audio.load();
        audio.volume = 0.5;
      });
    }
  }

  play(sound: 'correct' | 'incorrect' | 'warning' | 'complete') {
    const audio = this.sounds[sound];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Audio playback failed:', e));
    }
  }

  stop(sound: 'correct' | 'incorrect' | 'warning' | 'complete') {
    const audio = this.sounds[sound];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

export const soundService = new SoundService();
