import { ref } from "vue";

// Shared authentication state
export const isAuthenticated = ref(false);
export const user = ref(null);

// Login
export function loginUser(userData, token) {
  localStorage.setItem("token", token); // Save token
  user.value = userData;
  isAuthenticated.value = true;
}

// Logout
export function logoutUser() {
  localStorage.removeItem("token"); // Remove token
  user.value = null;
  isAuthenticated.value = false;
}