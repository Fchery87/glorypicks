/**
 * Sound player utility for alert notifications
 * Handles playing different alert sounds
 */

import type { SoundName } from '@/lib/store';

// =============================================================================
// Audio Cache
// =============================================================================

const audioCache: Record<SoundName, HTMLAudioElement | null> = {
  default: null,
  chime: null,
  bell: null,
  alert: null,
};

// =============================================================================
// Sound Paths
// =============================================================================

function getSoundPath(soundName: SoundName): string {
  return `/sounds/${soundName}.mp3`;
}

// =============================================================================
// Sound Player Functions
// =============================================================================

/**
 * Play an alert sound
 * @param soundName - The name of the sound to play
 * @param volume - Volume level (0-1), default 0.5
 */
export async function playSound(soundName: SoundName, volume: number = 0.5): Promise<void> {
  try {
    // Check if audio context is supported
    if (typeof window === 'undefined') {
      return;
    }

    // Try to use cached audio element
    let audio = audioCache[soundName];

    if (!audio) {
      // Create new audio element
      const soundPath = getSoundPath(soundName);
      audio = new Audio(soundPath);
      audio.preload = 'auto';
      audioCache[soundName] = audio;
    }

    // Reset to beginning if already playing
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));

    // Play the sound
    await audio.play();
  } catch (error) {
    console.error(`Failed to play sound: ${soundName}`, error);
  }
}

/**
 * Play a sound with a fallback chain
 * Tries to play the preferred sound, falls back to default if it fails
 */
export async function playSoundWithFallback(
  preferredSound: SoundName,
  volume: number = 0.5
): Promise<void> {
  try {
    await playSound(preferredSound, volume);
  } catch (error) {
    console.warn(`Failed to play ${preferredSound}, trying default sound`, error);
    try {
      await playSound('default', volume);
    } catch (fallbackError) {
      console.error('Failed to play fallback sound', fallbackError);
    }
  }
}

/**
 * Preload all alert sounds for better performance
 */
export async function preloadSounds(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const soundNames: SoundName[] = ['default', 'chime', 'bell', 'alert'];

  for (const soundName of soundNames) {
    try {
      if (!audioCache[soundName]) {
        const soundPath = getSoundPath(soundName);
        const audio = new Audio(soundPath);
        audio.preload = 'auto';
        
        // Wait for audio to load
        await new Promise<void>((resolve, reject) => {
          audio.addEventListener('canplaythrough', () => resolve(), { once: true });
          audio.addEventListener('error', () => reject(), { once: true });
          
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('Preload timeout')), 5000);
        });

        audioCache[soundName] = audio;
      }
    } catch (error) {
      console.warn(`Failed to preload sound: ${soundName}`, error);
    }
  }
}

/**
 * Stop all currently playing sounds
 */
export function stopAllSounds(): void {
  Object.values(audioCache).forEach((audio) => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });
}

/**
 * Clear the audio cache (useful for cleanup)
 */
export function clearAudioCache(): void {
  stopAllSounds();
  for (const key in audioCache) {
    audioCache[key as SoundName] = null;
  }
}

// =============================================================================
// Browser Notifications
// =============================================================================

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show a browser notification
 */
export async function showNotification(
  title: string,
  body: string,
  icon?: string,
  onClick?: () => void
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: icon || '/favicon.ico',
    badge: icon || '/favicon.ico',
    tag: `alert-${Date.now()}`,
    requireInteraction: false,
  });

  if (onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
    };
  }

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

/**
 * Show an alert notification with both sound and browser notification
 */
export async function showAlertNotification(
  title: string,
  message: string,
  soundName: SoundName = 'default',
  soundVolume: number = 0.5,
  onClick?: () => void
): Promise<void> {
  // Play sound
  await playSoundWithFallback(soundName, soundVolume);

  // Show browser notification
  await showNotification(title, message, undefined, onClick);
}
