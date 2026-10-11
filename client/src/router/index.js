
import { createRouter, createWebHistory } from "vue-router";
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
];
// Router instance creation with HTML5 clean URLs
const router = createRouter({
  history: createWebHistory(),
  routes,
});
// Router export for main.js registration
export default router;
