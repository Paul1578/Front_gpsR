"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/backend";
const TOKEN_STORAGE_KEY = "auth_tokens";
const CURRENT_USER_STORAGE_KEY = "currentUser";

type ApiRole = "Admin" | "Driver" | "Manager" | "User" | "Logistics";

interface ApiUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roles: ApiRole[] | string[];
  driverId?: string;
}

// 👇 ADAPTADO para soportar lo que devuelve tu backend actual
interface AuthResponseDto {
  user?: ApiUser;

  // lo que esperábamos originalmente
  accessToken?: string;
  accessTokenExpiration?: string;

  // lo que realmente devuelve tu backend C#
  token?: string;
  expiration?: string;

  refreshToken: string;
  refreshTokenExpiration: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface ApiErrorPayload {
  statusCode?: number;
  error?: string;
  message?: string;
  details?: Record<string, string[]>;
}

interface ApiRequestError {
  message?: string;
  status?: number;
  data?: ApiErrorPayload | string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getApiRequestError = (error: unknown): ApiRequestError | null => {
  if (!isRecord(error)) return null;
  const data = error.data;
  const parsedData = Array.isArray(data)
    ? data.filter((item): item is string => typeof item === "string")
    : isRecord(data)
      ? {
          statusCode: typeof data.statusCode === "number" ? data.statusCode : undefined,
          error: typeof data.error === "string" ? data.error : undefined,
          message: typeof data.message === "string" ? data.message : undefined,
          details: isRecord(data.details)
            ? Object.fromEntries(
                Object.entries(data.details).filter(
                  (entry): entry is [string, string[]] =>
                    Array.isArray(entry[1]) && entry[1].every((value) => typeof value === "string"),
                ),
              )
            : undefined,
        }
      : undefined;
  return {
    message: typeof error.message === "string" ? error.message : undefined,
    status: typeof error.status === "number" ? error.status : undefined,
    data: parsedData,
  };
};

export type UserRole = "superadmin" | "gerente" | "logistica" | "chofer" | "usuario";

export interface UserPermissions {
  canViewMap: boolean;
  canCreateRoutes: boolean;
  canManageVehicles: boolean;
  canManageTeam: boolean;
  canViewOwnRoute: boolean;
  canAccessSuperAdmin?: boolean;
  canManageAllOrganizations?: boolean;
  canViewSystemLogs?: boolean;
  canExportData?: boolean;
}

interface User {
  id: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  email?: string;
  identificacion?: string;
  role: UserRole;
  permissions: UserPermissions;
  teamId?: string;
  teamName?: string;
  isActive?: boolean;
  driverId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<boolean>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string
  ) => Promise<{ ok: boolean; message?: string }>;
  logoutAll: () => Promise<{ ok: boolean; message?: string }>;
  createUser: (
    data: RegisterData & {
      role: UserRole;
      teamId?: string;
      email?: string;
      phoneNumber?: string;
    }
  ) => Promise<{ ok: boolean; invitationSent: boolean; message?: string }>;
  refreshTeamUsers: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  updateUserRole: (userId: string, role: UserRole) => Promise<{ ok: boolean; message?: string }>;
  updateUserStatus: (userId: string, isActive: boolean) => Promise<{ ok: boolean; message?: string }>;
  updateUserProfile: (userId: string, profile: { username: string; firstName: string; lastName: string }) => Promise<{ ok: boolean; message?: string }>;
  getAllUsers: () => User[];
  getTeamUsers: () => User[];
  getManagers: () => User[];
  isSuperAdmin: () => boolean;
  apiFetch: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
}

interface RegisterData {
  nombres: string;
  apellidos: string;
  usuario: string; // Usado como email en el backend
  password: string;
  identificacion?: string;
  phoneNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleMap: Record<ApiRole, UserRole> = {
  Admin: "gerente",
  Driver: "chofer",
  Manager: "logistica",
  User: "usuario",
  Logistics: "logistica",
};

const uiRoleToBackendRole: Record<UserRole, ApiRole> = {
  superadmin: "Admin",
  gerente: "Admin",
  logistica: "Logistics",
  chofer: "Driver",
  usuario: "User",
};

const defaultPermissions: Record<UserRole, UserPermissions> = {
  superadmin: {
    canViewMap: true,
    canCreateRoutes: true,
    canManageVehicles: true,
    canManageTeam: true,
    canViewOwnRoute: true,
    canAccessSuperAdmin: false,
    canManageAllOrganizations: false,
    canViewSystemLogs: false,
    canExportData: false,
  },
  gerente: {
    canViewMap: true,
    canCreateRoutes: true,
    canManageVehicles: true,
    canManageTeam: true,
    canViewOwnRoute: true,
    canAccessSuperAdmin: false,
    canManageAllOrganizations: false,
    canViewSystemLogs: false,
    canExportData: false,
  },
  logistica: {
    canViewMap: true,
    canCreateRoutes: true,
    canManageVehicles: false,
    canManageTeam: false,
    canViewOwnRoute: false,
    canAccessSuperAdmin: false,
    canManageAllOrganizations: false,
    canViewSystemLogs: false,
    canExportData: false,
  },
  chofer: {
    canViewMap: false,
    canCreateRoutes: false,
    canManageVehicles: false,
    canManageTeam: false,
    canViewOwnRoute: true,
    canAccessSuperAdmin: false,
    canManageAllOrganizations: false,
    canViewSystemLogs: false,
    canExportData: false,
  },
  usuario: {
    canViewMap: false,
    canCreateRoutes: false,
    canManageVehicles: false,
    canManageTeam: false,
    canViewOwnRoute: false,
    canAccessSuperAdmin: false,
    canManageAllOrganizations: false,
    canViewSystemLogs: false,
    canExportData: false,
  },
};

export type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  retry?: boolean;
  tokensOverride?: AuthTokens | null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const tokensRef = useRef<AuthTokens | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const isAuthenticated = !!user;

  const setTokens = (tokens: AuthTokens | null) => {
    tokensRef.current = tokens;
    if (typeof window === "undefined") return;
    if (tokens) {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const persistUser = (value: User | null) => {
    setUser(value);
    if (typeof window === "undefined") return;
    if (value) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const restoreSession = async () => {
      try {
        const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedTokens) {
          persistUser(null);
          setIsLoadingUser(false);
          return;
        }
        const parsed: unknown = JSON.parse(storedTokens);
        if (!isRecord(parsed) || typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string") {
          clearAuthState();
          return;
        }
        setTokens({ accessToken: parsed.accessToken, refreshToken: parsed.refreshToken });
        // El perfil cacheado es sólo presentación: rol y permisos siempre vienen del backend.
        const verifiedUser = await fetchMeUser();
        if (verifiedUser) persistUser(verifiedUser);
        else clearAuthState();
      } catch (error) {
        console.error("No se pudo restaurar la sesión guardada.", error);
        clearAuthState();
      } finally {
        setIsLoadingUser(false);
      }
    };

    void restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role !== "chofer") {
      void refreshTeamUsers().catch((error) => {
        console.error("Error obteniendo equipo:", error);
      });
    } else {
      setTeamUsers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) return;

    let mounted = true;
    const verifySession = async () => {
      if (!mounted) return;
      await refreshAccessToken();
    };

    const intervalId = window.setInterval(verifySession, 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void verifySession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const buildApiError = async (response: Response) => {
    let data: ApiErrorPayload | null = null;
    try {
      const text = await response.text();
      data = text ? (JSON.parse(text) as ApiErrorPayload) : null;
    } catch {
      // ignore parse errors
    }
    const enrichedError = new Error(
      data?.message ?? response.statusText
    ) as Error & { status?: number; data?: ApiErrorPayload | null };
    enrichedError.status = response.status;
    enrichedError.data = data;
    return enrichedError;
  };

  const refreshAccessToken = async () => {
    const refreshToken = tokensRef.current?.refreshToken;
    if (!refreshToken) return false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (user) {
          toast?.error?.("Sesión cerrada en otro dispositivo.");
        }
        await clearAuthState();
        return false;
      }
      const data = (await response.json()) as AuthResponseDto;
      await applyAuthResponse(data);
      return true;
    } catch (error) {
      console.error("Error al refrescar token:", error);
      if (user) {
        toast?.error?.("Sesión expirada. Inicia sesión nuevamente.");
      }
      await clearAuthState();
      return false;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const apiFetch = async <T,>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> => {
    const { skipAuth = false, retry = true, tokensOverride, ...fetchOptions } =
      options;
    const headers = new Headers(fetchOptions.headers || {});
    if (!headers.has("Content-Type") && fetchOptions.body) {
      headers.set("Content-Type", "application/json");
    }
    if (!skipAuth) {
      let tokenSource = tokensOverride ?? tokensRef.current;
      // fallback: si el ref no está poblado aún, intenta leer del storage
      if (!tokenSource && typeof window !== "undefined") {
        const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (stored) {
          tokenSource = JSON.parse(stored) as AuthTokens;
          tokensRef.current = tokenSource;
        }
      }
      if (tokenSource?.accessToken) {
        headers.set("Authorization", `Bearer ${tokenSource.accessToken}`);
      }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });

    if (
      response.status === 401 &&
      !skipAuth &&
      retry &&
      tokensRef.current?.refreshToken
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch<T>(path, { ...options, retry: false });
      }
    }

    if (!response.ok) {
      throw await buildApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  };

  const mapApiUser = (apiUser: ApiUser): User => {
    const mappedRole = determineRole(apiUser.roles as ApiRole[]);
    const username = apiUser.username || apiUser.email;
    const displayName = apiUser.firstName || username || apiUser.id;
    return {
      id: apiUser.id,
      nombres: displayName,
      apellidos: apiUser.lastName || "",
      usuario: username,
      email: apiUser.email,
      identificacion: undefined,
      role: mappedRole,
      permissions: defaultPermissions[mappedRole],
      isActive: apiUser.isActive,
      driverId: apiUser.driverId,
    };
  };

  const determineRole = (roles?: ApiRole[] | string | string[]): UserRole => {
    if (Array.isArray(roles)) {
      for (const role of roles) {
        const mapped = roleMap[role as ApiRole];
        if (mapped) return mapped;
      }
    } else if (typeof roles === "string") {
      const mapped = roleMap[roles as ApiRole];
      if (mapped) return mapped;
    }
    return "logistica";
  };

  const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
      const [, payload] = token.split(".");
      if (!payload) return null;
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const getClaimValue = (
    payload: Record<string, unknown>,
    keys: string[]
  ): string | undefined => {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "string") {
        return value;
      }
      if (Array.isArray(value) && value.length && typeof value[0] === "string") {
        return value[0];
      }
    }
    return undefined;
  };

  const generateTempId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `temp-${Date.now()}`;
  };

  const deriveUserFromToken = (token: string): User | null => {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    const id =
      getClaimValue(payload, [
        "sub",
        "nameid",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      ]) ?? generateTempId();

    const email =
      getClaimValue(payload, [
        "email",
        "unique_name",
        "upn",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      ]) ?? "";

    const usernameClaim = getClaimValue(payload, ["username", "preferred_username", "unique_name", "upn"]);

    const firstName =
      getClaimValue(payload, [
        "given_name",
        "firstname",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
        "name",
      ]) ?? "";

    const lastName =
      getClaimValue(payload, [
        "family_name",
        "lastname",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
      ]) ?? "";

    const rolesClaim =
      getClaimValue(payload, [
        "role",
        "roles",
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
      ]) ?? payload["role"];

    const mappedRole = determineRole(
      Array.isArray(rolesClaim)
        ? (rolesClaim as string[])
        : (rolesClaim as string | undefined)
    );

    return {
      id,
      nombres: firstName || usernameClaim || email || id,
      apellidos: lastName,
      usuario: usernameClaim || email || id,
      email,
      role: mappedRole,
      permissions: defaultPermissions[mappedRole],
    };
  };

  const fetchMeUser = async (): Promise<User | null> => {
    if (!tokensRef.current?.accessToken) return null;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const me = await apiFetch<ApiUser>("/Auth/me", { signal: controller.signal });
      return mapApiUser(me);
    } catch (error) {
      console.error("Error obteniendo usuario actual:", error);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  // 👇 AQUÍ ESTÁ EL CAMBIO IMPORTANTE
  const applyAuthResponse = async (data: AuthResponseDto) => {
    // Usar accessToken si viene, si no usar token (del backend C#)
    const accessToken = data.accessToken ?? data.token;

    if (!accessToken) {
      console.error(
        "No se recibió accessToken/token en la respuesta de autenticación"
      );
      clearAuthState();
      return;
    }

    const newTokens: AuthTokens = {
      accessToken,
      refreshToken: data.refreshToken,
    };
    setTokens(newTokens);

    if (data.user) {
      persistUser(mapApiUser(data.user));
      setIsLoadingUser(false);
      return;
    }

    const fetched = await fetchMeUser();
    if (fetched) {
      persistUser(fetched);
      setIsLoadingUser(false);
      return;
    }

    const derived = deriveUserFromToken(accessToken);
    if (derived) {
      persistUser(derived);
    } else {
      persistUser(null);
    }
    setIsLoadingUser(false);
  };

  const clearAuthState = () => {
    persistUser(null);
    setTokens(null);
    setIsLoadingUser(false);
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      const data = await apiFetch<AuthResponseDto>("/Auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      await applyAuthResponse(data);
      return { ok: true };
    } catch (error) {
      console.error("Error en login:", error);
      const message =
        (error as Error)?.message ??
        "No pudimos iniciar sesión. Verifica tus credenciales.";
      return { ok: false, message };
    }
  };

  const buildRegisterUsername = (data: RegisterData) => {
    const fullName = `${data.nombres.trim()} ${data.apellidos.trim()}`.trim().replace(/\s+/g, " ");
    if (fullName) return fullName;
    const candidate = data.usuario.includes("@")
      ? data.usuario.split("@")[0] ?? data.usuario
      : data.usuario;
    const sanitized = candidate.replace(/[^a-zA-Z0-9._-]/g, "");
    if (sanitized) return sanitized;
    return `user${Date.now()}`;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const payload = {
        username: buildRegisterUsername(data),
        email: data.usuario,
        password: data.password,
      };
      const response = await apiFetch<AuthResponseDto>("/Auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      await applyAuthResponse(response);
      return true;
    } catch (error) {
      console.error("Error en registro:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (tokensRef.current?.refreshToken) {
        await apiFetch("/Auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: tokensRef.current.refreshToken }),
          skipAuth: true,
        });
      }
    } catch (error) {
      if (getApiRequestError(error)?.status !== 401) {
        console.error("Error al cerrar sesión:", error);
      }
    } finally {
      clearAuthState();
    }
  };

  // ---------------------------------------------------------------------------
  // Operaciones del equipo conectadas a la API.
  // ---------------------------------------------------------------------------

  const createUser = async (
    data: RegisterData & {
      role: UserRole;
      teamId?: string;
      email?: string;
      phoneNumber?: string;
    }
  ): Promise<{ ok: boolean; invitationSent: boolean; message?: string }> => {
    try {
      const payload = {
        username: data.usuario,
        email: data.email ?? data.usuario,
        // La API genera una contraseña temporal aleatoria cuando este campo va vacío.
        password: data.password?.trim() ?? "",
        roleName: uiRoleToBackendRole[data.role],
        teamId: data.teamId,
        firstName: data.nombres,
        lastName: data.apellidos,
        documentNumber: data.identificacion,
        phoneNumber: data.phoneNumber,
      };

      const result = await apiFetch<{ invitationSent?: boolean }>("/Users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return { ok: true, invitationSent: result.invitationSent !== false };
    } catch (error) {
      const errData = getApiRequestError(error)?.data;
      const errorMessage = isRecord(errData) && typeof errData.message === "string"
        ? errData.message
        : undefined;
      const message =
        errorMessage ||
        (Array.isArray(errData) ? errData.join(", ") : "") ||
        getApiRequestError(error)?.message ||
        "Error al crear usuario";
      return { ok: false, invitationSent: false, message };
    }
  };

  const getAllUsers = (): User[] => {
    return teamUsers;
  };

  const refreshTeamUsers = async () => {
    const data = await apiFetch<ApiUser[]>("/Users/my-team");
    setTeamUsers(data.map(mapApiUser));
  };

  const getTeamUsers = (): User[] => {
    return teamUsers;
  };

  const getManagers = (): User[] => {
    return teamUsers.filter((u) => u.role === "gerente");
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const targetRole = uiRoleToBackendRole[newRole];

    try {
      await apiFetch(`/Users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ roleName: targetRole }),
      });

      setTeamUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole, permissions: defaultPermissions[newRole] } : u
        )
      );
      if (user?.id === userId) {
        persistUser({ ...(user as User), role: newRole, permissions: defaultPermissions[newRole] });
      }
      return { ok: true as const };
    } catch (error) {
      console.error("Error actualizando rol:", error);
      return {
        ok: false as const,
        message: getApiRequestError(error)?.message ?? "No se pudo actualizar el rol",
      };
    }
  };

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await apiFetch(`/Users/${userId}/status?isActive=${isActive}`, { method: "PUT" });
      setTeamUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)));
      return { ok: true as const };
    } catch (error) {
      console.error("Error actualizando estado de usuario:", error);
      return {
        ok: false as const,
        message: getApiRequestError(error)?.message ?? "No se pudo actualizar el estado del usuario",
      };
    }
  };

  const updateUserProfile = async (
    userId: string,
    profile: { username: string; firstName: string; lastName: string },
  ) => {
    try {
      await apiFetch<ApiUser>(`/Users/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        message: getApiRequestError(error)?.message ?? "No se pudo actualizar el perfil del usuario",
      };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      await apiFetch("/Auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      return { ok: true };
    } catch (error) {
      const errData = getApiRequestError(error)?.data;
      const validationErrors = isRecord(errData) ? errData.errors : undefined;
      const message =
        (isRecord(errData) && typeof errData.message === "string"
          ? errData.message
          : undefined) ||
        (Array.isArray(validationErrors) &&
        validationErrors.every((item): item is string => typeof item === "string")
          ? validationErrors.join(", ")
          : undefined) ||
        getApiRequestError(error)?.message ||
        "No se pudo cambiar la contraseña";
      return { ok: false, message };
    }
  };

  const logoutAll = async () => {
    try {
      await apiFetch("/Auth/logout-all", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await logout();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: getApiRequestError(error)?.message ?? "No se pudo cerrar sesión en los demás dispositivos",
      };
    }
  };

  const isSuperAdmin = () => user?.role === "superadmin";

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        changePassword,
        logoutAll,
        createUser,
        logout,
        isAuthenticated: !!user,
        isLoadingUser,
        updateUserRole,
        updateUserStatus,
        updateUserProfile,
        getAllUsers,
        getTeamUsers,
        refreshTeamUsers,
        getManagers,
        isSuperAdmin,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}
