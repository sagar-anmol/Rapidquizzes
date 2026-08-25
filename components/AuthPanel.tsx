"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  onAuthed: () => void;
  onCancel: () => void;
};

export default function AuthPanel({ onAuthed, onCancel }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const client = supabaseBrowser();
    const result =
      mode === "login"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account created! Check your email to confirm, then log in.");
      setMode("login");
      return;
    }

    onAuthed();
  }

  return (
    <div className="authOverlay" onClick={onCancel}>
      <form className="loginCard authCard" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="muted">
          {mode === "login"
            ? "Log in to attempt quizzes and track progress."
            : "Sign up free — takes ten seconds."}
        </p>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
          />
        </label>
        <button className="primaryBtn" type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <button
          type="button"
          className="ghost switchModeBtn"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Already registered? Log in"}
        </button>
        {message && <p className="message">{message}</p>}
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .authOverlay {
          position: fixed;
          inset: 0;
          background: rgba(9, 9, 11, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 16px;
        }
        .authCard {
          width: min(420px, 100%);
        }
        .primaryBtn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          margin-top: 6px;
        }
        .switchModeBtn {
          width: 100%;
          margin-top: 8px;
        }
      `}} />
    </div>
  );
}
