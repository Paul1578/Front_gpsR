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
const AUTH_COOKIE_MUTATION_LOCK = "fletflow-auth-cookie-mutation";
const AUTH_COOKIE_LOCK_ERROR = "Este navegador no admite la coordinación segura de sesiones. Actualiza el navegador.";

class SessionRestoreUnavailableError extends Error {}
class AuthCookieCoordinationUnavailableError extends Error {}

async function withAuthCookieMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    throw new AuthCookieCoordinationUnavailableError(AUTH_COOKIE_LOCK_ERROR);
  }
  return navigator.locks.request(AUTH_COOKIE_MUTATION_LOCK, { mode: "exclusive" }, operation);
}

type ApiRole = "Admin" | "Driver" | "Manager" | "User" | "Logistics";

interface ApiUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isRootAccount?: boolean;
  roles: ApiRole[] | string[];
  driverId?: string;
}

export interface UserPageParams {
  page: number;
  pageSize: number;
  search: string;
  role: string;
  isActive: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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

  refreshToken?: string;
  refreshTokenExpiration?: string;
}

interface AuthTokens {
  accessToken: string;
}

const staleAuthRequestError = () => {
  const error = new Error("La respuesta pertenece a una sesión de autenticación anterior.");
  error.name = "AbortError";
  return error;
};
const isAbortedRequest = (error: unknown) =>
  (error as { name?: string } | null)?.name === "AbortError";

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

export type UserRole = "superadmin" | "gerente" | "manager" | "logistica" | "chofer" | "usuario";

export interface UserPermissions {
  canViewMap: boolean;
  canCreateRoutes: boolean;
  canManageVehicles: boolean;
  canManageDrivers: boolean;
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
  /** Derivado de claims firmados para ajustar UX; el servidor autoriza cada acción. */
  isRootAccount?: boolean;
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
  getTeamUsersPage: (params: UserPageParams) => Promise<PagedResult<User>>;
  teamUsersLoading: boolean;
  teamUsersError: string | null;
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
  Manager: "manager",
  User: "usuario",
  Logistics: "logistica",
};

const uiRoleToBackendRole: Record<UserRole, ApiRole> = {
  superadmin: "Admin",
  gerente: "Admin",
  manager: "Manager",
  logistica: "Logistics",
  chofer: "Driver",
  usuario: "User",
};

const defaultPermissions: Record<UserRole, UserPermissions> = {
  superadmin: {
    canViewMap: true,
    canCreateRoutes: true,
    canManageVehicles: true,
    canManageDrivers: true,
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
    canManageDrivers: true,
    canManageTeam: true,
    canViewOwnRoute: true,
    canAccessSuperAdmin: true,
    canManageAllOrganizations: false,
    canViewSystemLogs: false,
    canExportData: false,
  },
  manager: {
    canViewMap: true,
    canCreateRoutes: true,
    canManageVehicles: true,
    canManageDrivers: true,
    canManageTeam: false,
    canViewOwnRoute: false,
    canAccessSuperAdmin: false,
    canManageAllOrganizations: false,
    canViewSystemLogs: false,
    canExportData: false,
  },
  logistica: {
    canViewMap: true,
    canCreateRoutes: true,
    canManageVehicles: false,
    canManageDrivers: false,
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
    canManageDrivers: false,
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
    canManageDrivers: false,
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
  const userRef = useRef<User | null>(null);
  const tokensRef = useRef<AuthTokens | null>(null);
  const refreshInFlightRef = useRef<{
    sessionVersion: number;
    accessToken: string;
    promise: Promise<boolean>;
  } | null>(null);
  const restoreTokenInFlightRef = useRef<Promise<string | null> | null>(null);
  const authTerminationInFlightRef = useRef<Promise<unknown> | null>(null);
  const authSessionVersionRef = useRef(0);
  const loginInFlightRef = useRef(false);
  const teamUsersRequestVersionRef = useRef(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [teamUsersLoading, setTeamUsersLoading] = useState(false);
  const [teamUsersError, setTeamUsersError] = useState<string | null>(null);
  const isAuthenticated = !!user;

  const setTokens = (tokens: AuthTokens | null) => {
    tokensRef.current = tokens;
    if (typeof window === "undefined") return;
    // El access token sólo vive en memoria. El refresh token persistente lo guarda
    // la ruta BFF en una cookie HttpOnly que JavaScript no puede leer.
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const persistUser = (value: User | null) => {
    userRef.current = value;
    setUser(value);
    if (typeof window === "undefined") return;
    if (value) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const handleSessionStorageChange = (event: StorageEvent) => {
      if (event.key !== CURRENT_USER_STORAGE_KEY) return;
      const currentUser = userRef.current;
      if (!event.newValue) {
        if (!currentUser) return;
        authSessionVersionRef.current += 1;
        setTokens(null);
        persistUser(null);
        setIsLoadingUser(false);
        return;
      }
      try {
        const nextUser = JSON.parse(event.newValue) as User;
        if (
          nextUser.id &&
          (!currentUser || nextUser.id !== currentUser.id) &&
          !loginInFlightRef.current
        )
          window.location.reload();
      } catch {
        // Ignore malformed presentation cache; backend session remains authoritative.
      }
    };
    window.addEventListener("storage", handleSessionStorageChange);
    return () => window.removeEventListener("storage", handleSessionStorageChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const restoreSession = async () => {
      const sessionVersion = ++authSessionVersionRef.current;
      try {
        const legacyStoredTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
        let legacyRefreshToken: string | undefined;
        if (legacyStoredTokens) {
          try {
            const parsed: unknown = JSON.parse(legacyStoredTokens);
            if (isRecord(parsed) && typeof parsed.refreshToken === "string") {
              legacyRefreshToken = parsed.refreshToken;
            }
          } catch {
            // El almacenamiento legado dañado se descarta; la sesión puede restaurarse desde cookie.
          }
        }
        let restoreRequest = restoreTokenInFlightRef.current;
        if (!restoreRequest) {
          restoreRequest = requestAccessToken(
            legacyRefreshToken ? "/api/auth/migrate" : "/api/auth/refresh",
            legacyRefreshToken ? { refreshToken: legacyRefreshToken } : undefined,
          );
          restoreTokenInFlightRef.current = restoreRequest;
        }
        let restored: string | null;
        try {
          restored = await restoreRequest;
        } finally {
          if (restoreTokenInFlightRef.current === restoreRequest) {
            restoreTokenInFlightRef.current = null;
          }
        }
        if (sessionVersion !== authSessionVersionRef.current) return;
        if (!restored) {
          clearAuthState(sessionVersion);
          return;
        }
        setTokens({ accessToken: restored });
        // El perfil cacheado es sólo presentación: rol y permisos siempre vienen del backend.
        const verifiedUser = await fetchMeUser();
        if (sessionVersion !== authSessionVersionRef.current) return;
        if (verifiedUser) persistUser(verifiedUser);
        else clearAuthState(sessionVersion);
      } catch (error) {
        if (sessionVersion !== authSessionVersionRef.current) return;
        if (error instanceof AuthCookieCoordinationUnavailableError) {
          toast.error(error.message);
          return;
        }
        if (error instanceof SessionRestoreUnavailableError) {
          toast.error("No se pudo verificar la sesión por un problema temporal. Intenta recargar.");
          return;
        }
        console.error("No se pudo restaurar la sesión guardada.", error);
        clearAuthState(sessionVersion);
      } finally {
        if (sessionVersion === authSessionVersionRef.current) setIsLoadingUser(false);
      }
    };

    void restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && (user?.role === "gerente" || user?.role === "superadmin")) {
      void refreshTeamUsers().catch((error) => {
        if (!isAbortedRequest(error)) console.error("Error obteniendo equipo:", error);
      });
    } else {
      teamUsersRequestVersionRef.current += 1;
      setTeamUsers([]);
      setTeamUsersError(null);
      setTeamUsersLoading(false);
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
  }, [isAuthenticated, user?.id]);

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

  const requestAccessToken = async (path: string, body?: Record<string, string>) => {
    let response: Response;
    try {
      response = await withAuthCookieMutationLock(() => fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : JSON.stringify({}),
        cache: "no-store",
      }));
    } catch (error) {
      if (error instanceof AuthCookieCoordinationUnavailableError) throw error;
      throw new SessionRestoreUnavailableError("No fue posible contactar el servicio de autenticación.");
    }
    if (response.status >= 500 || response.status === 429) {
      throw new SessionRestoreUnavailableError("El servicio de autenticación no está disponible temporalmente.");
    }
    if (!response.ok) return null;
    const data = (await response.json()) as AuthResponseDto;
    return data.accessToken ?? data.token ?? null;
  };

  const refreshAccessToken = async (
    expectedSessionVersion = authSessionVersionRef.current,
    expectedAccessToken = tokensRef.current?.accessToken,
  ) => {
    if (
      !expectedAccessToken ||
      tokensRef.current?.accessToken !== expectedAccessToken ||
      expectedSessionVersion !== authSessionVersionRef.current
    ) return false;
    const inFlight = refreshInFlightRef.current;
    if (
      inFlight?.sessionVersion === expectedSessionVersion &&
      inFlight.accessToken === expectedAccessToken
    ) return inFlight.promise;

    const refreshPromise = (async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      try {
        const { response, applied } = await withAuthCookieMutationLock(async () => {
          const response = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
            signal: controller.signal,
            cache: "no-store",
          });
          if (
            expectedSessionVersion !== authSessionVersionRef.current ||
            tokensRef.current?.accessToken !== expectedAccessToken
          ) return { response, applied: false };
          if (!response.ok) {
            if (response.status === 401) {
              if (user) toast.error("La sesión expiró o fue revocada. Inicia sesión nuevamente.");
              clearAuthState(expectedSessionVersion);
            }
            return { response, applied: false };
          }
          const data = (await response.json()) as AuthResponseDto;
          if (
            expectedSessionVersion !== authSessionVersionRef.current ||
            tokensRef.current?.accessToken !== expectedAccessToken
          ) return { response, applied: false };
          return {
            response,
            applied: await applyAuthResponse(data, expectedSessionVersion),
          };
        });
        if (
          expectedSessionVersion !== authSessionVersionRef.current ||
          tokensRef.current?.accessToken !== expectedAccessToken
        ) return false;
        if (!response.ok) {
          if (response.status !== 401 && user) {
            toast.error("No se pudo renovar la sesión por un problema temporal. Intenta de nuevo.");
          }
          return false;
        }
        return applied;
      } catch (error) {
        if (
          expectedSessionVersion !== authSessionVersionRef.current ||
          tokensRef.current?.accessToken !== expectedAccessToken
        ) return false;
        console.error("Error al refrescar token:", error);
        if (user) toast.error("No se pudo verificar la sesión por un problema de conexión. Intenta de nuevo.");
        return false;
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();
    refreshInFlightRef.current = {
      sessionVersion: expectedSessionVersion,
      accessToken: expectedAccessToken,
      promise: refreshPromise,
    };
    try {
      return await refreshPromise;
    } finally {
      if (refreshInFlightRef.current?.promise === refreshPromise) {
        refreshInFlightRef.current = null;
      }
    }
  };

  const apiFetch = async <T,>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> => {
    const { skipAuth = false, retry = true, tokensOverride, ...fetchOptions } =
      options;
    const requestSessionVersion = authSessionVersionRef.current;
    const requestTokenSource = tokensOverride ?? tokensRef.current;
    const headers = new Headers(fetchOptions.headers || {});
    if (!headers.has("Content-Type") && fetchOptions.body) {
      headers.set("Content-Type", "application/json");
    }
    if (!skipAuth) {
      const tokenSource = requestTokenSource;
      if (tokenSource?.accessToken) {
        headers.set("Authorization", `Bearer ${tokenSource.accessToken}`);
      }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });

    if (!skipAuth && requestSessionVersion !== authSessionVersionRef.current) {
      throw staleAuthRequestError();
    }

    if (
      response.status === 401 &&
      !skipAuth &&
      retry &&
      requestTokenSource?.accessToken
    ) {
      const refreshed = await refreshAccessToken(requestSessionVersion, requestTokenSource.accessToken);
      if (refreshed) {
        if (requestSessionVersion !== authSessionVersionRef.current) throw staleAuthRequestError();
        return apiFetch<T>(path, { ...options, retry: false });
      }
    }

    if (!response.ok) {
      const error = await buildApiError(response);
      if (!skipAuth && requestSessionVersion !== authSessionVersionRef.current) {
        throw staleAuthRequestError();
      }
      throw error;
    }

    if (response.status === 204) {
      if (!skipAuth && requestSessionVersion !== authSessionVersionRef.current) {
        throw staleAuthRequestError();
      }
      return undefined as T;
    }

    const text = await response.text();
    if (!skipAuth && requestSessionVersion !== authSessionVersionRef.current) {
      throw staleAuthRequestError();
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  };

  const mapApiUser = (apiUser: ApiUser, accessToken?: string): User => {
    const mappedRole = determineRole(apiUser.roles as ApiRole[]);
    const username = apiUser.username || apiUser.email;
    const displayName = apiUser.firstName || username || apiUser.id;
    const tokenPayload = accessToken ? decodeJwtPayload(accessToken) : null;
    const ownerId = tokenPayload ? getClaimValue(tokenPayload, ["owner_id"]) : undefined;
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
      isRootAccount: apiUser.isRootAccount ?? Boolean(ownerId && ownerId.toLowerCase() === apiUser.id.toLowerCase()),
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
      isRootAccount: getClaimValue(payload, ["owner_id"])?.toLowerCase() === id.toLowerCase(),
    };
  };

  const fetchMeUser = async (accessToken = tokensRef.current?.accessToken): Promise<User | null> => {
    if (!accessToken) return null;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const me = await apiFetch<ApiUser>("/Auth/me", {
        signal: controller.signal,
        tokensOverride: { accessToken },
        retry: false,
      });
      return mapApiUser(me, accessToken);
    } catch (error) {
      if (!isAbortedRequest(error)) console.error("Error obteniendo usuario actual:", error);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  // 👇 AQUÍ ESTÁ EL CAMBIO IMPORTANTE
  const applyAuthResponse = async (
    data: AuthResponseDto,
    expectedSessionVersion = authSessionVersionRef.current,
  ): Promise<boolean> => {
    if (expectedSessionVersion !== authSessionVersionRef.current) return false;
    // Usar accessToken si viene, si no usar token (del backend C#)
    const accessToken = data.accessToken ?? data.token;

    if (!accessToken) {
      console.error(
        "No se recibió accessToken/token en la respuesta de autenticación"
      );
      clearAuthState(expectedSessionVersion);
      return false;
    }

    setTokens({ accessToken });

    if (data.user) {
      if (expectedSessionVersion !== authSessionVersionRef.current) return false;
      persistUser(mapApiUser(data.user, accessToken));
      setIsLoadingUser(false);
      return true;
    }

    const fetched = await fetchMeUser(accessToken);
    if (expectedSessionVersion !== authSessionVersionRef.current) return false;
    if (fetched) {
      persistUser(fetched);
      setIsLoadingUser(false);
      return true;
    }

    const derived = deriveUserFromToken(accessToken);
    if (derived) {
      persistUser(derived);
    } else {
      persistUser(null);
    }
    setIsLoadingUser(false);
    return !!derived;
  };

  const clearAuthState = (expectedSessionVersion?: number) => {
    if (
      expectedSessionVersion !== undefined &&
      expectedSessionVersion !== authSessionVersionRef.current
    ) return;
    authSessionVersionRef.current += 1;
    persistUser(null);
    setTokens(null);
    setIsLoadingUser(false);
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; message?: string }> => {
    const pendingTermination = authTerminationInFlightRef.current;
    if (pendingTermination) await pendingTermination;
    const pendingRestore = restoreTokenInFlightRef.current;
    if (pendingRestore) {
      try {
        await pendingRestore;
      } catch {
        // A failed prior restore must not prevent a fresh sign-in.
      }
    }
    const pendingRefresh = refreshInFlightRef.current?.promise;
    if (pendingRefresh) await pendingRefresh;
    const sessionVersion = ++authSessionVersionRef.current;
    loginInFlightRef.current = true;
    try {
      const { response, applied } = await withAuthCookieMutationLock(async () => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          cache: "no-store",
        });
        if (!response.ok || sessionVersion !== authSessionVersionRef.current)
          return { response, applied: false };
        const data = (await response.json()) as AuthResponseDto;
        return {
          response,
          applied: await applyAuthResponse(data, sessionVersion),
        };
      });
      if (!response.ok) throw await buildApiError(response);
      if (sessionVersion !== authSessionVersionRef.current || !applied) {
        return { ok: false, message: "La solicitud de inicio de sesión quedó obsoleta." };
      }
      return { ok: true };
    } catch (error) {
      console.error("Error en login:", error);
      const message =
        (error as Error)?.message ??
        "No pudimos iniciar sesión. Verifica tus credenciales.";
      return { ok: false, message };
    } finally {
      loginInFlightRef.current = false;
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
    const sessionVersion = ++authSessionVersionRef.current;
    try {
      const payload = {
        username: buildRegisterUsername(data),
        email: data.usuario,
        password: data.password,
      };
      await apiFetch<{ message: string }>("/Auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      if (sessionVersion !== authSessionVersionRef.current) return false;
      return true;
    } catch (error) {
      console.error("Error en registro:", error);
      return false;
    }
  };

  const logout = async () => {
    const ongoing = authTerminationInFlightRef.current;
    if (ongoing) {
      await ongoing;
      return;
    }
    const operation = (async () => {
      const pendingRestore = restoreTokenInFlightRef.current;
      if (pendingRestore) {
        try {
          await pendingRestore;
        } catch {
          // Logout still clears the cookie when session restoration fails.
        }
      }
      const accessToken = tokensRef.current?.accessToken;
      const pendingRefresh = refreshInFlightRef.current;
      if (accessToken && pendingRefresh?.accessToken === accessToken) {
        await pendingRefresh.promise;
      }
      authSessionVersionRef.current += 1;
      clearAuthState(authSessionVersionRef.current);
      try {
        const response = await withAuthCookieMutationLock(() => fetch("/api/auth/logout", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: JSON.stringify({}),
          cache: "no-store",
        }));
        if (!response.ok) {
          toast.error("La sesión local se cerró, pero el servidor no confirmó la revocación.");
        }
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        toast.error("La sesión local se cerró, pero no se pudo contactar al servidor para revocarla.");
      }
    })();
    authTerminationInFlightRef.current = operation;
    try {
      await operation;
    } finally {
      if (authTerminationInFlightRef.current === operation) authTerminationInFlightRef.current = null;
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
    const requestVersion = ++teamUsersRequestVersionRef.current;
    setTeamUsersLoading(true);
    setTeamUsersError(null);
    try {
      const data = await apiFetch<ApiUser[]>("/Users/my-team");
      if (requestVersion === teamUsersRequestVersionRef.current) {
        setTeamUsers(data.map((apiUser) => mapApiUser(apiUser)));
      }
    } catch (error) {
      if (requestVersion === teamUsersRequestVersionRef.current) {
        setTeamUsersError("No se pudo cargar el equipo. Revisa la conexión e inténtalo de nuevo.");
      }
      throw error;
    } finally {
      if (requestVersion === teamUsersRequestVersionRef.current) {
        setTeamUsersLoading(false);
      }
    }
  };

  const getTeamUsersPage = async (params: UserPageParams): Promise<PagedResult<User>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      search: params.search,
      role: params.role,
      isActive: params.isActive,
    });
    const result = await apiFetch<PagedResult<ApiUser>>(`/Users/my-team/page?${query.toString()}`);
    return { ...result, items: result.items.map((apiUser) => mapApiUser(apiUser)) };
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
    const ongoing = authTerminationInFlightRef.current;
    if (ongoing) {
      await ongoing;
      return { ok: false, message: "El cierre de sesión ya está en curso." };
    }
    const operation = (async (): Promise<{ ok: boolean; message?: string }> => {
      const sessionVersion = authSessionVersionRef.current;
      const accessToken = tokensRef.current?.accessToken;
      try {
        const pendingRefresh = refreshInFlightRef.current;
        if (accessToken && pendingRefresh?.accessToken === accessToken) {
          await pendingRefresh.promise;
        }
        const response = await withAuthCookieMutationLock(() => fetch("/api/auth/logout-all", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: JSON.stringify({}),
          cache: "no-store",
        }));
        if (!response.ok) throw await buildApiError(response);
        if (sessionVersion !== authSessionVersionRef.current) {
          return { ok: false, message: "La sesión cambió antes de completar el cierre." };
        }
        authSessionVersionRef.current += 1;
        clearAuthState(authSessionVersionRef.current);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message: getApiRequestError(error)?.message ?? "No se pudo cerrar sesión en los demás dispositivos",
        };
      }
    })();
    authTerminationInFlightRef.current = operation;
    try {
      return await operation;
    } finally {
      if (authTerminationInFlightRef.current === operation) authTerminationInFlightRef.current = null;
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
        getTeamUsersPage,
        teamUsersLoading,
        teamUsersError,
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
