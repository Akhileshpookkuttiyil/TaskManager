import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "./store/slices/authSlice";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const TasksPage = lazy(() => import("./pages/TasksPage").then((m) => ({ default: m.TasksPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));

const RouteLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
    <Spinner size="lg" />
  </div>
);

const App = () => {
  const dispatch = useDispatch();
  const { token, initialized, hydrating, user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (token && !user && !hydrating) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, hydrating, token, user]);

  if (token && !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary name="RootApp" variant="page">
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <ErrorBoundary name="LoginPage" variant="page">
                <Suspense fallback={<RouteLoading />}>
                  <LoginPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="/register"
            element={
              <ErrorBoundary name="RegisterPage" variant="page">
                <Suspense fallback={<RouteLoading />}>
                  <RegisterPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoading />}>
                  <AppLayout />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
