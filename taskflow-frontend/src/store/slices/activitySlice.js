import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { activitiesApi } from "../../api/activities.api";

export const fetchRecentActivities = createAsyncThunk("activity/fetchRecent", async (params, { rejectWithValue }) => {
  try {
    const res = await activitiesApi.getRecent(params);
    return res.data.data.activities;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch recent activity");
  }
});

const activitySlice = createSlice({
  name: "activity",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearActivityError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecentActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchRecentActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearActivityError } = activitySlice.actions;
export default activitySlice.reducer;
