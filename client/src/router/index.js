import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser, hasRole } from "../stores/auth";
import NotFound from "../views/NotFound.vue";

// Route components imports
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import QuizzesManager from "../views/expert/QuizzesManager.vue";
import QuizForm from "../views/expert/QuizForm.vue";

// Route definitions
const routes = [
  { path: "/", name: "home", component: HomeView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/register", name: "register", component: RegisterView },
  {
    path: "/expert/quizzes",
    name: "expert-quizzes",
    component: QuizzesManager,
    meta: { role: "expert" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound,
  },
  {
    path: "/expert/quizzes/new",
    name: "expert-quiz-new",
    component: QuizForm,
    meta: { role: "expert" },
  },
  {
    path: "/expert/quizzes/:id/edit",
    name: "expert-quiz-edit",
    component: QuizForm,
    meta: { role: "expert" },
  },
  {
    path: "/athlete/quizzes",
    name: "athlete-quizzes",
    component: () => import("../views/athlete/Quizzes.vue"),
    meta: { role: "athlete" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});
// checks auth and role before each navigation
router.beforeEach((to) => {
  // If the route requires a specific role
  if (to.meta.role) {
    // Not logged in  redirect to login
    if (!getCurrentUser()) {
      return "/login";
    }

    // Wrong role  redirect to home
    if (!hasRole(to.meta.role)) {
      return "/";
    }
  }
});

export default router;
