import { configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { fetchNotifications } from "./slices/notificationsSlice";
import { createTask, deleteTask, updateTask } from "./slices/tasksSlice";
import activityReducer from "./slices/activitySlice";
import authReducer from "./slices/authSlice";
import notificationsReducer from "./slices/notificationsSlice";
import tasksReducer from "./slices/tasksSlice";

const notificationSyncListener = createListenerMiddleware();

notificationSyncListener.startListening({
  matcher: isAnyOf(createTask.fulfilled, updateTask.fulfilled, deleteTask.fulfilled),
  effect: async (_, listenerApi) => {
    listenerApi.dispatch(fetchNotifications({ limit: 10, force: true }));
  },
});

export const store = configureStore({
  reducer: {
    activity: activityReducer,
    auth: authReducer,
    notifications: notificationsReducer,
    tasks: tasksReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(notificationSyncListener.middleware),
});
