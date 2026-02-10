/**
 * Auth Context for managing authentication state.
 * Handles Firebase auth, session management, and idle timeout.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, signOut as firebaseSignOut, getIdToken } from '../services/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// Session settings from PRD
const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const IDLE_WARNING = 29 * 60 * 1000; // 29 minutes (1 min warning)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showIdleWarning, setShowIdleWarning] = useState(false);

    // Load user from localStorage on mount and refresh from API
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('user');
            const token = localStorage.getItem('authToken');

            if (storedUser && token) {
                // Set initial user from storage for fast UI
                setUser(JSON.parse(storedUser));
                // Refresh user data from API
                await refreshUser();
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Refresh user data from API
    const refreshUser = useCallback(async () => {
        try {
            const response = await authAPI.getMe();
            if (response.data) {
                // Determine if response structure is nested (response.data.user) or flat (response.data)
                // MeView returns flat structure currently
                const rawUser = response.data.user || response.data;

                // Map to camelCase
                const updatedUser = {
                    id: rawUser.id,
                    phoneNumber: rawUser.phone_number || rawUser.phoneNumber, // Handle both cases just in case
                    fullName: rawUser.full_name || rawUser.fullName,
                    role: rawUser.role,
                    zoneId: rawUser.zone || rawUser.zone_id, // API might return zone ID as 'zone' or 'zone_id'
                    zoneName: rawUser.zone_name || rawUser.zoneName,
                    dailyTarget: rawUser.daily_target || rawUser.dailyTarget,
                    redirectUrl: rawUser.redirect_url || rawUser.redirectUrl,
                    createdAt: rawUser.created_at || rawUser.createdAt,
                };

                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                return updatedUser;
            }
        } catch (err) {
            console.error('Failed to refresh user data:', err);
        }
        return null;
    }, []);

    // Token refresh interval
    useEffect(() => {
        if (!user) return;

        const refreshToken = async () => {
            try {
                const token = await getIdToken();
                if (token) {
                    localStorage.setItem('authToken', token);
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        };

        const intervalId = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
        return () => clearInterval(intervalId);
    }, [user]);

    // Idle timeout management
    useEffect(() => {
        if (!user) return;

        let idleTimer;
        let warningTimer;

        const resetTimers = () => {
            setShowIdleWarning(false);
            clearTimeout(idleTimer);
            clearTimeout(warningTimer);

            warningTimer = setTimeout(() => {
                setShowIdleWarning(true);
            }, IDLE_WARNING);

            idleTimer = setTimeout(() => {
                logout();
            }, IDLE_TIMEOUT);
        };

        // Events that reset idle timer
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimers));

        resetTimers();

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimers));
            clearTimeout(idleTimer);
            clearTimeout(warningTimer);
        };
    }, [user]);

    /**
     * Login with Firebase token
     */
    const login = async (firebaseToken) => {
        try {
            const response = await authAPI.login(firebaseToken);
            const userData = response.data;

            if (userData.success) {
                const userInfo = {
                    id: userData.user_id,
                    phoneNumber: userData.phone_number,
                    fullName: userData.full_name,
                    role: userData.role,
                    zoneId: userData.zone_id,
                    zoneName: userData.zone_name,
                    dailyTarget: userData.daily_target,
                    redirectUrl: userData.redirect_url,
                    createdAt: userData.created_at,
                };

                setUser(userInfo);
                localStorage.setItem('user', JSON.stringify(userInfo));
                localStorage.setItem('authToken', firebaseToken);

                return { success: true, user: userInfo };
            } else {
                return { success: false, error: userData.message };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Login failed';
            return { success: false, error: errorMessage };
        }
    };

    /**
     * Logout - Note: Does NOT delete IndexedDB drafts per PRD
     */
    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout API failed:', error);
        }

        try {
            await firebaseSignOut();
        } catch (error) {
            console.error('Firebase signout failed:', error);
        }

        // Clear session but preserve drafts
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');

        // Redirect to login
        window.location.href = '/login';
    }, []);

    /**
     * Dismiss idle warning
     */
    const dismissIdleWarning = () => {
        setShowIdleWarning(false);
    };

    /**
     * Check if user has a specific role
     */
    const hasRole = (roles) => {
        if (!user) return false;
        if (typeof roles === 'string') return user.role === roles;
        return roles.includes(user.role);
    };

    /**
     * Development mode login - bypasses Firebase
     */
    const devLogin = async (phoneNumber) => {
        try {
            // Create a mock token for dev mode
            const mockToken = btoa(JSON.stringify({
                phone_number: phoneNumber,
                uid: `dev_${phoneNumber}`,
                exp: Date.now() + 3600000
            }));

            const response = await authAPI.login(mockToken);
            const userData = response.data;

            if (userData.success) {
                const userInfo = {
                    id: userData.user_id,
                    phoneNumber: userData.phone_number,
                    fullName: userData.full_name,
                    role: userData.role,
                    zoneId: userData.zone_id,
                    zoneName: userData.zone_name,
                    dailyTarget: userData.daily_target,
                    redirectUrl: userData.redirect_url,
                    createdAt: userData.created_at,
                };

                setUser(userInfo);
                localStorage.setItem('user', JSON.stringify(userInfo));
                localStorage.setItem('authToken', mockToken);

                return { success: true, user: userInfo };
            } else {
                return { success: false, error: userData.message };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Login failed';
            return { success: false, error: errorMessage };
        }
    };

    const value = {
        user,
        loading,
        showIdleWarning,
        login,
        devLogin,
        logout,
        refreshUser,
        dismissIdleWarning,
        hasRole,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isSupervisor: user?.role === 'SUPERVISOR',
        isSurveyor: user?.role === 'SURVEYOR',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
