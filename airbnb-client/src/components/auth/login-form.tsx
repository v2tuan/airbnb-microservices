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
import { clearAuthMessages, loginThunk } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/store";

export type LoginFormData = {
  username: string;
  password: string;
};

type LoginFormProps = {
  mode?: "modal" | "page";
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
};

export function LoginForm({
  mode = "modal",
  onSuccess,
  onSwitchToRegister,
}: LoginFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  const onSubmit = async (data: LoginFormData) => {
    setHasSubmitted(true);

    try {
      const result = await dispatch(loginThunk(data));

      if (loginThunk.fulfilled.match(result)) {
        onSuccess?.();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const isBusy = isSubmitting || loading;
  const submitError = hasSubmitted ? error : null;

  return (
    <div className="mx-auto w-full">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-semibold tracking-normal text-[#222222]">
          Welcome to AIRSTAY
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
          Log in to continue planning your next stay.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Username"
            {...register("username", {
              required: "Username is required",
            })}
            className="h-14 w-full rounded-xl border border-[#b0b0b0] px-4 text-[15px] text-[#222222] transition placeholder:text-[#717171] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-500">
              {errors.username.message}
            </p>
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
              className="h-14 w-full rounded-xl border border-[#b0b0b0] px-4 pr-12 text-[15px] text-[#222222] transition placeholder:text-[#717171] focus:border-[#222222] focus:outline-none focus:ring-1 focus:ring-[#222222]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-4 cursor-pointer text-[#717171] transition-colors hover:text-[#222222]"
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

          <div className="mt-2 flex justify-end">
            <Link
              href="#"
              className="text-sm font-semibold text-[#222222] underline underline-offset-2 hover:text-black"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {submitError && (
          <p className="text-sm font-medium text-red-500">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="h-14 w-full cursor-pointer rounded-xl bg-[#ff385c] font-semibold text-white transition hover:bg-[#e31c5f] disabled:cursor-not-allowed disabled:bg-[#dddddd] disabled:text-[#717171]"
        >
          {isBusy ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="my-7 flex items-center">
        <div className="flex-1 border-t border-[#dddddd]" />
        <span className="px-4 text-sm text-[#717171]">or</span>
        <div className="flex-1 border-t border-[#dddddd]" />
      </div>

      <p className="text-center text-sm text-[#717171]">
        Don't have an account?{" "}
        {mode === "modal" ? (
          <button
            type="button"
            className="cursor-pointer font-semibold text-[#222222] hover:underline"
            onClick={onSwitchToRegister}
          >
            Sign up
          </button>
        ) : (
          <Link
            href="/register"
            className="font-semibold text-[#222222] hover:underline"
          >
            Sign up
          </Link>
        )}
      </p>
    </div>
  );
}
