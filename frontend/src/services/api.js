/**
 * API Service for Digital Census Portal.
 * Handles all HTTP requests to Django backend.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if not already on login page and not a login request
            const isLoginRequest = error.config?.url?.includes('/auth/login');
            const isOnLoginPage = window.location.pathname === '/login';

            if (!isLoginRequest && !isOnLoginPage) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ============ AUTH APIs ============

export const authAPI = {
    login: (firebaseToken) =>
        api.post('/auth/login/', { firebase_token: firebaseToken }),

    logout: () =>
        api.post('/auth/logout/'),

    getMe: () =>
        api.get('/auth/me/'),

    updateProfile: (data) =>
        api.patch('/auth/me/', data),
};

// ============ USER APIs (Admin) ============

export const userAPI = {
    list: (params) =>
        api.get('/users/', { params }),

    create: (data) =>
        api.post('/users/', data),

    update: (id, data) =>
        api.patch(`/users/${id}/`, data),

    block: (id) =>
        api.post(`/users/${id}/block/`),

    unblock: (id) =>
        api.post(`/users/${id}/unblock/`),

    reassignZone: (id, zoneId) =>
        api.post(`/users/${id}/reassign_zone/`, { zone_id: zoneId }),

    bulkUpload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/users/bulk_upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// ============ ZONE APIs ============

export const zoneAPI = {
    list: () =>
        api.get('/users/zones/'),

    create: (data) =>
        api.post('/users/zones/', data),

    update: (id, data) =>
        api.patch(`/users/zones/${id}/`, data),
};

// ============ SURVEY APIs ============

export const surveyAPI = {
    list: (params) =>
        api.get('/surveys/', { params }),

    get: (id) =>
        api.get(`/surveys/${id}/`),

    create: (data) =>
        api.post('/surveys/', data),

    update: (id, data) =>
        api.patch(`/surveys/${id}/`, data),

    submit: (id, gpsData) =>
        api.post(`/surveys/${id}/submit/`, gpsData),

    verify: (id) =>
        api.post(`/surveys/${id}/verify/`),

    flag: (id, reason) =>
        api.post(`/surveys/${id}/flag/`, { reason }),

    delete: (id) =>
        api.delete(`/surveys/${id}/`),

    getHistory: () =>
        api.get('/surveys/history/'),

    getDailyProgress: () =>
        api.get('/surveys/daily_progress/'),
};

// ============ ADDRESS APIs ============

export const addressAPI = {
    list: (params) =>
        api.get('/addresses/', { params }),

    get: (id) =>
        api.get(`/addresses/${id}/`),

    create: (data) =>
        api.post('/addresses/', data),

    update: (id, data) =>
        api.patch(`/addresses/${id}/`, data),

    delete: (id) =>
        api.delete(`/addresses/${id}/`),

    validatePincode: (pincode) =>
        api.get('/addresses/validate_pincode/', { params: { pincode } }),

    markStatus: (id, status) =>
        api.post(`/addresses/${id}/mark_status/`, { status }),
};

// ============ ANALYTICS APIs ============

export const analyticsAPI = {
    getAdminDashboard: (params) =>
        api.get('/analytics/admin/', { params }),

    getSupervisorDashboard: (zoneId) =>
        api.get('/analytics/supervisor/', { params: { zone_id: zoneId } }),

    getSurveyorDashboard: () =>
        api.get('/analytics/surveyor/'),

    getLeaderboard: (params) =>
        api.get('/analytics/leaderboard', { params }),
};

export const notificationAPI = {
    list: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
};

export default api;
