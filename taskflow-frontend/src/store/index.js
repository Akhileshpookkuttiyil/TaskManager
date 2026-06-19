import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import notificationsReducer from "./slices/notificationsSlice";
import tasksReducer from "./slices/tasksSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
    tasks: tasksReducer,
  },
});
