import api from "./client";

export const tasksApi = {
  getAll: (params) => api.get("/tasks", { params }),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  remove: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get("/tasks/stats"),
};
