import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/signin-mobile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Invalid credentials");
    }
    const data = await res.json();
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    await AsyncStorage.setItem("session_token", data.token ?? "");
    setUser(data.user);
  }

  async function signOut() {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("session_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
