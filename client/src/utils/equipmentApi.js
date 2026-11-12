// Requêtes au serveur pour les tuiles, les questions et les réponses.
import { logoutUser } from "@/stores/auth";

// Appelle l'API Équipements avec le token
export async function equipmentRequest(path, method, body) {
  const response = await fetch("http://localhost:3000/api/equipment" + path, {
    method,
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
      "Content-Type": "application/json",
    },
    body,
  });

  // Session expirée
  if (response.status === 401) {
    logoutUser();
    return null;
  }

  if (!response.ok) {
    const error = new Error("Equipment request failed.");
    error.status = response.status;
    throw error;
  }

  return response.json();
}
