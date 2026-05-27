import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  children: ReactNode;
  title?: string;
  headerAction?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AuthCard({
  children,
  title,
  headerAction,
  className,
  contentClassName,
}: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full overflow-hidden rounded-[24px] border border-[#dddddd] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {(title || headerAction) && (
        <div className="flex min-h-16 items-center border-b border-[#ebebeb] px-5">
          <div className="w-10 shrink-0">{headerAction}</div>
          {title && (
            <h1 className="flex-1 pr-10 text-center text-base font-semibold text-[#222222]">
              {title}
            </h1>
          )}
        </div>
      )}

      <div className={cn("p-6 sm:p-7", contentClassName)}>{children}</div>
    </section>
  );
}
