import { useCallback, useEffect, useState } from 'react';
import type { MainView } from '../features/shared/types';

export interface AppRouteState {
  view: MainView;
  playerContentId: string | null;
}

const defaultRoute: AppRouteState = {
  view: 'home',
  playerContentId: null,
};

const mainViews: MainView[] = ['home', 'zen', 'nature', 'me', 'dream-journal', 'admin'];

const isMainView = (value: string): value is MainView => mainViews.includes(value as MainView);

export const buildHashRoute = ({ view, playerContentId }: AppRouteState) =>
  playerContentId ? `#/${view}/player/${encodeURIComponent(playerContentId)}` : `#/${view}`;

export const parseHashRoute = (hash: string): AppRouteState => {
  const cleanHash = hash.replace(/^#/, '');
  const segments = cleanHash.split('/').filter(Boolean);

  if (!segments.length) {
    return defaultRoute;
  }

  const [candidateView, candidatePlayerSegment, candidateContentId] = segments;
  const view = isMainView(candidateView) ? candidateView : defaultRoute.view;
  const playerContentId = candidatePlayerSegment === 'player' && candidateContentId ? decodeURIComponent(candidateContentId) : null;

  return {
    view,
    playerContentId,
  };
};

export function useHashRoute() {
  const [route, setRoute] = useState<AppRouteState>(() =>
    typeof window === 'undefined' ? defaultRoute : parseHashRoute(window.location.hash),
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!window.location.hash) {
      window.history.replaceState(null, '', buildHashRoute(defaultRoute));
    }

    const syncRoute = () => {
      setRoute(parseHashRoute(window.location.hash));
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const navigate = useCallback((nextRoute: AppRouteState) => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextHash = buildHashRoute(nextRoute);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }

    setRoute(nextRoute);
  }, []);

  return {
    route,
    navigate,
  };
}
