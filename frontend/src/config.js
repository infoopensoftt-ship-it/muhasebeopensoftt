// API configuration with fallback to current domain
const getBackendURL = () => {
  // If environment variable is set, use it
  const envURL = process.env.REACT_APP_BACKEND_URL;
  
  if (envURL && envURL !== 'undefined' && envURL !== '') {
    return envURL;
  }
  
  // Fallback: use current domain (works for both custom domain and default)
  return window.location.origin;
};

export const BACKEND_URL = getBackendURL();
export const API = `${BACKEND_URL}/api`;
