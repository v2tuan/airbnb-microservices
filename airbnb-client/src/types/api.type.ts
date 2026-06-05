import { isAxiosError } from "axios";

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface ErrorResponse {
    message: string;
    errorCode: string;
    status: number;
    path: string;
    timestamp: string;
}

export function extractApiErrorMessage(
    error: unknown,
    fallback = "Something went wrong. Please try again.",
) {
    if (isAxiosError<ErrorResponse>(error)) {
        return error.response?.data?.message || fallback;
    }

    return fallback;
}
