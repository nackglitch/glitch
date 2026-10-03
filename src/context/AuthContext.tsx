import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface StoredAccount {
  user: User;
  passwordHash: string;
}

interface AuthContextType {
  currentUser: User | null;
  registeredUsers: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS_STORAGE_KEY = 'glitch_registered_accounts';
const CURRENT_USER_KEY = 'glitch_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (raw) {
        const parsed: StoredAccount[] = JSON.parse(raw);
        return parsed.map((a) => a.user);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  const getStoredAccounts = (): StoredAccount[] => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const login = async (usernameInput: string, pass: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 200));
    setIsLoading(false);

    const cleanUsername = usernameInput.replace(/^@/, '').toLowerCase().trim();
    if (!cleanUsername) {
      return { success: false, error: 'Please enter your username.' };
    }
    if (!pass) {
      return { success: false, error: 'Please enter your password.' };
    }

    const accounts = getStoredAccounts();
    const match = accounts.find((a) => a.user.username.toLowerCase() === cleanUsername);

    if (!match) {
      return { success: false, error: `No account found with username @${cleanUsername}. Please sign up first.` };
    }

    if (match.passwordHash !== pass) {
      return { success: false, error: 'Incorrect password.' };
    }

    setCurrentUser(match.user);
    return { success: true };
  };

  const signup = async (usernameInput: string, pass: string, nameInput?: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 200));
    setIsLoading(false);

    const cleanUsername = usernameInput.replace(/^@/, '').toLowerCase().trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    if (!pass || pass.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const accounts = getStoredAccounts();
    if (accounts.some((a) => a.user.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: `Username @${cleanUsername} is already registered.` };
    }

    const displayName = nameInput?.trim() || cleanUsername;
    const avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${cleanUsername}`;

    const newUser: User = {
      id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: displayName,
      username: cleanUsername,
      avatar: avatarUrl,
      bio: 'Hey there! I am using Glitch.',
      status: 'online',
      lastSeen: 'Active right now',
      createdAt: new Date().toISOString(),
      blockedUserIds: [],
    };

    const newAccount: StoredAccount = {
      user: newUser,
      passwordHash: pass,
    };

    const updatedAccounts = [...accounts, newAccount];
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
    setRegisteredUsers(updatedAccounts.map((a) => a.user));
    setCurrentUser(newUser);

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);

    const accounts = getStoredAccounts();
    const updatedAccounts = accounts.map((a) =>
      a.user.id === currentUser.id ? { ...a, user: updated } : a
    );
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
    setRegisteredUsers(updatedAccounts.map((a) => a.user));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        registeredUsers,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
