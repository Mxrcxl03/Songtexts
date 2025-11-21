import React, { useState } from "react";
import AuthService from "../services/auth.service";

export const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await AuthService.register( username, email, password );
      setUsername(""); setEmail(""); setPassword("");
      console.log("Registrierung erfolgreich");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="Email"    value={email}    onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit" disabled={submitting}>{submitting ? "..." : "Sign Up"}</button>
    </form>
  );
};
