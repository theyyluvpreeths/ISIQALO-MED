const API_BASE_URL = 'http://localhost:5000/api';

export function getToken(): string | null {
  return localStorage.getItem('isiqalo_token');
}

export function setToken(token: string): void {
  localStorage.setItem('isiqalo_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('isiqalo_token');
}

export async function apiRequest(endpoint: string, method: string = 'GET', body: any = null, isMultipart: boolean = false) {
  const token = getToken();
  const headers: HeadersInit = {};

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    if (isMultipart) {
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401 || response.status === 403) {
    // Session expired or unauthorized
    removeToken();
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      window.location.reload();
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API request failed');
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
}
