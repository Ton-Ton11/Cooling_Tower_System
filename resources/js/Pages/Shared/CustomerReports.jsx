import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StatusBadge from "../../Components/StatusBadge";
import {
    SUPER_ADMIN_ENDPOINTS,
    extractErrorMessage,
    getInitials,
} from "../../utils/superAdmin";

export default function CustomerReports({
    addToast,
    endpoints,
    onDataChanged,
    initialSubTab = "reports",
}) {
    const ep = endpoints ?? SUPER_ADMIN_ENDPOINTS;

    const [activeSubTab, setActiveSubTab] = useState(initialSubTab); // "reports" | "chat"
    const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Pending" | "Resolved" | "Dismissed"
    const [searchQuery, setSearchQuery] = useState("");

    // Reports State
    const [reports, setReports] = useState([]);
    const [pendingReportsCount, setPendingReportsCount] = useState(0);
    const [loadingReports, setLoadingReports] = useState(true);
    const [expandedReportId, setExpandedReportId] = useState(null);
    const [responseDrafts, setResponseDrafts] = useState({});
    const [updatingReportId, setUpdatingReportId] = useState(null);

    // Chat Threads State
    const [threads, setThreads] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);
    const [activeCustomerId, setActiveCustomerId] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [totalUnreadChats, setTotalUnreadChats] = useState(0);
    const [loadingChat, setLoadingChat] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [sendingChat, setSendingChat] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const chatBottomRef = useRef(null);

    const scrollToChatBottom = useCallback(() => {
        setTimeout(() => {
            if (chatBottomRef.current) {
                chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }, 60);
    }, []);

    const fetchReports = useCallback(
        async (showSpinner = true) => {
            if (!ep.customerReports) return;
            if (showSpinner) setLoadingReports(true);
            try {
                const { data } = await window.axios.get(ep.customerReports);
                const list = Array.isArray(data?.data) ? data.data : [];
                setReports(list);
                setPendingReportsCount(Number(data?.pending_count ?? 0));
            } catch (error) {
                if (showSpinner && addToast) {
                    addToast(
                        extractErrorMessage(
                            error,
                            "Unable to load customer problem reports.",
                        ),
                        "error",
                    );
                }
            } finally {
                if (showSpinner) setLoadingReports(false);
            }
        },
        [ep.customerReports, addToast],
    );

    const fetchChatThreads = useCallback(
        async (targetCustomerId = null, showSpinner = false) => {
            if (!ep.customerChatThreads) return;
            if (showSpinner) setLoadingChat(true);
            try {
                const cid = targetCustomerId ?? activeCustomerId;
                const { data } = await window.axios.get(
                    ep.customerChatThreads,
                    {
                        params: cid ? { customer_id: cid } : {},
                    },
                );
                setThreads(Array.isArray(data?.threads) ? data.threads : []);
                setAllCustomers(
                    Array.isArray(data?.all_customers)
                        ? data.all_customers
                        : [],
                );
                if (data?.active_customer_id) {
                    setActiveCustomerId(Number(data.active_customer_id));
                }
                setChatMessages(
                    Array.isArray(data?.messages) ? data.messages : [],
                );
                setTotalUnreadChats(Number(data?.total_unread ?? 0));
            } catch {
                // ignore background errors
            } finally {
                if (showSpinner) setLoadingChat(false);
            }
        },
        [ep.customerChatThreads, activeCustomerId],
    );

    useEffect(() => {
        fetchReports(true);
        fetchChatThreads(null, true);

        const interval = setInterval(() => {
            fetchReports(false);
            fetchChatThreads(activeCustomerId, false);
        }, 9000);

        return () => clearInterval(interval);
    }, [fetchReports, fetchChatThreads, activeCustomerId]);

    useEffect(() => {
        if (activeSubTab === "chat") {
            scrollToChatBottom();
        }
    }, [activeSubTab, chatMessages.length, scrollToChatBottom]);

    const handleSelectCustomerThread = async (customerId) => {
        setActiveCustomerId(customerId);
        await fetchChatThreads(customerId, true);
        scrollToChatBottom();

        if (ep.markCustomerChatRead) {
            try {
                await window.axios.post(ep.markCustomerChatRead(customerId));
                setThreads((prev) =>
                    prev.map((t) =>
                        t.customer_id === customerId
                            ? { ...t, unread_count: 0 }
                            : t,
                    ),
                );
                onDataChanged?.();
            } catch {
                // ignore
            }
        }
    };

    const handleSendChatMessage = async (e) => {
        e.preventDefault();
        if (!activeCustomerId || !chatInput.trim() || sendingChat) return;

        const body = chatInput.trim();
        setChatInput("");
        setSendingChat(true);

        try {
            const url = ep.sendCustomerChatMessage(activeCustomerId);
            const { data } = await window.axios.post(url, { message: body });
            setThreads(Array.isArray(data?.threads) ? data.threads : []);
            setChatMessages(Array.isArray(data?.messages) ? data.messages : []);
            setTotalUnreadChats(Number(data?.total_unread ?? 0));
            scrollToChatBottom();
            onDataChanged?.();
        } catch (error) {
            setChatInput(body);
            if (addToast) {
                addToast(
                    extractErrorMessage(error, "Failed to send message."),
                    "error",
                );
            }
        } finally {
            setSendingChat(false);
        }
    };

    const handleUpdateReport = async (report, nextStatus) => {
        if (!ep.updateCustomerReport || updatingReportId) return;
        setUpdatingReportId(report.complaint_id);

        const draftResponse =
            responseDrafts[report.complaint_id] !== undefined
                ? responseDrafts[report.complaint_id]
                : report.management_response || "";

        try {
            const { data } = await window.axios.patch(
                ep.updateCustomerReport(report.complaint_id),
                {
                    status: nextStatus,
                    management_response: draftResponse.trim() || null,
                },
            );
            if (addToast) {
                addToast(
                    data?.message ||
                        `Report #${report.complaint_id} marked ${nextStatus}.`,
                    "success",
                );
            }
            setExpandedReportId(null);
            await fetchReports(false);
            await fetchChatThreads(activeCustomerId, false);
            onDataChanged?.();
        } catch (error) {
            if (addToast) {
                addToast(
                    extractErrorMessage(error, "Unable to update report."),
                    "error",
                );
            }
        } finally {
            setUpdatingReportId(null);
        }
    };

    const handleOpenChatForCustomer = (customerId) => {
        setActiveSubTab("chat");
        handleSelectCustomerThread(customerId);
    };

    const filteredReports = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return reports.filter((r) => {
            if (statusFilter !== "All" && r.status !== statusFilter) {
                return false;
            }
            if (!q) return true;
            return (
                String(r.complaint_id).includes(q) ||
                (r.customer_name || "").toLowerCase().includes(q) ||
                (r.complaint_details || "").toLowerCase().includes(q) ||
                (r.service_name || "").toLowerCase().includes(q) ||
                String(r.booking_id || "").includes(q)
            );
        });
    }, [reports, statusFilter, searchQuery]);

    const activeCustomerMeta = useMemo(() => {
        if (!activeCustomerId) return null;
        return (
            threads.find((t) => t.customer_id === activeCustomerId) ||
            allCustomers.find((c) => c.customer_id === activeCustomerId) ||
            null
        );
    }, [activeCustomerId, threads, allCustomers]);

    const filteredThreads = useMemo(() => {
        const q = customerSearch.trim().toLowerCase();
        if (!q) return threads;
        return threads.filter(
            (t) =>
                (t.customer_name || "").toLowerCase().includes(q) ||
                (t.email || "").toLowerCase().includes(q) ||
                (t.last_message || "").toLowerCase().includes(q),
        );
    }, [threads, customerSearch]);

    return (
        <div className="space-y-5 max-w-7xl mx-auto">
            {/* Top Banner */}
            <div
                className="p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                    background:
                        "linear-gradient(135deg, #0E1A33 0%, #1E2F5F 55%, #1D4ED8 100%)",
                }}
            >
                <div className="space-y-1">
                    <h1 className="text-2xl font-extrabold tracking-tight text-white">
                        Customer Reports & Support Chat
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300">
                        Manage customer problem reports and respond to live customer messages.
                    </p>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab("reports")}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                            activeSubTab === "reports"
                                ? "bg-white text-[#0E1A33] shadow-sm"
                                : "text-white hover:bg-white/10"
                        }`}
                    >
                        <span>Problem Reports</span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                pendingReportsCount > 0
                                    ? "bg-rose-500 text-white"
                                    : activeSubTab === "reports"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-white/20 text-white"
                            }`}
                        >
                            {pendingReportsCount} Pending
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSubTab("chat")}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                            activeSubTab === "chat"
                                ? "bg-white text-[#0E1A33] shadow-sm"
                                : "text-white hover:bg-white/10"
                        }`}
                    >
                        <span>Customer Chat</span>
                        {totalUnreadChats > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                                {totalUnreadChats} New
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                SUB-TAB 1: CUSTOMER PROBLEM REPORTS
            ══════════════════════════════════════════════════════════════════ */}
            {activeSubTab === "reports" && (
                <div className="space-y-4">
                    {/* Filter & Search Bar */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {["All", "Pending", "Resolved", "Dismissed"].map(
                                (st) => {
                                    const count =
                                        st === "All"
                                            ? reports.length
                                            : reports.filter(
                                                  (r) => r.status === st,
                                              ).length;
                                    const active = statusFilter === st;
                                    return (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setStatusFilter(st)}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                                active
                                                    ? "bg-[#0E1A33] text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            <span>{st}</span>
                                            <span
                                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                                    active
                                                        ? "bg-white/20 text-white"
                                                        : "bg-slate-200 text-slate-700"
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                },
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search customer, booking, details..."
                                className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64"
                            />
                            <button
                                type="button"
                                onClick={() => fetchReports(true)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
                            >
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* Reports List */}
                    {loadingReports ? (
                        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-xs border border-slate-200/80">
                            Loading customer problem reports...
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-xs border border-slate-200/80">
                            No customer problem reports found.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredReports.map((r) => {
                                const isExpanded =
                                    expandedReportId === r.complaint_id;
                                const draft =
                                    responseDrafts[r.complaint_id] !== undefined
                                        ? responseDrafts[r.complaint_id]
                                        : r.management_response || "";

                                return (
                                    <div
                                        key={r.complaint_id}
                                        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3.5"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold">
                                                        Report #{r.complaint_id}
                                                    </span>
                                                    <span className="text-sm font-extrabold text-slate-900">
                                                        {r.customer_name}
                                                    </span>
                                                    {r.customer_company && (
                                                        <span className="text-[11px] font-semibold text-slate-500">
                                                            ({r.customer_company})
                                                        </span>
                                                    )}
                                                    {r.booking_id && (
                                                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                                                            Booking #{r.booking_id} •{" "}
                                                            {r.service_name}
                                                        </span>
                                                    )}
                                                    <StatusBadge
                                                        status={r.status}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-500">
                                                    Submitted{" "}
                                                    <strong>
                                                        {
                                                            r.complaint_date_formatted
                                                        }
                                                    </strong>{" "}
                                                    ({r.time_ago})
                                                    {r.customer_contact &&
                                                        ` • Contact: ${r.customer_contact}`}
                                                    {r.customer_email &&
                                                        ` • ${r.customer_email}`}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenChatForCustomer(
                                                            r.customer_id,
                                                        )
                                                    }
                                                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5"
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
                                                    <span>Chat Customer</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedReportId(
                                                            isExpanded
                                                                ? null
                                                                : r.complaint_id,
                                                        )
                                                    }
                                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                                                >
                                                    {isExpanded
                                                        ? "Close Action"
                                                        : "Respond / Update Status"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Problem Details */}
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                                            {r.complaint_details}
                                        </div>

                                        {/* Existing Management Response */}
                                        {r.management_response &&
                                            !isExpanded && (
                                                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-extrabold text-emerald-900">
                                                            Management Response
                                                            {r.resolved_by_name
                                                                ? ` (${r.resolved_by_name})`
                                                                : ""}
                                                        </span>
                                                        {r.resolved_at_formatted && (
                                                            <span className="text-[10px] text-emerald-700">
                                                                {
                                                                    r.resolved_at_formatted
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-emerald-950 whitespace-pre-line">
                                                        {r.management_response}
                                                    </p>
                                                </div>
                                            )}

                                        {/* Expandable Response & Status Action Panel */}
                                        {isExpanded && (
                                            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Response / Resolution Note (Sent to Customer Report & Chat)
                                                    </label>
                                                    <textarea
                                                        rows={3}
                                                        value={draft}
                                                        onChange={(e) =>
                                                            setResponseDrafts(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [r.complaint_id]:
                                                                        e.target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        placeholder="Write your resolution or response to the customer..."
                                                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            updatingReportId ===
                                                            r.complaint_id
                                                        }
                                                        onClick={() =>
                                                            handleUpdateReport(
                                                                r,
                                                                "Pending",
                                                            )
                                                        }
                                                        className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer"
                                                    >
                                                        Save as Pending
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            updatingReportId ===
                                                            r.complaint_id
                                                        }
                                                        onClick={() =>
                                                            handleUpdateReport(
                                                                r,
                                                                "Dismissed",
                                                            )
                                                        }
                                                        className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
                                                    >
                                                        Mark Dismissed
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            updatingReportId ===
                                                            r.complaint_id
                                                        }
                                                        onClick={() =>
                                                            handleUpdateReport(
                                                                r,
                                                                "Resolved",
                                                            )
                                                        }
                                                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
                                                    >
                                                        {updatingReportId ===
                                                        r.complaint_id
                                                            ? "Updating..."
                                                            : "✓ Mark Resolved"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SUB-TAB 2: CUSTOMER LIVE SUPPORT CHAT (MANAGER <-> CUSTOMER)
            ══════════════════════════════════════════════════════════════════ */}
            {activeSubTab === "chat" && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
                    {/* Left Column: Customer Conversations List (4 cols) */}
                    <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
                        <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/60">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-800">
                                    Customer Conversations
                                </span>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleSelectCustomerThread(
                                                Number(e.target.value),
                                            );
                                        }
                                    }}
                                    className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                                >
                                    <option value="">+ Message Customer</option>
                                    {allCustomers.map((c) => (
                                        <option
                                            key={c.customer_id}
                                            value={c.customer_id}
                                        >
                                            {c.customer_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={(e) =>
                                    setCustomerSearch(e.target.value)
                                }
                                placeholder="Filter conversations..."
                                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[460px]">
                            {filteredThreads.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400">
                                    No customer chat threads yet. Select{" "}
                                    <strong>+ Message Customer</strong> above to start a conversation.
                                </div>
                            ) : (
                                filteredThreads.map((t) => {
                                    const isSelected =
                                        t.customer_id === activeCustomerId;
                                    return (
                                        <button
                                            key={t.customer_id}
                                            type="button"
                                            onClick={() =>
                                                handleSelectCustomerThread(
                                                    t.customer_id,
                                                )
                                            }
                                            className={`w-full p-3.5 text-left transition flex items-start gap-3 cursor-pointer ${
                                                isSelected
                                                    ? "bg-blue-50/90 border-l-4 border-blue-600"
                                                    : "hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-[#0E1A33] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                                                {getInitials(t.customer_name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-xs font-extrabold text-slate-900 truncate">
                                                        {t.customer_name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {t.time_ago}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                    {t.last_sender_role !==
                                                    "customer"
                                                        ? "You: "
                                                        : ""}
                                                    {t.last_message}
                                                </p>
                                            </div>
                                            {t.unread_count > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shrink-0">
                                                    {t.unread_count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Active Chat Thread (8 cols) */}
                    <div className="md:col-span-8 flex flex-col h-[540px]">
                        {activeCustomerMeta ? (
                            <>
                                {/* Conversation Header */}
                                <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-[#0E1A33] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                                            {getInitials(
                                                activeCustomerMeta.customer_name,
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-extrabold text-slate-900 truncate">
                                                {
                                                    activeCustomerMeta.customer_name
                                                }
                                            </h3>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {activeCustomerMeta.contact_number ||
                                                    activeCustomerMeta.email ||
                                                    "Customer Account"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            fetchChatThreads(
                                                activeCustomerId,
                                                true,
                                            )
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                                    >
                                        ↻ Sync
                                    </button>
                                </div>

                                {/* Messages Stream */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
                                    {loadingChat &&
                                    chatMessages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                            Loading messages...
                                        </div>
                                    ) : chatMessages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                            No messages with{" "}
                                            {activeCustomerMeta.customer_name}{" "}
                                            yet. Send a message below.
                                        </div>
                                    ) : (
                                        chatMessages.map((m) => {
                                            const isStaff = m.is_staff_sender;
                                            return (
                                                <div
                                                    key={m.message_id}
                                                    className={`flex flex-col ${
                                                        isStaff
                                                            ? "items-end"
                                                            : "items-start"
                                                    }`}
                                                >
                                                    <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                                                        {m.sender_name} •{" "}
                                                        {m.sender_role_label}
                                                    </span>
                                                    <div
                                                        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                                                            isStaff
                                                                ? "bg-blue-600 text-white rounded-br-sm"
                                                                : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
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
                                    <div ref={chatBottomRef} />
                                </div>

                                {/* Reply Form */}
                                <form
                                    onSubmit={handleSendChatMessage}
                                    className="p-3.5 bg-white border-t border-slate-100 flex items-center gap-2.5"
                                >
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) =>
                                            setChatInput(e.target.value)
                                        }
                                        placeholder={`Reply to ${activeCustomerMeta.customer_name}...`}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                    />
                                    <button
                                        type="submit"
                                        disabled={
                                            !chatInput.trim() || sendingChat
                                        }
                                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-extrabold transition cursor-pointer disabled:cursor-not-allowed shadow-xs"
                                    >
                                        {sendingChat ? "Sending..." : "Send"}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 p-6 text-center">
                                Select a customer conversation on the left to view and reply to messages.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
