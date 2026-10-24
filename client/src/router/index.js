import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser, hasRole } from "../stores/auth";

import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import NotFound from "../views/NotFound.vue";

import QuizzesManager from "../views/expert/QuizzesManager.vue";
import QuizForm from "../views/expert/QuizForm.vue";

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
    meta: { role: "expert" },
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
    path: "/expert/quizzes/:id/questions",
    name: "expert-quiz-questions",
    component: () => import("../views/expert/QuizQuestions.vue"),
    meta: { role: "expert" },
  },
  {
    path: "/athlete/quizzes",
    name: "athlete-quizzes",
    component: () => import("../views/athlete/AthleteQuizzes.vue"),
    meta: { role: "athlete" },
  },
  {
    path: "/athlete/quizzes/:id",
    name: "athlete-quiz",
    component: () => import("../views/athlete/AthleteQuizView.vue"),
    meta: { role: "athlete" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Check the user and role before opening protected pages
router.beforeEach(function (to) {
  if (to.meta.role) {
    if (!getCurrentUser()) {
      return "/login";
    }

    if (!hasRole(to.meta.role)) {
      return "/";
    }
  }
});

export default router;