import { useSyncExternalStore } from 'react';

// Videos start muted, like Instagram. Turning sound on for one video turns it on for the
// rest of the session, so the next video you scroll to plays with sound too.
let muted = true;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getMuted = () => muted;

export function useVideoMuted(): boolean {
  return useSyncExternalStore(subscribe, getMuted, getMuted);
}

export function toggleVideoMuted(): void {
  muted = !muted;
  listeners.forEach((listener) => listener());
}
