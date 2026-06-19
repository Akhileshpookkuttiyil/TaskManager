import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { notificationsApi } from "../../api/notifications.api";

const getRequestKey = (params = {}) =>
  JSON.stringify({
    limit: params.limit ?? 20,
    unreadOnly: params.unreadOnly ?? false,
  });

const getNotificationIndex = (state, id) => state.items.findIndex((item) => item._id === id);

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const res = await notificationsApi.getAll(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch notifications");
    }
  },
  {
    condition: (params = {}, { getState }) => {
      const { notifications } = getState();
      const isLoading = notifications.loading;
      if (isLoading) return false;

      if (params.force) return true;

      const requestKey = getRequestKey(params);
      const staleAfter = 15000;
      const isSameRequest = notifications.lastRequestKey === requestKey;
      const isFresh = notifications.lastFetchedAt && Date.now() - notifications.lastFetchedAt < staleAfter;

      return !(isSameRequest && isFresh);
    },
  }
);

export const markNotificationRead = createAsyncThunk("notifications/markRead", async (id, { rejectWithValue }) => {
  try {
    const res = await notificationsApi.markRead(id);
    return res.data.data.notification;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update notification");
  }
});

export const markAllNotificationsRead = createAsyncThunk("notifications/markAllRead", async (_, { rejectWithValue }) => {
  try {
    const res = await notificationsApi.markAllRead();
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update notifications");
  }
});

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
    lastFetchedAt: null,
    lastRequestKey: null,
  },
  reducers: {
    clearNotificationError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.notifications || [];
        state.unreadCount = action.payload.unreadCount ?? 0;
        state.lastFetchedAt = Date.now();
        state.lastRequestKey = getRequestKey(action.meta.arg);
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.pending, (state, action) => {
        const index = getNotificationIndex(state, action.meta.arg);
        if (index === -1) return;

        const notification = state.items[index];
        if (!notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        const index = getNotificationIndex(state, action.meta.arg);
        if (index === -1) return;

        const notification = state.items[index];
        if (notification.isRead) {
          notification.isRead = false;
          notification.readAt = null;
          state.unreadCount += 1;
        }
        state.error = action.payload;
      })
      .addCase(markAllNotificationsRead.pending, (state) => {
        state.items = state.items.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        }));
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state, action) => {
        state.items = action.payload.notifications || [];
        state.unreadCount = action.payload.unreadCount ?? 0;
      })
      .addCase(markAllNotificationsRead.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearNotificationError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
