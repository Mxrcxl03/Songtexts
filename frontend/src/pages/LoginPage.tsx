import { useState } from "react";
import AuthService from "../services/auth.service";
import { useNavigate } from "react-router";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await AuthService.login(username, password);
      navigate("/", {replace: true})
    } catch (e: any) {
      setErr(e?.message ?? "Login fehlgeschlagen");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Login</h1>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Anmelden</button>
    </form>
  );
}
