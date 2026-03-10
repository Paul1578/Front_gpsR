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
const TOAST_DEDUPE_WINDOW_MS = 8000;
const API_READ_RETRY_MAX_ATTEMPTS = 1;
const API_READ_RETRY_BASE_DELAY_MS = 500;

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
  errors?: string[];
  details?: Record<string, string[]>;
}

export type UserRole = "superadmin" | "gerente" | "logistica" | "chofer";

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

export interface User {
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
  logoutAll: () => Promise<void>;
  createUser: (
    data: RegisterData & { role: UserRole; teamId?: string; email?: string }
  ) => Promise<boolean>;
  refreshTeamUsers: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  updateUserPermissions: (
    userId: string,
    permissions: Partial<UserPermissions>
  ) => void;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  updateTeamName: (teamName: string) => void;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleMap: Record<ApiRole, UserRole> = {
  Admin: "gerente",
  Driver: "chofer",
  Manager: "logistica",
  User: "logistica",
  Logistics: "logistica",
};

const uiRoleToBackendRole: Record<UserRole, ApiRole> = {
  superadmin: "Admin",
  gerente: "Admin",
  logistica: "Logistics",
  chofer: "Driver",
};

const DEFAULT_REGISTER_ROLE: ApiRole = "Admin";

const defaultPermissions: Record<UserRole, UserPermissions> = {
  superadmin: {
    canViewMap: true,
    canCreateRoutes: true,
    canManageVehicles: true,
    canManageTeam: true,
    canViewOwnRoute: true,
    canAccessSuperAdmin: true,
    canManageAllOrganizations: true,
    canViewSystemLogs: true,
    canExportData: true,
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
};

export type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  retry?: boolean;
  tokensOverride?: AuthTokens | null;
};

type StoredUser = User & { password?: string };
type ApiErrorLike = Error & {
  status?: number;
  data?: ApiErrorPayload | string[] | null;
};

const isSafeReadMethod = (method?: string) => {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS";
};

const isRetryableStatus = (status?: number) => {
  if (typeof status !== "number") return false;
  return status === 408 || status === 429 || status >= 500;
};

const isAbortError = (error: unknown) =>
  (error as { name?: string } | null)?.name === "AbortError";

const getStoredUsers = (): StoredUser[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("users");
  return raw ? (JSON.parse(raw) as StoredUser[]) : [];
};

const saveStoredUsers = (users: StoredUser[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("users", JSON.stringify(users));
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const tokensRef = useRef<AuthTokens | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const isAuthenticated = !!user;
  const fetchMeUserRef = useRef<(() => Promise<User | null>) | null>(null);
  const deriveUserFromTokenRef = useRef<((token: string) => User | null) | null>(
    null
  );
  const refreshTeamUsersRef = useRef<(() => Promise<void>) | null>(null);
  const refreshAccessTokenRef = useRef<(() => Promise<boolean>) | null>(null);
  const toastDedupRef = useRef<Map<string, number>>(new Map());

  const showDedupedToast = (type: "error" | "success", key: string, message: string) => {
    const now = Date.now();
    const previousAt = toastDedupRef.current.get(key) ?? 0;
    if (now - previousAt < TOAST_DEDUPE_WINDOW_MS) return;
    toastDedupRef.current.set(key, now);
    if (type === "error") toast?.error?.(message);
    else toast?.success?.(message);
  };

  const isAuthError = (error: unknown) => {
    const status = (error as { status?: number } | null)?.status;
    return status === 401 || status === 403;
  };

  const getApiErrorPayload = (error: unknown): ApiErrorPayload | null => {
    const apiError = error as ApiErrorLike;
    const data = apiError?.data;
    if (!data || Array.isArray(data)) return null;
    return data;
  };

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
    const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);

    let parsedUser: User | null = null;
    if (storedUser) {
      parsedUser = JSON.parse(storedUser) as User;
      setUser(parsedUser);
    }

    if (storedTokens) {
      const parsedTokens = JSON.parse(storedTokens) as AuthTokens;
      setTokens(parsedTokens);
      if (!storedUser) {
        void (async () => {
          const fetched = await fetchMeUserRef.current?.();
          if (fetched) {
            persistUser(fetched);
          } else {
            const derived = deriveUserFromTokenRef.current?.(
              parsedTokens.accessToken
            );
            if (derived) {
              persistUser(derived);
            }
          }
        })();
      } else if (parsedUser?.role === "chofer" && !parsedUser.driverId) {
        void (async () => {
          const fetched = await fetchMeUserRef.current?.();
          if (fetched) {
            persistUser(fetched);
          }
        })();
      }
    }

    setIsLoadingUser(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role !== "chofer") {
      void refreshTeamUsersRef.current?.();
    } else {
      setTeamUsers([]);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) return;

    let mounted = true;
    const verifySession = async () => {
      if (!mounted) return;
      await refreshAccessTokenRef.current?.();
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

  const buildNetworkError = (error: unknown) => {
    void error;
    const networkError = new Error(
      "No se pudo conectar con el servidor. Revisa tu conexión."
    ) as ApiErrorLike;
    networkError.status = 0;
    networkError.data = null;
    return networkError;
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  const refreshAccessToken = async () => {
    const refreshToken = tokensRef.current?.refreshToken;
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (user) {
            showDedupedToast("error", "session_closed_remote", "Sesión cerrada en otro dispositivo.");
          }
          clearAuthState();
          return false;
        }
        if (isRetryableStatus(response.status)) {
          showDedupedToast(
            "error",
            "session_refresh_transient",
            "No se pudo validar la sesión temporalmente. Reintentando..."
          );
          return false;
        }
        if (user) {
          showDedupedToast("error", "session_refresh_invalid", "Sesión expirada. Inicia sesión nuevamente.");
        }
        clearAuthState();
        return false;
      }
      const data = (await response.json()) as AuthResponseDto;
      await applyAuthResponse(data);
      return true;
    } catch (error) {
      if (!isAbortError(error)) {
        console.warn("Error temporal al refrescar token:", error);
      }
      showDedupedToast(
        "error",
        "session_refresh_network",
        "No se pudo validar la sesión por conexión. Reintentando..."
      );
      return false;
    }
  };

  const apiFetch = async <T,>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> => {
    const { skipAuth = false, retry = true, tokensOverride, ...fetchOptions } =
      options;
    const method = (fetchOptions.method ?? "GET").toUpperCase();
    const canRetryRead = retry && isSafeReadMethod(method);
    let authRefreshAttempted = false;
    let readRetryAttempt = 0;

    while (true) {
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

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...fetchOptions,
          headers,
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        if (canRetryRead && readRetryAttempt < API_READ_RETRY_MAX_ATTEMPTS) {
          readRetryAttempt += 1;
          await sleep(API_READ_RETRY_BASE_DELAY_MS * readRetryAttempt);
          continue;
        }
        throw buildNetworkError(error);
      }

      if (
        response.status === 401 &&
        !skipAuth &&
        !authRefreshAttempted &&
        tokensRef.current?.refreshToken
      ) {
        authRefreshAttempted = true;
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          continue;
        }
      }

      if (!response.ok) {
        const apiError = await buildApiError(response);
        if (
          canRetryRead &&
          readRetryAttempt < API_READ_RETRY_MAX_ATTEMPTS &&
          isRetryableStatus(apiError.status)
        ) {
          readRetryAttempt += 1;
          await sleep(API_READ_RETRY_BASE_DELAY_MS * (readRetryAttempt + 1));
          continue;
        }
        throw apiError;
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      return text ? (JSON.parse(text) as T) : (undefined as T);
    }
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
    try {
      const me = await apiFetch<ApiUser>("/Auth/me");
      return mapApiUser(me);
    } catch (error) {
      console.error("Error obteniendo usuario actual:", error);
      return null;
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
        roleName: DEFAULT_REGISTER_ROLE,
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
      if ((error as ApiErrorLike)?.status !== 401) {
        console.error("Error al cerrar sesión:", error);
      }
    } finally {
      clearAuthState();
    }
  };

  // ---------------------------------------------------------------------------
  // Funciones auxiliares locales (simulación de equipo)
  // ---------------------------------------------------------------------------

  const createUser = async (
    data: RegisterData & { role: UserRole; teamId?: string; email?: string }
  ): Promise<boolean> => {
    try {
      const safePassword =
        data.password && data.password.trim().length >= 6
          ? data.password
          : "123456";
      const payload = {
        username: data.usuario,
        email: data.email ?? data.usuario,
        password: safePassword,
        roleName: uiRoleToBackendRole[data.role],
        teamId: data.teamId,
      };

      await apiFetch<ApiUser>("/Users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await refreshTeamUsers();
      return true;
    } catch (error) {
      const errData = getApiErrorPayload(error);
      const message =
        errData?.message ||
        (Array.isArray(errData?.errors) ? errData.errors.join(", ") : "") ||
        (error as Error)?.message ||
        "Error al crear usuario";
      console.error("Error al crear usuario:", error);
      showDedupedToast("error", `create_user_${message}`, message);
      return false;
    }
  };

  const getAllUsers = (): User[] => {
    return teamUsers;
  };

  const refreshTeamUsers = async () => {
    try {
      const data = await apiFetch<ApiUser[]>("/Users/my-team");
      const active = data.filter((u) => u.isActive !== false);
      setTeamUsers(active.map(mapApiUser));
    } catch (error) {
      if (isAuthError(error)) return;
      console.error("Error obteniendo equipo:", error);
    }
  };

  const getTeamUsers = (): User[] => {
    return teamUsers;
  };

  const getManagers = (): User[] => {
    return teamUsers.filter((u) => u.role === "gerente");
  };

  const updateUserPermissions = (
    userId: string,
    permissions: Partial<UserPermissions>
  ) => {
    setTeamUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, permissions: { ...u.permissions, ...permissions } } : u
      )
    );
    if (user?.id === userId) {
      persistUser({ ...(user as User), permissions: { ...user.permissions, ...permissions } });
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const targetRole = uiRoleToBackendRole[newRole];
    const backendRoles: ApiRole[] = ["Admin", "Driver", "Logistics"];

    try {
      for (const role of backendRoles) {
        if (role !== targetRole) {
          try {
            await apiFetch(`/Users/${userId}/roles/${role}`, { method: "DELETE" });
          } catch {
            // ignore missing role
          }
        }
      }
      await apiFetch(`/Users/${userId}/roles/${targetRole}`, { method: "POST" });

      setTeamUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole, permissions: defaultPermissions[newRole] } : u
        )
      );
      if (user?.id === userId) {
        persistUser({ ...(user as User), role: newRole, permissions: defaultPermissions[newRole] });
      }
    } catch (error) {
      console.error("Error actualizando rol:", error);
    }
  };

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await apiFetch(`/Users/${userId}/status?isActive=${isActive}`, { method: "PUT" });
      setTeamUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)));
    } catch (error) {
      console.error("Error actualizando estado de usuario:", error);
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
      const errData = getApiErrorPayload(error);
      const message =
        errData?.message ||
        (Array.isArray(errData?.errors) ? errData.errors.join(", ") : "") ||
        (error as Error)?.message ||
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
    } catch (error) {
      console.error("Error al cerrar sesión en todos los dispositivos:", error);
    } finally {
      await logout();
    }
  };

  const isSuperAdmin = () => user?.role === "superadmin";

  const updateTeamName = (teamName: string) => {
    if (!user || user.role !== "gerente") return;
    const users = getStoredUsers();
    const userIndex = users.findIndex((stored) => stored.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].teamName = teamName;
      saveStoredUsers(users);
      const updatedUser = { ...user, teamName };
      persistUser(updatedUser);
    }
  };

  deriveUserFromTokenRef.current = deriveUserFromToken;
  fetchMeUserRef.current = fetchMeUser;
  refreshTeamUsersRef.current = refreshTeamUsers;
  refreshAccessTokenRef.current = refreshAccessToken;

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
        updateUserPermissions,
        updateUserRole,
        updateUserStatus,
        updateTeamName,
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
