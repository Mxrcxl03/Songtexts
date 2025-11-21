import { useEffect, useState, type ReactNode } from "react";
import api from "../services/api";

export const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    api.get("/public/user/me", { withCredentials: true })
      .then(() => setIsAuth(true))
      .catch(() => setIsAuth(false));
  }, []);

  if (isAuth === null) {
    return <p>Lädt....</p>;
  }
/*
  if (isAuth === false) {
    return <Navigate to="/login" replace />;
  }
*/
  return children;
};