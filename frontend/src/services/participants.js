import api from "./api";

export const getParticipants = async (windowId) => {
  const response = await api.get(`/participants/${windowId}`);
  return response.data;
};

export const getEligibleParticipants = async (windowId) => {
  const response = await api.get(`/participants/eligible/${windowId}`);

  return response.data;
};
