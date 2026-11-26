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
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
            {/* Chat Window Drawer */}
            {isOpen && (
                <div className="mb-3 w-[340px] sm:w-[375px] max-h-[calc(100vh-100px)] bg-white rounded-xl shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col">
                    {/* Top Header */}
                    <div className="p-4 bg-[#10213F] text-white flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
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
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#16A34A] border-2 border-[#10213F]" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-white truncate">
                                    Manager Support
                                </h3>
                                <p className="text-xs text-[#93C5FD] truncate">
                                    {managerInfo.name} • Direct Chat
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {onNavigate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onNavigate("complaints");
                                    }}
                                    title="Open Report Problem form"
                                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition cursor-pointer"
                                >
                                    Report Problem
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                                title="Minimize chat"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
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
                    <div className="h-80 overflow-y-auto p-4 space-y-3 bg-[#F4F7FB]">
                        {loading && messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                                Loading conversation...
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-3 space-y-3">
                                <div className="w-11 h-11 rounded-xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center">
                                    <svg
                                        className="w-5 h-5"
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
                                    <p className="text-xs font-semibold text-[#172B4D]">
                                        Chat with the Manager
                                    </p>
                                    <p className="text-xs text-[#64748B] leading-relaxed">
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
                                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EAF2FF] text-[#2563EB] border border-[#E2E8F0] hover:border-[#C7DDFD] text-xs font-medium transition cursor-pointer"
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
                                            <span className="text-[11px] font-semibold text-[#64748B] mb-1 px-1">
                                                {m.sender_name} •{" "}
                                                {m.sender_role_label}
                                            </span>
                                        )}
                                        <div
                                            className={`max-w-[82%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                                                isMine
                                                    ? "bg-[#2563EB] text-white rounded-br-sm"
                                                    : "bg-white text-[#172B4D] border border-[#E2E8F0] rounded-bl-sm"
                                            }`}
                                        >
                                            {m.message}
                                        </div>
                                        <span className="text-[10px] text-[#64748B] mt-1 px-1">
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
                        className="p-3 bg-white border-t border-[#E2E8F0] flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Write a message to Manager..."
                            className="flex-1 px-3.5 py-2 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#172B4D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] transition"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || sending}
                            className="w-9 h-9 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#E2E8F0] text-white disabled:text-[#94A3B8] flex items-center justify-center transition shrink-0 cursor-pointer disabled:cursor-not-allowed"
                            title="Send message"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
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

            {/* Floating Customer Support Action Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                title="Customer Support"
                aria-label="Customer Support"
                className="relative w-12 h-12 rounded-full bg-[#10213F] hover:bg-[#2563EB] text-white shadow-md transition-colors duration-150 flex items-center justify-center cursor-pointer shrink-0"
            >
                {isOpen ? (
                    <svg
                        className="w-5 h-5 text-white"
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
                ) : (
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
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                )}

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
