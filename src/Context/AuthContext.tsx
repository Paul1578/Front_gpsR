'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  identificacion?: string;
  role: UserRole;
  permissions: UserPermissions;
  teamId?: string;
  teamName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (usuario: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  createUser: (data: RegisterData & { role: UserRole; teamId?: string }) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserPermissions: (userId: string, permissions: Partial<UserPermissions>) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateTeamName: (teamName: string) => void;
  getAllUsers: () => User[];
  getTeamUsers: () => User[];
  getManagers: () => User[];
  isSuperAdmin: () => boolean;
}

interface RegisterData {
  nombres: string;
  apellidos: string;
  usuario: string;
  password: string;
  identificacion?: string;
}

// Crear contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultPermissions: Record<UserRole, UserPermissions> = {
  superadmin: {
    canViewMap: false,
    canCreateRoutes: false,
    canManageVehicles: false,
    canManageTeam: false,
    canViewOwnRoute: false,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // ✅ useEffect protegido por typeof window (evita errores en SSR)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const usersData = localStorage.getItem("users");
    const users = usersData ? JSON.parse(usersData) : [];

    const superAdminExists = users.some((u: any) => u.role === "superadmin");

    if (!superAdminExists) {
      const superAdmin = {
        id: "superadmin-001",
        nombres: "Super",
        apellidos: "Admin",
        usuario: "Sadmin",
        identificacion: "ID-SADMIN001",
        password: "sadmin123",
        role: "superadmin",
        permissions: defaultPermissions.superadmin,
      };
      users.unshift(superAdmin);
      localStorage.setItem("users", JSON.stringify(users));
    }

    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      if (!userData.role) userData.role = "gerente";
      if (!userData.permissions)
        userData.permissions = defaultPermissions[userData.role];
      if (!userData.identificacion)
        userData.identificacion = generateIdentificacion();

      setUser(userData);
      localStorage.setItem("currentUser", JSON.stringify(userData));
    }

    if (usersData) {
      let needsUpdate = false;
      const migratedUsers = users.map((u: any) => {
        let updated = { ...u };
        if (!u.role || !u.permissions) {
          needsUpdate = true;
          updated.role = u.role || "gerente";
          updated.permissions = u.permissions || defaultPermissions[updated.role];
        }
        if (!u.identificacion) {
          needsUpdate = true;
          updated.identificacion = generateIdentificacion();
        }
        return updated;
      });
      if (needsUpdate) {
        localStorage.setItem("users", JSON.stringify(migratedUsers));
      }
    }
  }, []);

  const generateIdentificacion = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    return `ID-${timestamp}${random}`;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const users = JSON.parse(localStorage.getItem("users") || "[]");
      if (users.some((u: any) => u.usuario === data.usuario)) return false;

      const role: UserRole = "gerente";
      const identificacion = data.identificacion || generateIdentificacion();

      const newUser = {
        id: Date.now().toString(),
        nombres: data.nombres,
        apellidos: data.apellidos,
        usuario: data.usuario,
        identificacion,
        password: data.password,
        role,
        permissions: defaultPermissions[role],
      };

      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));

      const { password, ...userWithoutPassword } = newUser;
      setUser(userWithoutPassword);
      localStorage.setItem("currentUser", JSON.stringify(userWithoutPassword));

      return true;
    } catch (error) {
      console.error("Error en registro:", error);
      return false;
    }
  };

  const login = async (usuario: string, password: string): Promise<boolean> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const foundUser = users.find(
        (u: any) => u.usuario === usuario && u.password === password
      );
      if (foundUser) {
        if (!foundUser.role) foundUser.role = "gerente";
        if (!foundUser.permissions)
          foundUser.permissions = defaultPermissions[foundUser.role];

        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem("currentUser", JSON.stringify(userWithoutPassword));

        const userIndex = users.findIndex((u: any) => u.id === foundUser.id);
        if (userIndex !== -1) {
          users[userIndex] = foundUser;
          localStorage.setItem("users", JSON.stringify(users));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error en login:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") localStorage.removeItem("currentUser");
  };

  const updateUserPermissions = (userId: string, permissions: Partial<UserPermissions>) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userIndex = users.findIndex((u: any) => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].permissions = { ...users[userIndex].permissions, ...permissions };
      localStorage.setItem("users", JSON.stringify(users));
      if (user?.id === userId) {
        const updatedUser = { ...user, permissions: users[userIndex].permissions };
        setUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      }
    }
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userIndex = users.findIndex((u: any) => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].role = role;
      users[userIndex].permissions = defaultPermissions[role];
      localStorage.setItem("users", JSON.stringify(users));
      if (user?.id === userId) {
        const { password, ...updatedUser } = users[userIndex];
        setUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      }
    }
  };

  const createUser = async (data: RegisterData & { role: UserRole; teamId?: string }): Promise<boolean> => {
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      if (users.some((u: any) => u.usuario === data.usuario)) return false;

      const identificacion = data.identificacion || generateIdentificacion();
      let teamId = data.teamId;

      if (user?.role === "gerente" && !teamId) teamId = user.id;
      if (["gerente", "superadmin"].includes(data.role)) teamId = undefined;

      const newUser = {
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
      localStorage.setItem("users", JSON.stringify(users));
      return true;
    } catch (error) {
      console.error("Error al crear usuario:", error);
      return false;
    }
  };

  const getAllUsers = (): User[] => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    return users.map(({ password, ...user }: any) => user);
  };

  const getTeamUsers = (): User[] => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (user?.role === "superadmin") return [];
    if (user?.role === "gerente") {
      return users.filter((u: any) => u.teamId === user.id && u.id !== user.id);
    }
    if (user?.teamId) {
      return users.filter(
        (u: any) => (u.teamId === user.teamId || u.id === user.teamId) && u.id !== user.id
      );
    }
    return [];
  };

  const getManagers = (): User[] => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    return users.filter((u: any) => u.role === "gerente");
  };

  const isSuperAdmin = (): boolean => user?.role === "superadmin";

  const updateTeamName = (teamName: string) => {
    if (!user || user.role !== "gerente") return;
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userIndex = users.findIndex((u: any) => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].teamName = teamName;
      localStorage.setItem("users", JSON.stringify(users));
      const updatedUser = { ...user, teamName };
      setUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
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
        updateUserPermissions,
        updateUserRole,
        updateTeamName,
        getAllUsers,
        getTeamUsers,
        getManagers,
        isSuperAdmin,
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
