import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { loadUserFromStorage } from "./stores/auth";

import "./assets/main.css";

// Restore the saved user before displaying the application
loadUserFromStorage();

createApp(App)
  .use(router)
  .mount("#app");