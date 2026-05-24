import { redirect } from "next/navigation";

export default function Page() {
  redirect("/users/profile/about");
}

