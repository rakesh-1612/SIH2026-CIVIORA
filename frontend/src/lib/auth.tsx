"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: "CITIZEN" | "UNIVERSITY" | "GOVERNMENT_ADMIN" | "INDUSTRY_PARTNER" | "EXPERT";
  account_status?: string;
  auth_mode?: string;
  institution_id?: number | null;
  organization_name?: string | null;
  phone?: string | null;
  location?: string | null;
  department_sector?: string | null;
  created_at?: string | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  organizationName?: string;
  phone?: string;
  location?: string;
  departmentSector?: string;
  institutionId?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  quickLoginDemo: (role: "CITIZEN" | "UNIVERSITY" | "GOVERNMENT_ADMIN" | "INDUSTRY_PARTNER") => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<{ user?: UserProfile; message: string; requiresVerification: boolean }>;
  forgotPassword: (email: string) => Promise<{ message: string; simulated_reset_link?: string | null }>;
  resetPassword: (token: string, newPass: string, confirmPass: string) => Promise<{ message: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_BASE_URL } from "@/lib/api";

const API_BASE = API_BASE_URL;

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delayMs = 400): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return fetch(url, options);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem("civiora_token");
    const savedUser = localStorage.getItem("civiora_user");

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        queueMicrotask(() => {
          setToken(savedToken);
          setUser(parsedUser);
          setLoading(false);
        });
        return;
      } catch {
        localStorage.removeItem("civiora_token");
        localStorage.removeItem("civiora_user");
      }
    }
    queueMicrotask(() => {
      setLoading(false);
    });
  }, []);

  const saveAuthSession = (tok: string, u: UserProfile) => {
    setToken(tok);
    setUser(u);
    localStorage.setItem("civiora_token", tok);
    localStorage.setItem("civiora_user", JSON.stringify(u));
  };

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    const res = await fetchWithRetry(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Authentication failed.");
    }

    const data = await res.json();
    saveAuthSession(data.access_token, data.user);
    return data.user;
  };

  const quickLoginDemo = async (role: "CITIZEN" | "UNIVERSITY" | "GOVERNMENT_ADMIN" | "INDUSTRY_PARTNER"): Promise<UserProfile> => {
    const res = await fetchWithRetry(`${API_BASE}/auth/quick-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Demo sign in failed.");
    }

    const data = await res.json();
    saveAuthSession(data.access_token, data.user);
    return data.user;
  };

  const register = async (payload: RegisterPayload) => {
    const res = await fetchWithRetry(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        confirm_password: payload.confirmPassword,
        role: payload.role,
        organization_name: payload.organizationName,
        phone: payload.phone,
        location: payload.location,
        department_sector: payload.departmentSector,
        institution_id: payload.institutionId
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Account creation failed.");
    }

    const data = await res.json();

    if (data.requires_verification) {
      return {
        message: data.message,
        requiresVerification: true,
        user: data.user
      };
    }

    saveAuthSession(data.access_token, data.user);
    return {
      message: "Account created successfully!",
      requiresVerification: false,
      user: data.user
    };
  };

  const forgotPassword = async (email: string) => {
    const res = await fetchWithRetry(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Password reset request failed.");
    }

    return res.json();
  };

  const resetPassword = async (t: string, newPass: string, confirmPass: string) => {
    const res = await fetchWithRetry(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: t,
        new_password: newPass,
        confirm_password: confirmPass
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Password reset failed.");
    }

    return res.json();
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    const savedToken = localStorage.getItem("civiora_token");
    const res = await fetchWithRetry(`${API_BASE}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {})
      },
      body: JSON.stringify({
        name: updates.name,
        phone: updates.phone,
        location: updates.location,
        organization_name: updates.organization_name,
        department_sector: updates.department_sector
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to update profile.");
    }

    const updatedUser = await res.json();
    if (savedToken) {
      saveAuthSession(savedToken, updatedUser);
    }
    return updatedUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("civiora_token");
    localStorage.removeItem("civiora_user");
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLoginDemo,
        register,
        forgotPassword,
        resetPassword,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
