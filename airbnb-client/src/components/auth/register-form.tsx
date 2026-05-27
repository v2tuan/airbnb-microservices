"use client";

import { Eye, EyeClosed } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import {
  selectAuthError,
  selectAuthLoading,
} from "@/features/auth/authSelectors";
import { clearAuthMessages, registerThunk } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/store";

export type RegisterFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  username: string;
  email: string;
  password: string;
};

type RegisterFormProps = {
  mode?: "modal" | "page";
  onSuccess?: (data: RegisterFormData) => void;
  onSwitchToLogin?: () => void;
};

export function RegisterForm({
  mode = "modal",
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterFormData>();

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  const onSubmit = async (data: RegisterFormData) => {
    setHasSubmitted(true);

    try {
      const result = await dispatch(registerThunk(data));

      if (registerThunk.fulfilled.match(result)) {
        reset();
        localStorage.setItem("temp_username", data.username);
        onSuccess?.(data);
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  const isBusy = isSubmitting || loading;
  const submitError = hasSubmitted ? error : null;

  return (
    <div className="mx-auto w-full">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-semibold tracking-normal text-[#222222] sm:text-3xl">
          Welcome to AIRSTAY
        </h2>
        <p className="mt-1.5 text-sm leading-5 text-[#6a6a6a]">
          Create an account to book unique places and experiences.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
              type="text"
              placeholder="First Name"
              {...register("firstName", {
                required: "First name is required",
              })}
              className="h-12 w-full rounded-xl border border-[#b0b0b0] px-4 text-[15px] text-[#222222] placeholder:text-[#717171] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Last Name"
              {...register("lastName", {
                required: "Last name is required",
              })}
              className="h-12 w-full rounded-xl border border-[#b0b0b0] px-4 text-[15px] text-[#222222] placeholder:text-[#717171] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="ml-1 text-xs text-[#717171]">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            {...register("dateOfBirth", {
              required: "Birthday is required",
            })}
            className="mt-1 h-12 w-full rounded-xl border border-[#b0b0b0] px-4 text-[15px] text-[#222222] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
          />
          {errors.dateOfBirth && (
            <p className="mt-1 text-sm text-red-500">
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>

        <div>
          <input
            type="text"
            placeholder="Username"
            {...register("username", {
              required: "Username is required",
            })}
            className="h-12 w-full rounded-xl border border-[#b0b0b0] px-4 text-[15px] text-[#222222] placeholder:text-[#717171] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-500">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Invalid email format",
              },
            })}
            className="h-12 w-full rounded-xl border border-[#b0b0b0] px-4 text-[15px] text-[#222222] placeholder:text-[#717171] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Minimum 6 characters",
                },
              })}
              className="h-12 w-full rounded-xl border border-[#b0b0b0] px-4 pr-12 text-[15px] text-[#222222] transition placeholder:text-[#717171] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-3.5 cursor-pointer text-[#717171] transition-colors hover:text-[#222222]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Eye size={20} /> : <EyeClosed size={20} />}
            </button>
          </div>

          {errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {submitError && (
          <p className="text-sm font-medium text-red-500">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="h-12 w-full cursor-pointer rounded-xl bg-[#ff385c] font-semibold text-white transition hover:bg-[#e31c5f] disabled:cursor-not-allowed disabled:bg-[#dddddd] disabled:text-[#717171]"
        >
          {isBusy ? "Creating account..." : "Continue"}
        </button>
      </form>

      <div className="my-5 flex items-center">
        <div className="flex-1 border-t border-[#dddddd]" />
        <span className="px-4 text-sm text-[#717171]">or</span>
        <div className="flex-1 border-t border-[#dddddd]" />
      </div>

      <p className="text-center text-sm text-[#717171]">
        Already have an account?{" "}
        {mode === "modal" ? (
          <button
            type="button"
            className="cursor-pointer font-semibold text-[#222222] hover:underline"
            onClick={onSwitchToLogin}
          >
            Log in
          </button>
        ) : (
          <Link
            href="/login"
            className="font-semibold text-[#222222] hover:underline"
          >
            Log in
          </Link>
        )}
      </p>
    </div>
  );
}
