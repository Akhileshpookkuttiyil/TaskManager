import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createElement } from "react";
import toast from "react-hot-toast";
import { tasksApi } from "../../api/tasks.api.js";

const getTaskRequestKey = (params = {}) =>
  JSON.stringify({
    all: Boolean(params.all),
    view: params.view || "all",
    status: params.status || "",
    priority: params.priority || "",
    dueDate: params.dueDate || "",
    search: params.search || "",
    tag: params.tag || "",
    sortBy: params.sortBy || "createdAt",
    order: params.order || "desc",
    page: params.all ? 1 : params.page || 1,
    limit: params.all ? 50 : params.limit || 10,
  });

export const fetchTasks = createAsyncThunk(
  "tasks/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = params.all ? await tasksApi.fetchAll(params) : await tasksApi.getAll(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch tasks");
    }
  },
  {
    condition: (params = {}, { getState }) => {
      const { tasks } = getState();
      const requestKey = getTaskRequestKey(params);

      if (params.force) return true;
      if (tasks.loading && tasks.currentRequestKey === requestKey) return false;
      if (tasks.lastFetchedAt && tasks.lastRequestKey === requestKey && Date.now() - tasks.lastFetchedAt < 10000) return false;

      return true;
    },
  }
);

export const fetchDashboardTasks = createAsyncThunk(
  "tasks/fetchDashboardTasks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await tasksApi.fetchAll(params);
      return res.data.data.tasks;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch dashboard tasks");
    }
  },
  {
    condition: (params = {}, { getState }) => {
      const { tasks } = getState();
      if (params.force) return true;
      if (tasks.dashboard?.loading) return false;
      if (tasks.dashboard?.lastFetchedAt && Date.now() - tasks.dashboard.lastFetchedAt < 10000) return false;
      return true;
    },
  }
);

export const fetchAnalyticsTasks = createAsyncThunk(
  "tasks/fetchAnalyticsTasks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await tasksApi.fetchAll(params);
      return res.data.data.tasks;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch analytics tasks");
    }
  },
  {
    condition: (params = {}, { getState }) => {
      const { tasks } = getState();
      if (params.force) return true;
      if (tasks.analytics?.loading) return false;
      if (tasks.analytics?.lastFetchedAt && Date.now() - tasks.analytics.lastFetchedAt < 10000) return false;
      return true;
    },
  }
);

export const fetchStats = createAsyncThunk(
  "tasks/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await tasksApi.getStats();
      return res.data.data.stats;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  },
  {
    condition: (params = {}, { getState }) => {
      const { tasks } = getState();

      if (params.force) return true;
      if (tasks.statsLoading) return false;
      if (tasks.statsLastFetchedAt && Date.now() - tasks.statsLastFetchedAt < 10000) return false;

      return true;
    },
  }
);

export const createTask = createAsyncThunk("tasks/create", async (data, { rejectWithValue }) => {
  try {
    const res = await tasksApi.create(data);
    return res.data.data.task;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create task");
  }
});

export const updateTask = createAsyncThunk("tasks/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await tasksApi.update(id, data);
    return res.data.data.task;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update task");
  }
});

export const deleteTask = createAsyncThunk("tasks/delete", async (id, { rejectWithValue }) => {
  try {
    await tasksApi.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete task");
  }
});

// Module-level map to manage persistent deletion timers and toast IDs across route changes
const activeDeletionTimers = new Map();

export const cancelScheduledDelete = (taskId) => (dispatch) => {
  const entry = activeDeletionTimers.get(taskId);
  if (entry) {
    clearTimeout(entry.timeoutId);
    if (entry.toastId) {
      toast.dismiss(entry.toastId);
    }
    activeDeletionTimers.delete(taskId);
    dispatch(restorePendingTask(taskId));
    toast.success("Deletion cancelled.");
  }
};

export const requestDeleteTask = ({ id, delay = 4000 }) => (dispatch) => {
  if (activeDeletionTimers.has(id)) {
    return; // Prevent duplicate deletion requests
  }

  // Hide the task immediately in the Redux store
  dispatch(stagePendingDelete(id));

  const toastId = toast((t) => (
    createElement(
      "div",
      { className: "flex items-center justify-between gap-3 text-xs font-semibold py-1" },
      createElement("span", null, "Task deleted."),
      createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            toast.dismiss(t.id);
            dispatch(cancelScheduledDelete(id));
          },
          className: "text-xs font-bold text-primary uppercase tracking-wider hover:underline focus:outline-none",
        },
        "Undo"
      )
    )
  ), { duration: delay });

  const timeoutId = setTimeout(async () => {
    activeDeletionTimers.delete(id);
    const result = await dispatch(deleteTask(id));
    if (deleteTask.fulfilled.match(result)) {
      dispatch(finalizeDelete(id));
    } else {
      dispatch(restorePendingTask(id));
      toast.error("Failed to delete task.");
    }
  }, delay);

  activeDeletionTimers.set(id, { timeoutId, toastId });
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState: {
    items: [],
    pendingDeleteIds: [],
    pendingDeleteTasks: {},
    pagination: null,
    stats: null,
    loading: false,
    statsLoading: false,
    error: null,
    currentRequestKey: null,
    lastRequestKey: null,
    lastFetchedAt: null,
    statsLastFetchedAt: null,
    dashboard: {
      tasks: [],
      loading: false,
      error: null,
      lastFetchedAt: null,
    },
    analytics: {
      tasks: [],
      loading: false,
      error: null,
      lastFetchedAt: null,
    },
    filters: {
      view: "all",
      status: "",
      priority: "",
      dueDate: "",
      search: "",
      tag: "",
      sortBy: "createdAt",
      order: "desc",
      page: 1,
    },
  },
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload, page: 1 };
    },
    setPage(state, action) {
      state.filters.page = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    stagePendingDelete(state, action) {
      const id = action.payload;
      if (!state.pendingDeleteIds.includes(id)) {
        state.pendingDeleteIds.push(id);
      }
      const existing =
        state.items.find((t) => t._id === id) ||
        state.dashboard?.tasks?.find((t) => t._id === id) ||
        state.analytics?.tasks?.find((t) => t._id === id);
      if (existing) {
        state.pendingDeleteTasks[id] = existing;
      }
      state.items = state.items.filter((t) => t._id !== id);
      if (state.dashboard?.tasks) {
        state.dashboard.tasks = state.dashboard.tasks.filter((t) => t._id !== id);
      }
      if (state.analytics?.tasks) {
        state.analytics.tasks = state.analytics.tasks.filter((t) => t._id !== id);
      }
      if (state.stats) {
        state.stats.total = Math.max(0, state.stats.total - 1);
      }
    },
    restorePendingTask(state, action) {
      const id = action.payload;
      state.pendingDeleteIds = state.pendingDeleteIds.filter((pid) => pid !== id);
      const savedTask = state.pendingDeleteTasks[id];
      if (savedTask) {
        if (!state.items.some((t) => t._id === id)) {
          state.items.unshift(savedTask);
        }
        if (state.dashboard?.tasks && !state.dashboard.tasks.some((t) => t._id === id)) {
          state.dashboard.tasks.unshift(savedTask);
        }
        if (state.analytics?.tasks && !state.analytics.tasks.some((t) => t._id === id)) {
          state.analytics.tasks.unshift(savedTask);
        }
        if (state.stats) {
          state.stats.total += 1;
        }
      }
      delete state.pendingDeleteTasks[id];
    },
    finalizeDelete(state, action) {
      const id = action.payload;
      state.pendingDeleteIds = state.pendingDeleteIds.filter((pid) => pid !== id);
      delete state.pendingDeleteTasks[id];
      state.items = state.items.filter((t) => t._id !== id);
      if (state.dashboard?.tasks) {
        state.dashboard.tasks = state.dashboard.tasks.filter((t) => t._id !== id);
      }
      if (state.analytics?.tasks) {
        state.analytics.tasks = state.analytics.tasks.filter((t) => t._id !== id);
      }
    },
    updateParentProgress(state, action) {
      const { parentId, progress } = action.payload;
      const updateTaskItem = (t) => {
        if (t && t._id === parentId) {
          t.subtasksProgress = progress;
          t.subtasksCount = progress ? progress.total : 0;
          t.completedSubtasksCount = progress ? progress.completed : 0;
        }
      };
      state.items.forEach(updateTaskItem);
      if (state.dashboard?.tasks) state.dashboard.tasks.forEach(updateTaskItem);
      if (state.analytics?.tasks) state.analytics.tasks.forEach(updateTaskItem);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequestKey = getTaskRequestKey(action.meta.arg);
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        // Keep tasks that are not awaiting server deletion
        state.items = action.payload.tasks.filter((t) => !state.pendingDeleteIds.includes(t._id));
        state.pagination = action.payload.pagination;
        state.lastRequestKey = getTaskRequestKey(action.meta.arg);
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchDashboardTasks.pending, (state) => {
        state.dashboard.loading = true;
        state.dashboard.error = null;
      })
      .addCase(fetchDashboardTasks.fulfilled, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.tasks = action.payload.filter((t) => !state.pendingDeleteIds.includes(t._id));
        state.dashboard.lastFetchedAt = Date.now();
      })
      .addCase(fetchDashboardTasks.rejected, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.error = action.payload;
      })
      .addCase(fetchAnalyticsTasks.pending, (state) => {
        state.analytics.loading = true;
        state.analytics.error = null;
      })
      .addCase(fetchAnalyticsTasks.fulfilled, (state, action) => {
        state.analytics.loading = false;
        state.analytics.tasks = action.payload.filter((t) => !state.pendingDeleteIds.includes(t._id));
        state.analytics.lastFetchedAt = Date.now();
      })
      .addCase(fetchAnalyticsTasks.rejected, (state, action) => {
        state.analytics.loading = false;
        state.analytics.error = action.payload;
      })
      .addCase(fetchStats.pending, (state) => {
        state.statsLoading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
        state.statsLoading = false;
        state.statsLastFetchedAt = Date.now();
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        if (state.dashboard?.tasks) {
          state.dashboard.tasks.unshift(action.payload);
        }
        if (state.analytics?.tasks) {
          state.analytics.tasks.unshift(action.payload);
        }
        if (state.stats) {
          state.stats.total += 1;
          state.stats.pending = (state.stats.pending || 0) + 1;
        }
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;

        if (state.dashboard?.tasks) {
          const dashIdx = state.dashboard.tasks.findIndex((t) => t._id === action.payload._id);
          if (dashIdx !== -1) state.dashboard.tasks[dashIdx] = action.payload;
        }

        if (state.analytics?.tasks) {
          const anaIdx = state.analytics.tasks.findIndex((t) => t._id === action.payload._id);
          if (anaIdx !== -1) state.analytics.tasks[anaIdx] = action.payload;
        }

        state.statsLastFetchedAt = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.pendingDeleteIds = state.pendingDeleteIds.filter((pid) => pid !== action.payload);
        delete state.pendingDeleteTasks[action.payload];
        state.items = state.items.filter((t) => t._id !== action.payload);
        if (state.dashboard?.tasks) {
          state.dashboard.tasks = state.dashboard.tasks.filter((t) => t._id !== action.payload);
        }
        if (state.analytics?.tasks) {
          state.analytics.tasks = state.analytics.tasks.filter((t) => t._id !== action.payload);
        }
        if (state.stats) state.stats.total = Math.max(0, state.stats.total - 1);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        const id = action.meta.arg;
        state.pendingDeleteIds = state.pendingDeleteIds.filter((pid) => pid !== id);
        const savedTask = state.pendingDeleteTasks[id];
        if (savedTask) {
          if (!state.items.some((t) => t._id === id)) {
            state.items.unshift(savedTask);
          }
          if (state.dashboard?.tasks && !state.dashboard.tasks.some((t) => t._id === id)) {
            state.dashboard.tasks.unshift(savedTask);
          }
          if (state.analytics?.tasks && !state.analytics.tasks.some((t) => t._id === id)) {
            state.analytics.tasks.unshift(savedTask);
          }
          if (state.stats) {
            state.stats.total += 1;
          }
        }
        delete state.pendingDeleteTasks[id];
      });
  },
});

export const { setFilters, setPage, clearError, stagePendingDelete, restorePendingTask, finalizeDelete, updateParentProgress } =
  tasksSlice.actions;
export default tasksSlice.reducer;
