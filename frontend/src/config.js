const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:5000`;
};

export const API_BASE_URL = getApiBaseUrl();
