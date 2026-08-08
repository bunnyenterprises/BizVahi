import axios from "axios";

// In production: set REACT_APP_API_URL in Vercel dashboard
// In development: create frontend/.env.local with REACT_APP_API_URL=http://localhost:8000/api
// NEVER put real API keys or MongoDB URLs in frontend code
const BACKEND_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: BACKEND_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("em_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("em_token");
      localStorage.removeItem("em_user");

      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/signup") &&
        window.location.pathname !== "/"
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);