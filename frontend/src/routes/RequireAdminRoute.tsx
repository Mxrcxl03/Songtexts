import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import UserService from "../services/user.service";
import type { User } from "../types/user";

export const RequireAdminRoute = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");

  useEffect(() => {
    let alive = true;
    UserService.getCurrentUser()
      .then((u: User | null) => {
        if (!alive) return;
        if (u?.role === "ADMIN") {setState("ok");}
        else {setState("forbidden");}
      })
      .catch(() => alive && setState("forbidden"));
    return () => { alive = false; };
  }, []);

  if (state === "loading") return <p>Lädt…</p>;
  if (state === "forbidden") return <Navigate to="/" replace />;
  return children;
};
