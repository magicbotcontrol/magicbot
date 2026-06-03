export const APP_ROUTES = {
  home: '/',
  resetPassword: '/reset-password',
} as const;

const PUBLIC_INDICATOR_ROUTE_PATTERN = /^\/c\/([^/]+)\/?$/i;

export function getAppOrigin() {
  if (typeof window === 'undefined') {
    return '';
  }

  const configuredUrl = import.meta.env.VITE_APP_URL;
  return configuredUrl ? configuredUrl.replace(/\/+$/, '') : window.location.origin;
}

export function buildAppUrl(pathname: string) {
  const origin = getAppOrigin();
  return origin ? `${origin}${pathname.startsWith('/') ? pathname : `/${pathname}`}` : pathname;
}

export function extractPublicIndicatorCode(pathname: string) {
  const match = pathname.match(PUBLIC_INDICATOR_ROUTE_PATTERN);
  return match ? match[1] : null;
}

export function isResetPasswordRoute(pathname: string) {
  return pathname === APP_ROUTES.resetPassword;
}

export function replaceBrowserPath(pathname: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.replaceState(null, '', pathname);
}
