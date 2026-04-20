import { API_URL } from '../config';

const BASE_URL = (import.meta?.env?.BASE_URL || '/').replace(/\/?$/, '/');
export const FALLBACK_LOGO_URL = `${BASE_URL}taskora-logo.png?v=86`;

function collapseDuplicatePathSegments(urlString) {
    try {
        const parsed = new URL(urlString);
        const normalized = parsed.pathname
            .split('/')
            .filter(Boolean)
            .reduce((acc, segment) => {
                if (acc[acc.length - 1] !== segment) {
                    acc.push(segment);
                }
                return acc;
            }, []);
        parsed.pathname = '/' + normalized.join('/');
        return parsed.toString();
    } catch {
        return urlString;
    }
}

function getApiOrigin() {
    try {
        return new URL(API_URL).origin;
    } catch {
        return '';
    }
}

function getBackendBasePath() {
    try {
        const parsed = new URL(API_URL);
        // Example: /resto-backend/api/index.php?route= -> /resto-backend
        return parsed.pathname.split('/api/index.php')[0] || '';
    } catch {
        return '';
    }
}

function isLocalHost(hostname) {
    return /^(localhost|127(?:\.\d{1,3}){3})$/i.test(hostname || '');
}

function normalizeAbsoluteHttpUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        const apiOrigin = getApiOrigin();
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        const api = apiOrigin ? new URL(apiOrigin) : null;

        // Force API origin for uploaded assets to avoid stale domains/protocol mismatch from cached values.
        if (api && /\/uploads\//i.test(parsed.pathname)) {
            parsed.protocol = api.protocol;
            parsed.host = api.host;
        }

        // If backend accidentally returns localhost in production, remap it to current API origin.
        if (isLocalHost(parsed.hostname) && api && !isLocalHost(currentHost)) {
            parsed.protocol = api.protocol;
            parsed.host = api.host;
        }

        // Ensure protocol follows API origin (prevents mixed-content issue on HTTPS pages).
        if (api && parsed.host === api.host && parsed.protocol !== api.protocol) {
            parsed.protocol = api.protocol;
        }

        return collapseDuplicatePathSegments(parsed.toString());
    } catch {
        return urlString;
    }
}

export function normalizeLogoUrl(value) {
    if (!value || typeof value !== 'string') return FALLBACK_LOGO_URL;

    const raw = value.trim();
    if (!raw) return FALLBACK_LOGO_URL;

    if (/^(data:|blob:)/i.test(raw)) {
        return raw;
    }

    if (/^https?:\/\//i.test(raw)) {
        return normalizeAbsoluteHttpUrl(raw);
    }

    if (raw.startsWith('//')) {
        return collapseDuplicatePathSegments(`${window.location.protocol}${raw}`);
    }

    const origin = getApiOrigin();
    const backendBase = getBackendBasePath();
    const backendBaseClean = backendBase.replace(/^\//, '');
    const cleaned = raw.replace(/^\.?\//, '');

    if (raw.startsWith('/')) {
        // Some environments return /uploads/... while assets are served under /resto-backend/uploads/...
        if (origin && backendBase && raw.startsWith('/uploads/')) {
            return collapseDuplicatePathSegments(`${origin}${backendBase}${raw}`);
        }
        return origin ? collapseDuplicatePathSegments(`${origin}${raw}`) : raw;
    }

    // Prevent duplicated base path when backend already returns backend/uploads/... as relative path.
    if (origin && backendBaseClean && cleaned.startsWith(`${backendBaseClean}/`)) {
        return collapseDuplicatePathSegments(`${origin}/${cleaned}`);
    }

    if (origin && backendBase) {
        return collapseDuplicatePathSegments(`${origin}${backendBase}/${cleaned}`);
    }

    if (origin) {
        return collapseDuplicatePathSegments(`${origin}/${cleaned}`);
    }

    return `/${cleaned}`;
}

export function withCacheBuster(url) {
    const finalUrl = url || FALLBACK_LOGO_URL;
    const sep = finalUrl.includes('?') ? '&' : '?';
    return `${finalUrl}${sep}t=${Date.now()}`;
}
