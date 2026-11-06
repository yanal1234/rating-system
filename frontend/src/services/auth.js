import api from "./api";

// Login
export const loginUser = async (credentials) => {
  const { data } = await api.post("/auth/login", credentials);
  return data;
};

// Logout
export const logoutUser = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};

// Get current logged-in user
export const getCurrentUser = async () => {
  const { data } = await api.get("/auth/me");
  return data.user;
};

// Refresh access token
export const refreshAccessToken = async () => {
  const { data } = await api.post("/auth/refresh");
  return data;
};
