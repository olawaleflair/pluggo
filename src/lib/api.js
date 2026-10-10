const TOKEN_KEY = 'billsgo-session';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export function setToken(token) {
 if (token) localStorage.setItem(TOKEN_KEY, token);
 else localStorage.removeItem(TOKEN_KEY);
}
export async function api(path, data, { signal } = {}) {
 const token = getToken();
 let response;
 try {
  response = await fetch(`/api${path}`, {
   signal,
   method: data === undefined ? 'GET' : 'POST',
   headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
   ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
 } catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Cannot reach PlugGo. Start the app with npm run dev.'); }
 const result = await response.json();
 if (!response.ok) throw new Error(result.error || 'Request failed.');
 return result;
}
