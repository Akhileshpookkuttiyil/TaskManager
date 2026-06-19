import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tasksApi } from "../../api/tasks.api";

const getTaskRequestKey = (params = {}) =>
  JSON.stringify({
    view: params.view || "all",
    status: params.status || "",
    priority: params.priority || "",
    dueDate: params.dueDate || "",
    search: params.search || "",
    sortBy: params.sortBy || "createdAt",
    order: params.order || "desc",
    page: params.page || 1,
    limit: params.limit || 10,
  });

export const fetchTasks = createAsyncThunk(
  "tasks/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const res = await tasksApi.getAll(params);
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

const tasksSlice = createSlice({
  name: "tasks",
  initialState: {
    items: [],
    pagination: null,
    stats: null,
    loading: false,
    statsLoading: false,
    error: null,
    currentRequestKey: null,
    lastRequestKey: null,
    lastFetchedAt: null,
    statsLastFetchedAt: null,
    filters: { view: "all", status: "", priority: "", dueDate: "", search: "", sortBy: "createdAt", order: "desc", page: 1 },
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
        state.items = action.payload.tasks;
        state.pagination = action.payload.pagination;
        state.lastRequestKey = getTaskRequestKey(action.meta.arg);
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
        if (state.stats) state.stats.total += 1;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
        if (state.stats) state.stats.total = Math.max(0, state.stats.total - 1);
      });
  },
});

export const { setFilters, setPage, clearError } = tasksSlice.actions;
export default tasksSlice.reducer;
