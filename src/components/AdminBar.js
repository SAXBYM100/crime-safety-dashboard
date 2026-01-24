import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";

export default function AdminBar() {
  const [admin, setAdmin] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    return auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUser(null);
        setAdmin(false);
        return;
      }

      const token = await u.getIdTokenResult(true);
      setUser(u);
      setAdmin(!!token.claims.admin);
    });
  }, []);

  async function login() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    await signOut(auth);
  }

  if (!user) {
    return (
      <button onClick={login} style={styles.btn}>
        Admin Sign In
      </button>
    );
  }

  return (
    <div style={styles.bar}>
      <span>
        {user.email} — {admin ? "ADMIN" : "USER"}
      </span>
      <button onClick={logout} style={styles.btn}>
        Sign Out
      </button>
    </div>
  );
}

const styles = {
  bar: {
    position: "fixed",
    bottom: 12,
    right: 12,
    background: "#0f172a",
    color: "white",
    padding: "8px 12px",
    borderRadius: 8,
    display: "flex",
    gap: 8,
    alignItems: "center",
    zIndex: 9999
  },
  btn: {
    background: "#14b8a6",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer"
  }
};
