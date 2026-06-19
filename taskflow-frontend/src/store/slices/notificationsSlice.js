import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { notificationsApi } from "../../api/notifications.api";

export const fetchNotifications = createAsyncThunk("notifications/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const res = await notificationsApi.getAll(params);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch notifications");
  }
});

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
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllNotificationsRead.fulfilled, (state, action) => {
        state.items = action.payload.notifications || [];
        state.unreadCount = action.payload.unreadCount ?? 0;
      });
  },
});

export const { clearNotificationError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
