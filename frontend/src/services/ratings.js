import api from "./api";

export const getMyRatingStats = async (windowId) => {
  const response = await api.get(`/ratings/my-stats/${windowId}`);
  return response.data.stats;
};
