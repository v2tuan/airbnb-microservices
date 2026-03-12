import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    ArrowRight,
    CalendarDays,
    Home,
    Lock,
    Mail,
    Sparkles,
    User,
    Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
    selectAuthError,
    selectAuthLoading,
    selectIsAuthenticated,
    selectRegisterSuccessMessage,
} from "@/features/auth/authSelectors.js";
import {
    clearAuthMessages,
    registerThunk,
} from "@/features/auth/authSlice.js";

function MiniFeature({ icon: Icon, text }) {
    return (
        <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-black/5">
            <Icon className="h-4 w-4 text-rose-500" />
            <span>{text}</span>
        </div>
    );
}

export default function RegisterPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const loading = useSelector(selectAuthLoading);
    const error = useSelector(selectAuthError);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const successMessage = useSelector(selectRegisterSuccessMessage);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [localError, setLocalError] = useState("");

    useEffect(() => {
        dispatch(clearAuthMessages());
    }, [dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/", { replace: true });
            return;
        }

        if (successMessage) {
            const timer = setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1200);

            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, successMessage, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setLocalError("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(clearAuthMessages());
        setLocalError("");

        const {
            firstName,
            lastName,
            dateOfBirth,
            username,
            email,
            password,
            confirmPassword,
        } = formData;

        if (
            !firstName ||
            !lastName ||
            !dateOfBirth ||
            !username ||
            !email ||
            !password ||
            !confirmPassword
        ) {
            setLocalError("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        if (password !== confirmPassword) {
            setLocalError("Mật khẩu xác nhận không khớp");
            return;
        }

        dispatch(
            registerThunk({
                firstName,
                lastName,
                dateOfBirth,
                username,
                email,
                password,
            })
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/70 to-rose-50/70">
            <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
                <div className="hidden px-8 py-10 lg:flex">
                    <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-200">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.25),transparent_28%)]" />

                        <div className="relative z-10">
                            <Badge className="rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-white hover:bg-white/10">
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                                Bắt đầu hành trình mới
                            </Badge>

                            <h2 className="mt-6 max-w-lg text-4xl font-bold leading-tight">
                                Tạo tài khoản để khám phá nơi ở đẹp cho mọi chuyến đi.
                            </h2>

                            <p className="mt-4 max-w-lg text-base leading-7 text-white/80">
                                Theo dõi booking, lưu wishlist, đặt chỗ nhanh hơn và nhận gợi ý
                                phù hợp với phong cách du lịch của bạn.
                            </p>
                        </div>

                        <div className="relative z-10 mt-8 flex flex-wrap gap-3">
                            <MiniFeature icon={CalendarDays} text="Quản lý booking dễ dàng" />
                            <MiniFeature icon={Users} text="Phù hợp cho cặp đôi & nhóm bạn" />
                            <MiniFeature icon={Home} text="Từ studio đến villa" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center px-6 py-10 lg:px-10">
                    <Card className="w-full max-w-2xl rounded-[2rem] border-white/70 bg-white/95 shadow-2xl shadow-orange-100/60 backdrop-blur">
                        <CardHeader className="space-y-4 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                                    <Home className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-900">AirStay</p>
                                    <p className="text-xs text-slate-500">Create your account</p>
                                </div>
                            </div>

                            <div>
                                <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                                    Tạo tài khoản mới
                                </CardTitle>
                                <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                                    Điền đầy đủ thông tin để bắt đầu trải nghiệm.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">Tên</Label>
                                        <div className="relative">
                                            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="firstName"
                                                name="firstName"
                                                type="text"
                                                placeholder="Văn"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Họ</Label>
                                        <div className="relative">
                                            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="lastName"
                                                name="lastName"
                                                type="text"
                                                placeholder="Nguyễn"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Tên đăng nhập</Label>
                                        <div className="relative">
                                            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="username"
                                                name="username"
                                                type="text"
                                                placeholder="nguyenvana"
                                                value={formData.username}
                                                onChange={handleChange}
                                                className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                                        <div className="relative">
                                            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="dateOfBirth"
                                                name="dateOfBirth"
                                                type="date"
                                                value={formData.dateOfBirth}
                                                onChange={handleChange}
                                                className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="ban@example.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Mật khẩu</Label>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="password"
                                                name="password"
                                                type="password"
                                                placeholder="Tối thiểu 8 ký tự"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type="password"
                                                placeholder="Nhập lại mật khẩu"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {localError && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {localError}
                                    </div>
                                )}

                                {error && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                        {successMessage}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-12 w-full rounded-2xl bg-rose-500 text-base font-semibold shadow-lg shadow-rose-200 transition hover:bg-rose-600"
                                >
                                    {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                                </Button>

                                <p className="text-center text-sm text-slate-600">
                                    Đã có tài khoản?{" "}
                                    <Link
                                        to="/login"
                                        className="font-semibold text-rose-500 hover:text-rose-600"
                                    >
                                        Đăng nhập ngay
                                    </Link>
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}