const STORAGE_KEY = "adminAuth:v1";
const LEGACY_STORAGE_KEY = "adminAuth";

// Persist the admin session. `refreshToken` is optional — the onboarding OTP flow issues
// a short-lived access token with no refresh token; the normal login/verify flows include
// one so the session can be silently renewed (see api/client.js).
export function saveAdminAuth({ token, refreshToken, user }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, refreshToken, user }));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to persist admin auth", err);
  }
  window.dispatchEvent(new Event("admin-auth-changed"));
}

export function getAdminAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAdminRefreshToken() {
  return getAdminAuth()?.refreshToken || null;
}

// Replace the tokens after a silent refresh while preserving the stored user. If the
// backend rotated the refresh token, persist the new one; otherwise keep the existing one.
export function updateAdminTokens({ token, refreshToken }) {
  const current = getAdminAuth();
  if (!current) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, token, refreshToken: refreshToken || current.refreshToken })
    );
  } catch (err) {
    console.error("Failed to update admin tokens", err);
  }
  window.dispatchEvent(new Event("admin-auth-changed"));
}

export function clearAdminAuth() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  window.dispatchEvent(new Event("admin-auth-changed"));
}
