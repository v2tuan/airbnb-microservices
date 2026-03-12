import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSelectors";

export default function ProtectedRoute() {
    const isAuthenticated = useSelector(selectIsAuthenticated);

    if (!isAuthenticated) {
        console.log("abc")
        // return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}