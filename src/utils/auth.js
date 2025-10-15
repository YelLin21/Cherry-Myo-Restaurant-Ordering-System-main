import { jwtDecode } from "jwt-decode";

// Get the current admin user from token
export function getAdminUser() {
  const token = localStorage.getItem("adminToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      localStorage.removeItem("adminToken");
      return null;
    }
    return decoded;
  } catch (error) {
    console.error("Invalid token:", error);
    localStorage.removeItem("adminToken");
    return null;
  }
}

// Logout admin
export function logoutAdmin() {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin/login";
}

// Optional: Check if admin is authenticated
export function isAdminAuthenticated() {
  return !!getAdminUser();
}
