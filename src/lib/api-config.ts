/**
 * API configuration for StockPilot.
 * Ensures the frontend always routes application API calls to the Next.js backend,
 * while allowing external API URL overrides when appropriate.
 */
export function getApiBaseUrl(): string {
  const envUrl =
    (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL)) ||
    '';

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    // If the URL points to the Python ML microservice (e.g. on Render),
    // application API routes (/api/v1/dashboard, /api/v1/health, etc.)
    // must be served by the Next.js host via relative URLs.
    if (envUrl.includes('onrender.com') || envUrl.includes(':8000')) {
      return '';
    }
    return envUrl.replace(/\/+$/, '');
  }

  return '';
}

export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}
