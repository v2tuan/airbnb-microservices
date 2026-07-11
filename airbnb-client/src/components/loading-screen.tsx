import Image from "next/image";

type LoadingScreenProps = {
  title?: string;
  subtitle?: string;
};

export function LoadingScreen({
  title = "Loading",
  subtitle = "Preparing your experience.",
}: LoadingScreenProps) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex size-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#ebebeb]" />
          <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#ff385c] border-r-[#ff385c] animate-spin" />
          <div className="flex size-20 flex-col items-center justify-center gap-1 rounded-full bg-white shadow-[0_12px_40px_rgba(255,56,92,0.12)]">
            <Image
              src="/header/logo.png"
              alt="Airstay"
              width={96}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-[#222222]">{title}</p>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>
    </main>
  );
}
