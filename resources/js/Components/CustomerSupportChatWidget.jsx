import { useCallback, useEffect, useRef, useState } from "react";
import { CUSTOMER_ENDPOINTS, extractErrorMessage } from "../utils/superAdmin";

const QUICK_PROMPTS = [
    "Follow up on my booking",
    "Ask about service pricing",
    "Report a concern",
];

export default function CustomerSupportChatWidget({ addToast, onNavigate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [managerInfo, setManagerInfo] = useState({
        name: "Operations Manager",
        role: "Manager",
        status: "Online",
    });
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollBottomRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (scrollBottomRef.current) {
                scrollBottomRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }, 60);
    }, []);

    const markAllRead = useCallback(async () => {
        try {
            await window.axios.post(CUSTOMER_ENDPOINTS.markSupportChatRead);
            setUnreadCount(0);
            setMessages((prev) =>
                prev.map((m) => ({ ...m, is_read_by_customer: true })),
            );
        } catch {
            // ignore
        }
    }, []);

    const fetchChat = useCallback(
        async (showSpinner = false, isCurrentlyOpen = false) => {
            if (showSpinner) setLoading(true);
            try {
                const { data } = await window.axios.get(
                    CUSTOMER_ENDPOINTS.supportChat,
                );
                const list = Array.isArray(data?.messages) ? data.messages : [];
                setMessages(list);
                if (data?.manager_info) {
                    setManagerInfo(data.manager_info);
                }

                const serverUnread = Number(data?.unread_count || 0);
                if (isCurrentlyOpen && serverUnread > 0) {
                    markAllRead();
                } else {
                    setUnreadCount(serverUnread);
                }
            } catch {
                // silently ignore background poll failure
            } finally {
                if (showSpinner) setLoading(false);
            }
        },
        [markAllRead],
    );

    useEffect(() => {
        fetchChat(true, isOpen);
        const interval = setInterval(() => {
            fetchChat(false, isOpen);
        }, 8000);
        return () => clearInterval(interval);
    }, [fetchChat, isOpen]);

    useEffect(() => {
        const handleOpenEvent = () => {
            setIsOpen(true);
        };
        window.addEventListener("open-customer-support-chat", handleOpenEvent);
        return () =>
            window.removeEventListener(
                "open-customer-support-chat",
                handleOpenEvent,
            );
    }, []);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            if (unreadCount > 0) {
                markAllRead();
            }
        }
    }, [isOpen, messages.length, unreadCount, markAllRead, scrollToBottom]);

    const handleSend = async (e, overrideText = null) => {
        if (e) e.preventDefault();
        const body = (overrideText !== null ? overrideText : inputText).trim();
        if (!body || sending) return;

        setSending(true);
        if (overrideText === null) {
            setInputText("");
        }

        try {
            const { data } = await window.axios.post(
                CUSTOMER_ENDPOINTS.sendSupportChat,
                { message: body },
            );
            setMessages(Array.isArray(data?.messages) ? data.messages : []);
            setUnreadCount(0);
            scrollToBottom();
        } catch (error) {
            if (overrideText === null) {
                setInputText(body);
            }
            if (addToast) {
                addToast(
                    extractErrorMessage(error, "Unable to send message."),
                    "error",
                );
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-8 right-4 sm:bottom-9 sm:right-6 z-50 flex flex-col items-end">
                {/* Chat Window Drawer */}
                {isOpen && (
                    <div className="mb-2.5 w-[340px] sm:w-[375px] max-h-[calc(100vh-90px)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-200">
                        {/* Top Header */}
                        <div
                            className="p-4 text-white flex items-center justify-between gap-3 shrink-0"
                            style={{
                                background:
                                    "linear-gradient(135deg, #0E1A33 0%, #1E3A8A 65%, #2563EB 100%)",
                            }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                                    {/* Person Icon */}
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                                        />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0E1A33]" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-extrabold text-white truncate">
                                        Manager Support
                                    </h3>
                                    <p className="text-[11px] text-blue-200 truncate">
                                        {managerInfo.name} • Direct Chat
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {onNavigate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            onNavigate("complaints");
                                        }}
                                        title="Open Report Problem form"
                                        className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-[10px] font-bold text-white transition cursor-pointer"
                                    >
                                        Report Problem
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                                    title="Minimize chat"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2.2"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Messages Stream */}
                        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50/80">
                            {loading && messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                    Loading conversation...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-3 space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.8"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-extrabold text-slate-800">
                                            Chat with the Manager
                                        </p>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            Send a message below for booking assistance, quotation questions, or service concerns.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                                        {QUICK_PROMPTS.map((prompt) => (
                                            <button
                                                key={prompt}
                                                type="button"
                                                onClick={() =>
                                                    handleSend(null, prompt)
                                                }
                                                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                messages.map((m) => {
                                    const isMine = !m.is_staff_sender;
                                    return (
                                        <div
                                            key={m.message_id}
                                            className={`flex flex-col ${
                                                isMine ? "items-end" : "items-start"
                                            }`}
                                        >
                                            {!isMine && (
                                                <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                                                    {m.sender_name} •{" "}
                                                    {m.sender_role_label}
                                                </span>
                                            )}
                                            <div
                                                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                                                    isMine
                                                        ? "bg-blue-600 text-white rounded-br-sm"
                                                        : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-sm"
                                                }`}
                                            >
                                                {m.message}
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                {m.formatted_date}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={scrollBottomRef} />
                        </div>

                        {/* Input Form */}
                        <form
                            onSubmit={(e) => handleSend(e)}
                            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
                        >
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Write a message to Manager..."
                                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim() || sending}
                                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-sm"
                                title="Send message"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2.2"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                                    />
                                </svg>
                            </button>
                        </form>
                    </div>
                )}

                {/* Floating Bottom-Right Customer Service Action Button (Person Icon, Circular FAB, Minimal) */}
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    title="Customer Support"
                    aria-label="Customer Support"
                    className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full text-white shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center cursor-pointer shrink-0"
                    style={{
                        background:
                            "linear-gradient(135deg, #0E1A33 0%, #1D4ED8 100%)",
                        boxShadow: "0 8px 20px -4px rgba(29, 78, 216, 0.45)",
                    }}
                >
                    <div className="relative flex items-center justify-center">
                        {isOpen ? (
                            <svg
                                className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        ) : (
                            /* Person Icon */
                            <svg
                                className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                                />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )}
                    </div>

                    {/* Unread Badge Counter */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Endlessly scrolling / spinning sign fixed at the bottom (not hidden when scrolled) - Compact / Smaller */}
            <div
                className="fixed bottom-0 inset-x-0 z-40 h-6 sm:h-6.5 bg-[#0B1528]/95 backdrop-blur-md border-t border-blue-900/40 text-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.25)] flex items-center overflow-hidden select-none pointer-events-auto"
            >
                <style>{`
                    @keyframes ctEndlessTicker {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .ct-ticker-track {
                        display: inline-flex;
                        white-space: nowrap;
                        will-change: transform;
                        animation: ctEndlessTicker 35s linear infinite;
                    }
                    .ct-ticker-track:hover {
                        animation-play-state: paused;
                    }
                `}</style>
                {/* Spinning sign badge on the left - Compact */}
                <div className="shrink-0 h-full flex items-center gap-1 px-2 sm:px-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white text-[9px] sm:text-[9.5px] font-extrabold uppercase tracking-wider z-10 shadow-sm">
                    <svg
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin [animation-duration:5s]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    >
                        <circle cx="12" cy="12" r="9" strokeDasharray="5 3" />
                        <path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                    </svg>
                    <span className="hidden xs:inline">Inquiries</span>
                </div>
                {/* Continuous marquee track - Smaller font & spacing */}
                <div className="flex-1 overflow-hidden relative flex items-center">
                    <div className="ct-ticker-track">
                        {[0, 1].map((copyIndex) => (
                            <div
                                key={copyIndex}
                                className="inline-flex items-center gap-3 sm:gap-4 pr-6 text-[10px] sm:text-[10.5px] text-slate-300 font-medium shrink-0"
                            >
                                <span className="inline-flex items-center gap-1.5 text-white font-bold tracking-tight">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                    For more questions and inquiries, please contact:
                                </span>
                                <span className="inline-flex items-center gap-1 text-sky-300 font-medium">
                                    <span className="text-slate-400 font-normal">Mobile:</span>
                                    <strong className="text-white font-semibold">0917 877 7670</strong>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="inline-flex items-center gap-1 text-sky-300 font-medium">
                                    <span className="text-slate-400 font-normal">Landline:</span>
                                    <strong className="text-white font-semibold">062 310-2275</strong>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="inline-flex items-center gap-1 text-blue-300 font-medium">
                                    <span className="text-slate-400 font-normal">Facebook:</span>
                                    <strong className="text-white font-semibold">Cooling Tower Airconditioning Services</strong>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="inline-flex items-center gap-1 text-slate-300 font-normal">
                                    <span className="text-slate-400">Office:</span>
                                    <span className="text-slate-200">Door 5, Apostol Bldg., Mayor Jaldon St., Canelar, Zamboanga City</span>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="text-amber-300/90 font-medium text-[9.5px] sm:text-[10px]">
                                    Mon - Sat 8:00 AM - 6:00 PM
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
