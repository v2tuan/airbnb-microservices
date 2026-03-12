import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    ArrowRight,
    Heart,
    Home,
    Lock,
    Mail,
    ShieldCheck,
    Sparkles,
    Star,
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
import { Separator } from "@/components/ui/separator";
import {selectAuthError, selectAuthLoading, selectIsAuthenticated} from "@/features/auth/authSelectors.js";
import {clearAuthMessages, loginThunk} from "@/features/auth/authSlice.js";


function Benefit({ icon: Icon, title, description }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const loading = useSelector(selectAuthLoading);
    const error = useSelector(selectAuthError);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    useEffect(() => {
        dispatch(clearAuthMessages());
    }, [dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(clearAuthMessages());
        dispatch(loginThunk(formData));
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-rose-50/60 to-orange-50/70">
            <div className=" grid min-h-screen lg:grid-cols-2">
                <div className="flex items-center justify-center px-6 py-10 lg:px-10">
                    <Card className="w-full max-w-md rounded-[2rem] border-white/70 bg-white/90 shadow-2xl shadow-rose-100/60 backdrop-blur">
                        <CardHeader className="space-y-4 pb-3">
                            <div className="flex items-center justify-between">
                                <Link to="/" className="flex items-center gap-2">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                                        <Home className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-slate-900">
                                            AirStay
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Feel at home, anywhere
                                        </p>
                                    </div>
                                </Link>

                                <Badge className="rounded-full bg-rose-50 px-3 py-1 text-rose-600 hover:bg-rose-50">
                                    Chào mừng trở lại
                                </Badge>
                            </div>

                            <div>
                                <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                                    Đăng nhập để tiếp tục chuyến đi của bạn
                                </CardTitle>
                                <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                                    Quản lý booking, lưu chỗ ở yêu thích và nhận gợi ý phù hợp
                                    cho kỳ nghỉ tiếp theo.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            id="username"
                                            name="username"
                                            // type="email"
                                            placeholder="ban@example.com"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Mật khẩu</Label>
                                        <button
                                            type="button"
                                            className="text-sm font-medium text-rose-500 transition hover:text-rose-600"
                                        >
                                            Quên mật khẩu?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            placeholder="Nhập mật khẩu"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="h-12 rounded-2xl border-slate-200 pl-10 shadow-sm focus-visible:ring-rose-400"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-12 w-full rounded-2xl bg-rose-500 text-base font-semibold shadow-lg shadow-rose-200 transition hover:bg-rose-600"
                                >
                                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                                </Button>

                                <div className="relative">
                                    <Separator />
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                    AirStay
                  </span>
                                </div>

                                <p className="text-center text-sm text-slate-600">
                                    Chưa có tài khoản?{" "}
                                    <Link
                                        to="/register"
                                        className="font-semibold text-rose-500 hover:text-rose-600"
                                    >
                                        Tạo tài khoản mới
                                    </Link>
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="hidden px-8 py-10 lg:flex">
                    <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-500 via-rose-400 to-orange-300 p-8 text-white shadow-2xl shadow-rose-200">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.25),transparent_22%)]" />

                        <div className="relative z-10">
                            <Badge className="rounded-full border-white/20 bg-white/15 px-4 py-1.5 text-white hover:bg-white/15">
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                                Airbnb-inspired experience
                            </Badge>

                            <h2 className="mt-6 max-w-lg text-4xl font-bold leading-tight">
                                Ở đâu cũng thấy như ở nhà.
                            </h2>

                            <p className="mt-4 max-w-lg text-base leading-7 text-white/90">
                                Từ căn hộ trong thành phố đến villa nghỉ dưỡng cuối tuần —
                                mọi hành trình bắt đầu bằng một nơi ở thật đúng gu.
                            </p>
                        </div>

                        <div className="relative z-10 mt-8 grid gap-4">
                            <Benefit
                                icon={Heart}
                                title="Wishlist thông minh"
                                description="Lưu lại những chỗ ở bạn yêu thích cho từng chuyến đi."
                            />
                            <Benefit
                                icon={ShieldCheck}
                                title="Đặt phòng an tâm"
                                description="Thông tin rõ ràng, quy trình gọn gàng, trải nghiệm đáng tin cậy."
                            />
                            <Benefit
                                icon={Star}
                                title="Gợi ý cá nhân hóa"
                                description="Tìm nơi ở phù hợp theo ngân sách, phong cách và nhóm đi cùng."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
