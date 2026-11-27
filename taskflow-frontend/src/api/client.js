import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL;

if (!apiBaseUrl) {
  throw new Error("VITE_API_URL is required");
}

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthMe = error.config?.url?.includes("/auth/me");

    if (error.response?.status === 401 && !isAuthMe) {
      localStorage.removeItem("token");

      if (typeof window !== "undefined" && window.location?.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    // Attach safe userMessage for user-facing feedback without sensitive details
    if (!error.response) {
      error.userMessage = "Network error: unable to connect to the server. Please check your internet connection.";
    } else if (error.response.status >= 500) {
      error.userMessage = "A server error occurred. Please try again later.";
    } else if (error.response.data?.message) {
      error.userMessage = error.response.data.message;
    }

    return Promise.reject(error);
  }
);

export default api;
