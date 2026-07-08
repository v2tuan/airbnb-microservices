import { redirect } from "next/navigation";

export default async function HostMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  redirect(`/guest/messages/${id}`);
}
