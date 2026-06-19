import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Spinner } from "../ui/Spinner";

export const ProtectedRoute = ({ children }) => {
  const { token, initialized, hydrating } = useSelector((s) => s.auth);

  if (token && (!initialized || hydrating)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return children;
};
