// API configuration - always use current domain for API calls
// This ensures it works on any domain (preview, custom domain, localhost)
export const BACKEND_URL = window.location.origin;
export const API = `${BACKEND_URL}/api`;
