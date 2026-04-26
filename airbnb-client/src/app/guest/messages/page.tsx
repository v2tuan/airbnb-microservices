import { Archive, CircleDot, Search, Star, Tag } from "lucide-react";

type Conversation = {
  id: string;
  name: string;
  avatar: string;
  listing: string;
  time: string;
  preview: string;
  unread?: boolean;
};

const conversations: Conversation[] = [
  {
    id: "c1",
    name: "Lina Trinh",
    avatar: "LT",
    listing: "Modern loft in District 1",
    time: "2m ago",
    preview: "Sure, early check-in at 1pm works for you.",
    unread: true,
  },
  {
    id: "c2",
    name: "Aiden Park",
    avatar: "AP",
    listing: "Ocean-view apartment",
    time: "1h ago",
    preview: "I've shared the self check-in guide and parking map.",
  },
  {
    id: "c3",
    name: "Mia Nguyen",
    avatar: "MN",
    listing: "Cozy studio near Ben Thanh",
    time: "Yesterday",
    preview: "Thanks for staying, let me know if you need a late checkout.",
  },
  {
    id: "c4",
    name: "Noah Kim",
    avatar: "NK",
    listing: "Sunlit penthouse",
    time: "Apr 22",
    preview: "Can you confirm the Wi-Fi speed for work calls?",
  },
];

export default function GuestMessagesPage() {
  const activeConversation = conversations[0];

  return (
    <main className="min-h-[calc(100vh-130px)] bg-[linear-gradient(180deg,#fff_0%,#fff_55%,#f8fafc_100%)] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Guest inbox</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900 sm:text-4xl">Messages</h1>
          <p className="mt-2 text-sm text-zinc-600">Stay in touch with hosts and keep trip details in one place.</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_12px_45px_rgba(15,23,42,0.08)]">
          <div className="grid min-h-[68vh] grid-cols-1 lg:grid-cols-[360px_1fr]">
            <aside className="border-b border-zinc-200 lg:border-b-0 lg:border-r">
              <div className="space-y-4 border-b border-zinc-200 p-4 sm:p-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search messages"
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-zinc-50 pl-10 pr-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 hover:border-zinc-900 hover:text-zinc-900 transition">All</button>
                  <button className="rounded-full border border-zinc-200 px-3 py-1.5 hover:border-zinc-900 hover:text-zinc-900 transition">Unread</button>
                  <button className="rounded-full border border-zinc-200 px-3 py-1.5 hover:border-zinc-900 hover:text-zinc-900 transition">Archived</button>
                </div>
              </div>

              <div className="max-h-[48vh] overflow-y-auto lg:max-h-[60vh]">
                {conversations.map((conversation, index) => {
                  const isActive = index === 0;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`group w-full border-b border-zinc-100 px-4 py-4 text-left transition sm:px-5 ${
                        isActive ? "bg-zinc-50" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                          {conversation.avatar}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-zinc-900">{conversation.name}</p>
                            <span className="shrink-0 text-xs text-zinc-500">{conversation.time}</span>
                          </div>
                          <p className="truncate text-xs text-zinc-500">{conversation.listing}</p>
                          <p className="mt-1 truncate text-sm text-zinc-700">{conversation.preview}</p>
                        </div>

                        {conversation.unread ? <CircleDot className="mt-1 h-4 w-4 shrink-0 text-rose-500" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex flex-col">
              <header className="border-b border-zinc-200 px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">{activeConversation.name}</p>
                    <p className="text-sm text-zinc-500">{activeConversation.listing}</p>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-500">
                    <button type="button" className="rounded-full border border-zinc-200 p-2.5 hover:border-zinc-900 hover:text-zinc-900 transition" aria-label="Star conversation">
                      <Star className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-full border border-zinc-200 p-2.5 hover:border-zinc-900 hover:text-zinc-900 transition" aria-label="Label conversation">
                      <Tag className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-full border border-zinc-200 p-2.5 hover:border-zinc-900 hover:text-zinc-900 transition" aria-label="Archive conversation">
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </header>

              <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white to-transparent" />

                <div className="mx-auto flex max-w-3xl flex-col gap-4">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-3 text-sm text-zinc-800 animate-in fade-in slide-in-from-left-1 duration-500">
                    Hi! Looking forward to your trip. Let me know your arrival time and I will prepare the keys.
                  </div>

                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-3 text-sm text-white animate-in fade-in slide-in-from-right-1 duration-500">
                    Thanks Lina. I land at 12:15 and should reach your place around 1pm.
                  </div>

                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-3 text-sm text-zinc-800 animate-in fade-in slide-in-from-left-1 duration-700">
                    Perfect. I enabled early check-in for you and sent the exact pin location above.
                  </div>
                </div>
              </div>

              <footer className="border-t border-zinc-200 p-4 sm:p-5">
                <form className="flex items-end gap-3">
                  <textarea
                    rows={2}
                    placeholder="Write a message"
                    className="max-h-40 min-h-11.5 flex-1 resize-y rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-900"
                  />
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700"
                  >
                    Send
                  </button>
                </form>
              </footer>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
