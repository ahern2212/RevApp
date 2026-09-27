import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// `server` during static rendering and hydration, `client` afterwards — without a
// setState-in-effect re-render.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(subscribe, () => client, () => server);
}
