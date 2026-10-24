export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function isOwner() {
  return Number(getCurrentUser()?.roleId) === 1;
}

export function isStaff() {
  return Number(getCurrentUser()?.roleId) === 3;
}
