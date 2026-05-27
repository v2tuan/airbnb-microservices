import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface OnboardResponse {
    url: string;
}

export interface HostStatusResponse {
    success: boolean;
    description: string;
    stripeAccountId: string;
}

export async function startOnboarding(token : string | null): Promise<ApiResponse<OnboardResponse>> {
    const headers: Record<string, string> = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await apiClient.post(`${prefix}/users/stripe/onboard`, {}, { headers });
    return res.data;
}

export async function checkStatus(
    token: string | null
): Promise<ApiResponse<HostStatusResponse>> {

    const headers: Record<string, string> = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await apiClient.get(
        `${prefix}/users/stripe/status`,
        { headers }
    );

    return res.data;
}

export async function refreshLink(token : string | null): Promise<ApiResponse<OnboardResponse>> {
    const res = await apiClient.get(`${prefix}/users/stripe/refresh`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}