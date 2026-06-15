import axios from "axios";
import { deleteCookie, getCookie } from "cookies-next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: typeof window !== "undefined" ? "/api" : API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getCookie("pro_token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

let isRedirecting = false;

function clearSessionAndRedirect() {
  if (typeof window === "undefined" || isRedirecting) return;
  isRedirecting = true;
  deleteCookie("pro_token", { path: "/" });
  deleteCookie("pro_establishment_id", { path: "/" });
  deleteCookie("pro_user_name", { path: "/" });
  setTimeout(() => {
    window.location.href = "/login";
  }, 100);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (typeof window !== "undefined" && status === 401) {
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);
