const ADMIN_WALLET = "9RYCn13NH2NC5ADt681VVpk5rcRL4jYm3zrcgojdqvhA";

interface UserProfile { name: string; x: string; }

function getProfile(wallet: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`care-market-profile-${wallet}`);
    if (raw) { const p = JSON.parse(raw); if (p.name) return p; }
  } catch {}
  return null;
}

export function displayName(wallet: string): string {
  if (wallet === ADMIN_WALLET) return "Care Market";
  const p = getProfile(wallet);
  if (p && p.name) return p.name;
  return wallet.slice(0, 4) + "..." + wallet.slice(-4);
}

export function getXLink(wallet: string): string | null {
  const p = getProfile(wallet);
  if (p && p.x) return p.x;
  return null;
}

export function saveUserProfile(wallet: string, name: string, x: string) {
  localStorage.setItem(`care-market-profile-${wallet}`, JSON.stringify({ name: name.trim(), x: x.trim() }));
}

export function getUserProfile(wallet: string): UserProfile {
  try {
    const raw = localStorage.getItem(`care-market-profile-${wallet}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "", x: "" };
}
