import { useEffect } from "react";
import { useNavigate } from "react-router";
import api from "../services/api";

export const LogoutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const doLogout = async () => {
      try {
        await api.post("/auth/logout");
        navigate("/login", { replace: true });
      } catch (err) {
        console.error("Logout fehlgeschlagen:", err);
        navigate("/login", { replace: true });
      }
    };
    void doLogout();
  }, [navigate]);

  return <p>Logging out...</p>;
};
