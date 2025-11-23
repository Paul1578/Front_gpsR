"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/backend";
const TOKEN_STORAGE_KEY = "auth_tokens";
const CURRENT_USER_STORAGE_KEY = "currentUser";

type ApiRole = "Admin" | "Driver" | "Manager" | "User";

interface ApiUser {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: ApiRole[];
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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  createUser: (
    data: RegisterData & { role: UserRole; teamId?: string }
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  updateUserPermissions: (
    userId: string,
    permissions: Partial<UserPermissions>
  ) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
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

    if (storedUser) {
      setUser(JSON.parse(storedUser) as User);
    }

    if (storedTokens) {
      const parsedTokens = JSON.parse(storedTokens) as AuthTokens;
      setTokens(parsedTokens);
      if (!storedUser) {
        const derived = deriveUserFromToken(parsedTokens.accessToken);
        if (derived) {
          persistUser(derived);
        }
      }
    }

    setIsLoadingUser(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        clearAuthState();
        return false;
      }
      const data = (await response.json()) as AuthResponseDto;
      await applyAuthResponse(data);
      return true;
    } catch (error) {
      console.error("Error al refrescar token:", error);
      clearAuthState();
      return false;
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
      const tokenSource = tokensOverride ?? tokensRef.current;
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
    const mappedRole = determineRole(apiUser.roles);
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiFetch<AuthResponseDto>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      await applyAuthResponse(data);
      return true;
    } catch (error) {
      console.error("Error en login:", error);
      return false;
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
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: tokensRef.current.refreshToken }),
          skipAuth: true,
        });
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      clearAuthState();
    }
  };

  // ---------------------------------------------------------------------------
  // Funciones auxiliares locales (simulación de equipo)
  // ---------------------------------------------------------------------------

  const generateIdentificacion = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `ID-${timestamp}${random}`;
  };

  const createUser = async (
    data: RegisterData & { role: UserRole; teamId?: string }
  ): Promise<boolean> => {
    try {
      const users = getStoredUsers();
      if (users.some((u) => u.usuario === data.usuario)) return false;

      const identificacion = data.identificacion || generateIdentificacion();
      let teamId = data.teamId;

      if (user?.role === "gerente" && !teamId) teamId = user.id;
      if (["gerente", "superadmin"].includes(data.role)) teamId = undefined;

      const newUser: StoredUser = {
        id: Date.now().toString(),
        nombres: data.nombres,
        apellidos: data.apellidos,
        usuario: data.usuario,
        identificacion,
        password: data.password,
        role: data.role,
        permissions: defaultPermissions[data.role],
        teamId,
      };

      users.push(newUser);
      saveStoredUsers(users);
      return true;
    } catch (error) {
      console.error("Error al crear usuario:", error);
      return false;
    }
  };

  const getAllUsers = (): User[] => {
    const users = getStoredUsers();
    return users.map(({ password: _password, ...rest }) => {
      void _password;
      return rest;
    });
  };

  const getTeamUsers = (): User[] => {
    const users = getStoredUsers();
    if (user?.role === "superadmin") return [];
    if (user?.role === "gerente") {
      return users.filter((u) => u.teamId === user.id && u.id !== user.id);
    }
    if (user?.teamId) {
      return users.filter(
        (u) =>
          (u.teamId === user.teamId || u.id === user.teamId) &&
          u.id !== user.id
      );
    }
    return [];
  };

  const getManagers = (): User[] => {
    const users = getStoredUsers();
    return users.filter((u) => u.role === "gerente");
  };

  const updateUserPermissions = (
    userId: string,
    permissions: Partial<UserPermissions>
  ) => {
    const users = getStoredUsers();
    const userIndex = users.findIndex((stored) => stored.id === userId);
    if (userIndex !== -1) {
      users[userIndex].permissions = {
        ...users[userIndex].permissions,
        ...permissions,
      };
      saveStoredUsers(users);
      if (user?.id === userId) {
        const updatedUser = {
          ...user,
          permissions: users[userIndex].permissions,
        };
        persistUser(updatedUser);
      }
    }
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    const users = getStoredUsers();
    const userIndex = users.findIndex((stored) => stored.id === userId);
    if (userIndex !== -1) {
      users[userIndex].role = newRole;
      users[userIndex].permissions = defaultPermissions[newRole];
      saveStoredUsers(users);
      if (user?.id === userId) {
        const { password: _password, ...updatedUser } = users[userIndex];
        void _password;
        persistUser(updatedUser as User);
      }
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

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        createUser,
        logout,
        isAuthenticated: !!user,
        isLoadingUser,
        updateUserPermissions,
        updateUserRole,
        updateTeamName,
        getAllUsers,
        getTeamUsers,
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
