import { ref } from "vue";

// Shared authentication state
export const isAuthenticated = ref(false);
export const user = ref(null);

// Read user from localStorage (used on app start)
export function loadUserFromStorage() {
  const storedUser = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  if (storedUser && token) {
    user.value = JSON.parse(storedUser);
    isAuthenticated.value = true;
  }
}

// Login
export function loginUser(userData, token) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(userData)); // ← ajouté
  user.value = userData;
  isAuthenticated.value = true;
}

// Logout
export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user"); // ← ajouté
  user.value = null;
  isAuthenticated.value = false;
}

// Get current user from localStorage
export function getCurrentUser() {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;
  return JSON.parse(storedUser);
}

// Check if the current user has a specific role
export function hasRole(role) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  return currentUser.role === role;
}
