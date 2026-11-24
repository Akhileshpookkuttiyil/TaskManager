import api from "./client";

export const activitiesApi = {
  getRecent: (params) => api.get("/activities", { params }),
  getTaskActivities: (taskId, params) => api.get(`/tasks/${taskId}/activities`, { params }),
};
