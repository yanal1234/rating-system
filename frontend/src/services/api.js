import axios from "axios";
import { startLoading, stopLoading } from "./loading";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Used to prevent multiple simultaneous refresh requests
let refreshPromise = null;

// Start loading before every API request
api.interceptors.request.use(
  (config) => {
    startLoading();
    return config;
  },
  (error) => {
    stopLoading();
    return Promise.reject(error);
  },
);

// Handle API responses and expired access tokens
api.interceptors.response.use(
  (response) => {
    stopLoading();
    return response;
  },

  async (error) => {
    stopLoading();

    const originalRequest = error.config;
    const status = error.response?.status;

    const excludedUrls = [
      "/auth/login",
      "/auth/logout",
      "/auth/refresh",
      "/auth/me",
    ];

    const isExcludedRequest = excludedUrls.some((url) =>
      originalRequest?.url?.includes(url),
    );

    // Access token expired
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isExcludedRequest
    ) {
      originalRequest._retry = true;

      try {
        // Share one refresh request between simultaneous failed requests
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null;
            });
        }

        await refreshPromise;

        // Retry the original request after successful refresh
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token expired or invalid
        window.location.assign("/login");

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
