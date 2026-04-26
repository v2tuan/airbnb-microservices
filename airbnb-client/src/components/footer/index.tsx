import { Facebook, Globe, Instagram, Twitter } from "lucide-react";
import Link from "next/link";

const supportLinks = [
  "Help Center",
  "Get help with a safety issue",
  "AirCover",
  "Travel insurance",
  "Anti-discrimination",
  "Disability support",
  "Cancellation options",
  "Report neighborhood concern",
];

const hostingLinks = [
  "Airbnb your home",
  "Airbnb your experience",
  "Airbnb your service",
  "AirCover for Hosts",
  "Hosting resources",
  "Community forum",
  "Hosting responsibly",
  "Airbnb-friendly apartments",
  "Join a free hosting class",
  "Find a co-host",
  "Refer a host",
];

const aboutLinks = [
  "2025 Summer Release",
  "Newsroom",
  "Careers",
  "Investors",
  "Gift cards",
  "Airbnb.org emergency stays",
];

const languageItems = [
  { label: "English (US)", icon: Globe },
  { label: "VND", icon: Globe },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: string[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link}>
            <Link
              href="#"
              className="text-sm leading-6 text-zinc-600 transition hover:text-zinc-900 hover:underline"
            >
              {link}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          <FooterColumn title="Support" links={supportLinks} />
          <FooterColumn title="Hosting" links={hostingLinks} />
          <FooterColumn title="Airbnb" links={aboutLinks} />
        </div>

        <div className="mt-14 border-t border-zinc-200 pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 text-sm text-zinc-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <p className="font-medium text-zinc-900">© {new Date().getFullYear()} Airbnb, Inc.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="#" className="transition hover:text-zinc-900 hover:underline">
                  Privacy
                </Link>
                <span className="hidden text-zinc-300 sm:inline">·</span>
                <Link href="#" className="transition hover:text-zinc-900 hover:underline">
                  Terms
                </Link>
                <span className="hidden text-zinc-300 sm:inline">·</span>
                <Link href="#" className="transition hover:text-zinc-900 hover:underline">
                  Your Privacy Choices
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-5">
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-700">
                {languageItems.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="inline-flex items-center gap-2 transition hover:text-zinc-900"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 text-zinc-600">
                <Link href="#" aria-label="Facebook" className="transition hover:text-zinc-900">
                  <Facebook className="h-5 w-5" />
                </Link>
                <Link href="#" aria-label="X" className="transition hover:text-zinc-900">
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link href="#" aria-label="Instagram" className="transition hover:text-zinc-900">
                  <Instagram className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;