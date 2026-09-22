/** Lightweight History API helpers so mobile Back closes overlays / modes instead of leaving the site. */

export type NavLayer =
  | 'root'
  | 'mode'
  | 'detail'
  | 'trailer'
  | 'finder'
  | 'settings'
  | 'search';

export type NavState = {
  ml: true;
  layer: NavLayer;
  mode?: string;
};

export function isNavState(state: unknown): state is NavState {
  return Boolean(state && typeof state === 'object' && (state as NavState).ml === true);
}

export function ensureRootHistory() {
  if (typeof window === 'undefined') return;
  if (!isNavState(window.history.state)) {
    window.history.replaceState({ ml: true, layer: 'root' } satisfies NavState, '');
  }
}

export function pushNavLayer(layer: NavLayer, extra?: Partial<NavState>) {
  if (typeof window === 'undefined') return;
  window.history.pushState({ ml: true, layer, ...extra } satisfies NavState, '');
}

/** Close via UI: pop our layer without double-handling in popstate. */
export function backIfLayer(layer: NavLayer): boolean {
  if (typeof window === 'undefined') return false;
  if (isNavState(window.history.state) && window.history.state.layer === layer) {
    window.history.back();
    return true;
  }
  return false;
}
