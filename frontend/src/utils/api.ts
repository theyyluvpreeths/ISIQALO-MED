const API_BASE_URL = '/api';

const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout
const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000; // large STL/DCM uploads can take a while

export const TOKEN_STORAGE_KEY = 'isiqalo_token';

export const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const getToken = (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY);

export async function apiRequest(endpoint: string, method: string = 'GET', body: any = null, isMultipart: boolean = false) {
  const headers: Record<string, string> = {};

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Create an AbortController for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), isMultipart ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);

  const config: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  };

  if (body) {
    if (isMultipart) {
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    clearTimeout(timeoutId);

    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Too many requests. Please wait and try again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = Array.isArray(errorData.details) && errorData.details.length > 0
        ? `: ${errorData.details.map((d: any) => d.message).join(', ')}`
        : '';
      throw new Error((errorData.error || 'API request failed') + detail);
    }

    // Handle file downloads
    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.includes('attachment')) {
      const blob = await response.blob();
      const filename = disposition.split('filename=')[1]?.replace(/"/g, '') || 'download';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The server took too long to respond.');
    }
    throw error;
  }
}
