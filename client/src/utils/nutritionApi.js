import { logoutUser } from "@/stores/auth";

// Use the same login and error handling in both nutrition screens.
export async function nutritionRequest(router, path, method = "GET", body) {
  const options = {
    method: method,
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch("http://localhost:3000/api/nutrition" + path, options);
  // Return to login when the session has ended.
  if (response.status === 401) {
    logoutUser();
    await router.replace("/login");
    throw new Error("Please log in again.");
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "The request failed.");
  }
  return data;
}
