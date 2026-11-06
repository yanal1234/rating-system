import api from "./api";

export const getActiveVotingWindow = async () => {
  const response = await api.get("/voting-windows/active");
  return response.data;
};
