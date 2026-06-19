import { configureStore } from "@reduxjs/toolkit";
import activityReducer from "./slices/activitySlice";
import authReducer from "./slices/authSlice";
import notificationsReducer from "./slices/notificationsSlice";
import tasksReducer from "./slices/tasksSlice";

export const store = configureStore({
  reducer: {
    activity: activityReducer,
    auth: authReducer,
    notifications: notificationsReducer,
    tasks: tasksReducer,
  },
});
