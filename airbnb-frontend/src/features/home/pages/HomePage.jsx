import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    CalendarDays,
    Coffee,
    Heart,
    Home,
    MapPin,
    Mountain,
    Search,
    ShieldCheck,
    Sparkles,
    Star,
    Trees,
    Users,
    Waves,
    Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {selectCurrentUser, selectIsAuthenticated} from "@/features/auth/authSelectors.js";
import {logout} from "@/features/auth/authSlice.js";

const categories = [
    { label: "Biển", icon: Waves },
    { label: "Núi", icon: Mountain },
    { label: "Cabin", icon: Trees },
    { label: "Remote work", icon: Wifi },
    { label: "Cà phê đẹp", icon: Coffee },
];

const stays = [
    {
        id: 1,
        title: "Sunset Loft",
        location: "Đà Nẵng, Việt Nam",
        price: 78,
        rating: 4.95,
        tag: "Guest favorite",
        color: "from-rose-200 via-orange-100 to-white",
    },
    {
        id: 2,
        title: "Palm Villa",
        location: "Phú Quốc, Việt Nam",
        price: 145,
        rating: 4.91,
        tag: "Beachfront",
        color: "from-sky-200 via-cyan-100 to-white",
    },
    {
        id: 3,
        title: "Cloud Cabin",
        location: "Đà Lạt, Việt Nam",
        price: 64,
        rating: 4.89,
        tag: "Mountain view",
        color: "from-emerald-200 via-lime-100 to-white",
    },
    {
        id: 4,
        title: "City Nest",
        location: "TP. Hồ Chí Minh, Việt Nam",
        price: 59,
        rating: 4.87,
        tag: "Long stay",
        color: "from-violet-200 via-fuchsia-100 to-white",
    },
];

function CategoryPill({ icon: Icon, label }) {
    return (
        <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

function StayCard({ stay }) {
    return (
        <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90 shadow-lg shadow-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <div
                className={`relative h-56 bg-gradient-to-br ${stay.color} p-5`}
            >
                <div className="absolute left-5 top-5">
                    <Badge className="rounded-full bg-white/80 text-slate-700 hover:bg-white/80">
                        {stay.tag}
                    </Badge>
                </div>

                <button className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm transition hover:bg-white">
                    <Heart className="h-4 w-4" />
                </button>

                <div className="absolute bottom-5 left-5 rounded-2xl bg-white/75 px-4 py-2 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        AirStay picks
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                        Stylish • Cozy • Verified
                    </p>
                </div>
            </div>

            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                            {stay.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                            <MapPin className="h-4 w-4" />
                            {stay.location}
                        </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700">
                        <Star className="h-4 w-4 fill-current" />
                        {stay.rating}
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Giá từ</p>
                        <p className="text-xl font-bold text-slate-900">
                            ${stay.price}
                            <span className="ml-1 text-sm font-medium text-slate-500">
                / đêm
              </span>
                        </p>
                    </div>

                    <Button className="rounded-full bg-slate-900 hover:bg-slate-800">
                        Xem chi tiết
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function HomePage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const user = useSelector(selectCurrentUser);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const [searchForm, setSearchForm] = useState({
        where: "",
        checkIn: "",
        guests: "",
    });

    const firstName = useMemo(() => {
        if (!user?.name) return "bạn";
        return user.name.split(" ")[0];
    }, [user]);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        console.log("Search:", searchForm);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-rose-50/40 to-slate-50">
            <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                            <Home className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-slate-900">AirStay</p>
                            <p className="text-xs text-slate-500">Stay like you belong</p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-6 md:flex">
                        <button className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                            Chỗ ở
                        </button>
                        <button className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                            Trải nghiệm
                        </button>
                        <button className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                            Trở thành host
                        </button>
                    </nav>

                    <div className="flex items-center gap-2">
                        {isAuthenticated ? (
                            <>
                                <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-rose-100 text-rose-600">
                                            {firstName.slice(0, 1).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-slate-900">
                                            Xin chào, {firstName}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Ready for your next stay?
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="rounded-full border-slate-200"
                                    onClick={handleLogout}
                                >
                                    Đăng xuất
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    className="rounded-full"
                                    onClick={() => navigate("/login")}
                                >
                                    Đăng nhập
                                </Button>
                                <Button
                                    className="rounded-full bg-rose-500 hover:bg-rose-600"
                                    onClick={() => navigate("/register")}
                                >
                                    Đăng ký
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main>
                <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:px-6 lg:pt-14">
                    <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                        <div>
                            <Badge className="rounded-full bg-rose-50 px-4 py-1.5 text-rose-600 hover:bg-rose-50">
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                                Curated stays for every mood
                            </Badge>

                            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
                                Tìm nơi ở lý tưởng cho chuyến đi tiếp theo của bạn.
                            </h1>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                                Chọn từ căn hộ ấm cúng trong thành phố, villa ven biển thư giãn
                                hay cabin giữa núi. Một giao diện thân thiện, cảm giác du lịch
                                ngay từ cú click đầu tiên.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                {categories.map((category) => (
                                    <CategoryPill
                                        key={category.label}
                                        icon={category.icon}
                                        label={category.label}
                                    />
                                ))}
                            </div>
                        </div>

                        <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-2xl shadow-rose-100/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xl font-semibold text-slate-900">
                                    Tìm chỗ ở trong vài giây
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <form onSubmit={handleSearch} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">
                                                Đi đâu?
                                            </label>
                                            <Input
                                                name="where"
                                                placeholder="Đà Nẵng, Phú Quốc..."
                                                value={searchForm.where}
                                                onChange={handleSearchChange}
                                                className="h-12 rounded-2xl border-slate-200"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">
                                                Check-in
                                            </label>
                                            <Input
                                                name="checkIn"
                                                type="date"
                                                value={searchForm.checkIn}
                                                onChange={handleSearchChange}
                                                className="h-12 rounded-2xl border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            Số khách
                                        </label>
                                        <Input
                                            name="guests"
                                            placeholder="2 người lớn, 1 trẻ em"
                                            value={searchForm.guests}
                                            onChange={handleSearchChange}
                                            className="h-12 rounded-2xl border-slate-200"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="h-12 w-full rounded-2xl bg-rose-500 text-base font-semibold shadow-lg shadow-rose-200 hover:bg-rose-600"
                                    >
                                        <Search className="mr-2 h-4 w-4" />
                                        Tìm kiếm
                                    </Button>

                                    <div className="grid gap-3 pt-2 text-sm text-slate-600 sm:grid-cols-3">
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="font-semibold text-slate-900">4.9/5</p>
                                            <p>Đánh giá từ khách</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="font-semibold text-slate-900">10K+</p>
                                            <p>Chỗ ở được chọn lọc</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="font-semibold text-slate-900">24/7</p>
                                            <p>Hỗ trợ hành trình</p>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                Chỗ ở nổi bật tuần này
                            </h2>
                            <p className="mt-1 text-slate-600">
                                Gần gũi, tinh tế, hợp vibe nghỉ dưỡng hiện đại.
                            </p>
                        </div>

                        <Button variant="ghost" className="rounded-full text-slate-700">
                            Xem tất cả
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {stays.map((stay) => (
                            <StayCard key={stay.id} stay={stay} />
                        ))}
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
                    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                        <Card className="rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-2xl shadow-slate-200">
                            <CardContent className="p-8">
                                <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
                                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                    Trusted hosting
                                </Badge>
                                <h3 className="mt-5 text-3xl font-bold">
                                    Trở thành host và chia sẻ không gian của bạn.
                                </h3>
                                <p className="mt-3 max-w-xl text-white/75">
                                    Đăng chỗ ở, tiếp cận khách phù hợp và biến không gian trống
                                    thành nguồn thu bền vững.
                                </p>
                                <Button className="mt-6 rounded-full bg-white text-slate-900 hover:bg-white/90">
                                    Bắt đầu làm host
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-xl">
                            <CardContent className="p-8">
                                <div className="grid gap-5 sm:grid-cols-3">
                                    <div className="rounded-3xl bg-rose-50 p-5">
                                        <Users className="h-6 w-6 text-rose-500" />
                                        <p className="mt-4 text-2xl font-bold text-slate-900">
                                            20k+
                                        </p>
                                        <p className="text-sm text-slate-600">Khách quay lại</p>
                                    </div>

                                    <div className="rounded-3xl bg-sky-50 p-5">
                                        <CalendarDays className="h-6 w-6 text-sky-500" />
                                        <p className="mt-4 text-2xl font-bold text-slate-900">
                                            12k+
                                        </p>
                                        <p className="text-sm text-slate-600">Đêm đã đặt</p>
                                    </div>

                                    <div className="rounded-3xl bg-emerald-50 p-5">
                                        <Star className="h-6 w-6 text-emerald-500" />
                                        <p className="mt-4 text-2xl font-bold text-slate-900">
                                            4.9
                                        </p>
                                        <p className="text-sm text-slate-600">Điểm hài lòng</p>
                                    </div>
                                </div>

                                <Separator className="my-6" />

                                <p className="text-lg leading-8 text-slate-700">
                                    Thiết kế theo tinh thần Airbnb: rõ ràng, dễ dùng, giàu cảm
                                    xúc du lịch, nhưng vẫn gọn gàng cho một sản phẩm React thực tế.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>
        </div>
    );
}
