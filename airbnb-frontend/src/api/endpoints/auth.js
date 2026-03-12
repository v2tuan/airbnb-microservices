
import apiClient from '../client';

const prefix = import.meta.env.VITE_PREFIX

export const authAPI = {
    login: (credentials) => {
        return apiClient.post(prefix + '/users/auth/login', credentials);
    },

    register: (userData) => {
        return apiClient.post(prefix + '/users/auth/register', userData);
    },

    // logout: () => {
    //     return apiClient.post('/users/logout');
    // },
    //
    // getCurrentUser: () => {
    //     return apiClient.get('/users/me');
    // },
    //
    // refreshToken: (refreshToken) => {
    //     return apiClient.post('/users/refresh', { refreshToken });
    // },
};

export default authAPI;
