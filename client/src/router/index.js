import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser, hasRole } from "../stores/auth";

import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import NotFound from "../views/NotFound.vue";

import QuizzesManager from "../views/expert/QuizzesManager.vue";
import QuizForm from "../views/expert/QuizForm.vue";
import QuizQuestions from "../views/expert/QuizQuestions.vue";
import InjuryView from "../views/InjuryView.vue";
import AthleteQuizzes from "../views/athlete/AthleteQuizzes.vue";
import AthleteQuizView from "../views/athlete/AthleteQuizView.vue";
import EquipmentView from "../views/athlete/EquipmentView.vue";
import NutritionPlans from "../views/athlete/NutritionPlans.vue";
import AthleteProfile from "../views/athlete/AthleteProfile.vue";

const routes = [
  {
    path: "/athlete/profile",
    name: "athlete-profile",
    component: AthleteProfile,
    meta: { role: "athlete" },
  },
  {
    path: "/nutrition",
    name: "nutrition-plans",
    component: NutritionPlans,
    meta: { role: "athlete" },
  },
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
    path: "/injuries",
    alias: "/blessures",
    name: "injury",
    component: InjuryView,
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
    component: QuizQuestions,
    meta: { role: "expert" },
  },
  {
    path: "/athlete/quizzes",
    name: "athlete-quizzes",
    component: AthleteQuizzes,
    meta: { role: "athlete" },
  },
  {
    path: "/athlete/quizzes/:id",
    name: "athlete-quiz",
    component: AthleteQuizView,
    meta: { role: "athlete" },
  },
  {
    path: "/equipment",
    name: "equipment",
    component: EquipmentView,
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
router.beforeEach(function (targetRoute) {
  if (targetRoute.meta.role) {
    if (!getCurrentUser()) {
      return "/login";
    }

    if (!hasRole(targetRoute.meta.role)) {
      return "/";
    }
  }
});

export default router;
