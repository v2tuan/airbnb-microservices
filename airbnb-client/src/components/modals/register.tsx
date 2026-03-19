"use client"

import { selectAuthError, selectAuthLoading } from "@/features/auth/authSelectors";
import { clearAuthMessages, registerThunk } from "@/features/auth/authSlice";
import useLoginModal from "@/hooks/userLoginModal";
import useRegisterModal from "@/hooks/userRegisterModal";
import { AppDispatch } from "@/store";
import { Eye, EyeClosed } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

// Định nghĩa kiểu dữ liệu cho Form dựa trên yêu cầu của bạn
type FormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  username: string;
  email: string;
  password: string;
}

function RegisterModal() {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const dispatch = useDispatch<AppDispatch>();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>();

  // Xóa thông báo lỗi khi đóng/mở modal
  useEffect(() => {
    if (registerModal.isOpen) {
      dispatch(clearAuthMessages());
    }
  }, [registerModal.isOpen, dispatch]);

  const onSubmit = async (data: FormData) => {
    try {
      const result = await dispatch(registerThunk(data));

      if (registerThunk.fulfilled.match(result)) {
        reset();
        registerModal.onClose();
        localStorage.setItem("temp_username", data.username)
        loginModal.onOpen(); // Chuyển sang đăng nhập sau khi đăng ký thành công
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  const handleSwitchToLogin = () => {
    registerModal.onClose();
    loginModal.onOpen();
  };

  if (!registerModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="relative bg-white p-6 rounded-2xl shadow-lg w-[500px] max-h-[90vh] overflow-y-auto z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b pb-4">
          <button 
            onClick={registerModal.onClose} 
            className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition"
          >
            <span className="w-4 h-4 block">✕</span> 
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-8">
            Sign up
          </h2>
        </div>

        <div className="p-6">
          <h3 className="text-2xl font-semibold mb-6">Welcome to AIRSTAY</h3>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Họ và Tên - Chia 2 cột */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="First Name"
                  {...register("firstName", { required: "First name is required" })}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Last Name"
                  {...register("lastName", { required: "Last name is required" })}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Ngày sinh */}
            <div>
              <label className="text-xs text-gray-500 ml-1">Date of Birth</label>
              <input
                type="date"
                {...register("dateOfBirth", { required: "Birthday is required" })}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
              {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
            </div>

            {/* Username */}
            <div>
              <input
                type="text"
                placeholder="Username"
                {...register("username", { required: "Username is required" })}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email"
                {...register("email", { 
                  required: "Email is required",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Invalid email format"
                  }
                })}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                {...register("password", { 
                  required: "Password is required",
                  minLength: { value: 6, message: "Minimum 6 characters" }
                })}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black transition"
              />
              
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-3.5 text-gray-500 hover:text-black transition-colors cursor-pointer"
              >
                {/* Sửa lại logic hiển thị icon */}
                {showPassword ? <Eye size={20} /> : <EyeClosed size={20} />}
              </button>

              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Hiển thị lỗi từ API (Redux) */}
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            {/* Nút đăng ký */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-rose-500 cursor-pointer hover:bg-rose-600 text-white font-semibold py-4 rounded-lg transition disabled:bg-gray-400"
            >
              {isSubmitting || loading ? "Creating account..." : "Continue"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t"></div>
          </div>

          <p className="text-sm text-center text-gray-600">
            Already have an account?{" "}
            <span 
              className="text-black font-semibold cursor-pointer hover:underline" 
              onClick={handleSwitchToLogin}
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterModal;