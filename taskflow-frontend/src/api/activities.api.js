import api from "./client";

export const activitiesApi = {
  getRecent: (params) => api.get("/activities", { params }),
};
