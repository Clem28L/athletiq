import { createRouter, createWebHistory } from "vue-router";
import QuizzesManager from "../views/expert/QuizzesManager.vue";
// Route components imports
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
// Route definitions (URL path -> Component mapping)
const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },
  {
    path: "/register",
    name: "register",
    component: RegisterView,
  },
  {
    path: "/expert/quizzes",
    name: "expert-quizzes",
    component: QuizzesManager,
    meta: { role: "expert" }, // Only accessible to users with the "expert" role
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFound.vue"),
  },
];
// Router instance creation with HTML5 clean URLs
const router = createRouter({
  history: createWebHistory(),
  routes,
});
function decodeToken(token) {
  try {
    // we take only the payload part of the JWT
    let parts = token.split(".");
    let payload = parts[1];
    let decoded = atob(payload);

    // Convert the JSON string into a JS object
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
}
//checks the role before each navigation
router.beforeEach((to) => {
  const token = localStorage.getItem("token");

  // If the route requires a specific role
  if (to.meta.role) {
    // No token  redirect to login
    if (!token) {
      return "/login";
    }

    const payload = decodeToken(token);

    // Invalid token redirect to login
    if (!payload) {
      return "/login";
    }

    // Wrong role  redirect to home
    if (payload.role !== to.meta.role) {
      return "/";
    }
  }

  // all checks passed
});
// Router export for main.js registration
export default router;
