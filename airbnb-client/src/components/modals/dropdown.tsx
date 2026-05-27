import {
  CircleQuestionMark,
  Globe,
  Heart,
  Home,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/features/auth/authSelectors";
import { logout } from "@/features/auth/authSlice";
import { Separator } from "../ui/separator";

function Dropdown() {
  const dispatch = useDispatch();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  return (
    <div className="absolute right-0 mt-3 w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border z-30">
      {/* auth section */}
      {isAuthenticated && (
        <>
          <div className="py-2">
            <Link
              href="/wishlists"
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <Heart size={18} />
              <p>Wishlist</p>
            </Link>
            <Link
              href="/trips"
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <Home size={18} />
              <p>Trips</p>
            </Link>
            <Link
              href="/guest/messages"
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <MessageSquare size={18} />
              <p>Messages</p>
            </Link>
            <Link
              href="/users/profile/about"
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <User size={18} />
              <p>Profile</p>
            </Link>
          </div>
          <Separator />
        </>
      )}

      <div className="py-2">
        {isAuthenticated && (
          <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
            <Settings size={18} />
            <p>Account settings</p>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
          <Globe size={18} />
          <p>Languages & currency</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
          <CircleQuestionMark size={18} />
          <p>Help center</p>
        </div>
      </div>

      <Separator />
      <Link
        href="/users/profile/about?editMode=true"
        className="flex my-2 py-1 px-4 hover:bg-gray-100 cursor-pointer "
      >
        <div>
          <p className="font-semibold">Become a host</p>
          <p className="text-sm text-gray-500">
            It's easy to start hosting and earn extra income.
          </p>
        </div>
        <Image
          src="/header/host.png"
          alt="Become a host"
          width={60}
          height={60}
          className="w-15 object-contain"
        />
      </Link>

      <div className="flex flex-col space-y-2 my-2 py-1 px-4 ">
        <p className="cursor-pointer hover:bg-gray-100">Refer a host</p>
        <p className="cursor-pointer hover:bg-gray-100">Find a co-host</p>
        <p className="cursor-pointer hover:bg-gray-100">Gift cards</p>
      </div>

      <Separator />

      {isAuthenticated ? (
        <button
          type="button"
          onClick={() => dispatch(logout())}
          className="my-2 cursor-pointer px-4 py-1 text-left hover:bg-gray-100"
        >
          Log out
        </button>
      ) : (
        <div className="my-2 flex flex-col py-1">
          <Link
            href="/login"
            className="px-4 py-2 font-semibold hover:bg-gray-100"
          >
            Log in
          </Link>
          <Link href="/register" className="px-4 py-2 hover:bg-gray-100">
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}

export default Dropdown;
