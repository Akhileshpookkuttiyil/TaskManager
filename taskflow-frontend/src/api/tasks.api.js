import api from "./client";

export const tasksApi = {
  getAll: (params) => api.get("/tasks", { params }),
  fetchAll: async (params = {}) => {
    // Respect backend MAX_PAGE_SIZE = 50
    const queryParams = { ...params };
    delete queryParams.all;
    const firstRes = await tasksApi.getAll({ ...queryParams, page: 1, limit: 50 });
    const { tasks: firstTasks = [], pagination } = firstRes.data?.data || {};
    const totalPages = pagination?.pages || 1;

    if (totalPages <= 1) {
      return {
        data: {
          data: {
            tasks: firstTasks,
            pagination: {
              total: pagination?.total ?? firstTasks.length,
              page: 1,
              pages: 1,
              limit: firstTasks.length,
            },
          },
        },
      };
    }

    const pagePromises = [];
    for (let p = 2; p <= totalPages; p += 1) {
      pagePromises.push(tasksApi.getAll({ ...queryParams, page: p, limit: 50 }));
    }

    const remainingResponses = await Promise.all(pagePromises);
    const combinedTasks = [...firstTasks];
    remainingResponses.forEach((res) => {
      const pageTasks = res.data?.data?.tasks || [];
      combinedTasks.push(...pageTasks);
    });

    // Deduplicate by task _id
    const taskMap = new Map();
    combinedTasks.forEach((t) => {
      if (t && t._id) {
        taskMap.set(t._id, t);
      }
    });

    const uniqueTasks = Array.from(taskMap.values());
    return {
      data: {
        data: {
          tasks: uniqueTasks,
          pagination: {
            total: pagination?.total ?? uniqueTasks.length,
            page: 1,
            pages: 1,
            limit: uniqueTasks.length,
          },
        },
      },
    };
  },
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  remove: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get("/tasks/stats"),
};
