import { useCallback, useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import Modal from "../../Components/Modal";
import StatusBadge from "../../Components/StatusBadge";
import {
    HEAD_TECHNICIAN_ENDPOINTS,
    extractErrorMessage,
    formatDateTime,
} from "../../utils/superAdmin";

export default function TeamManagement({ addToast, endpoints, onDataChanged }) {
    const { auth } = usePage().props;
    const isSuperAdmin = Number(auth?.user?.role_id) === 1;

    const ep = endpoints ?? HEAD_TECHNICIAN_ENDPOINTS;
    const [teams, setTeams] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [forceDeleting, setForceDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Create / Edit Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [formData, setFormData] = useState({
        team_name: "",
        leader_id: "",
        description: "",
        status: "Active",
        member_ids: [],
    });

    // Member Search & Filter within Create/Edit Modal
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [memberFilterTab, setMemberFilterTab] = useState("all");

    // Quick Add Member Modal State (Directly from Team Card)
    const [quickAddModal, setQuickAddModal] = useState(null);
    const [quickAddData, setQuickAddData] = useState({
        technician_id: "",
        role_in_team: "Member",
    });
    const [quickAddSearch, setQuickAddSearch] = useState("");
    const [quickAdding, setQuickAdding] = useState(false);

    // Archive Modal State
    const [archiveModal, setArchiveModal] = useState(null);
    const [forceDeleteModal, setForceDeleteModal] = useState(null);
    const [teamFilterStatus, setTeamFilterStatus] = useState("all"); // 'all' | 'Active' | 'Archived'

    const fetchTeams = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);
            try {
                const endpoint = ep.teams || "/api/shared/teams";
                const { data } = await window.axios.get(endpoint);
                setTeams(Array.isArray(data?.data) ? data.data : []);

                let techs = Array.isArray(data?.technicians)
                    ? data.technicians
                    : [];

                // If not in index payload, fetch from availableTechnicians endpoint
                if (techs.length === 0 && ep.availableTechnicians) {
                    try {
                        const techRes = await window.axios.get(
                            ep.availableTechnicians,
                        );
                        techs = Array.isArray(techRes?.data?.technicians)
                            ? techRes.data.technicians
                            : Array.isArray(techRes?.data?.data)
                              ? techRes.data.data
                              : [];
                    } catch {
                        // ignore fallback error
                    }
                }

                setTechnicians(techs);
            } catch (error) {
                addToast(
                    extractErrorMessage(
                        error,
                        "Unable to load technician teams.",
                    ),
                    "error",
                );
            } finally {
                setLoading(false);
            }
        },
        [addToast, ep],
    );

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const openCreateModal = () => {
        setEditingTeam(null);
        setFormData({
            team_name: "",
            leader_id: "",
            description: "",
            status: "Active",
            member_ids: [],
        });
        setMemberSearchQuery("");
        setMemberFilterTab("all");
        setModalOpen(true);
    };

    const openEditModal = (team) => {
        setEditingTeam(team);
        setFormData({
            team_name: team.team_name,
            leader_id: team.leader_id ? String(team.leader_id) : "",
            description: team.description || "",
            status: team.status || "Active",
            member_ids: Array.isArray(team.members)
                ? team.members.map((m) => m.technician_id || m.user_id)
                : [],
        });
        setMemberSearchQuery("");
        setMemberFilterTab("all");
        setModalOpen(true);
    };

    const toggleMember = (techId) => {
        const tech = technicians.find((t) => t.user_id === techId);
        const otherTeams = (tech?.teams || []).filter(
            (t) => !editingTeam || t.team_id !== editingTeam.team_id,
        );

        if (otherTeams.length > 0 && !formData.member_ids.includes(techId)) {
            addToast(
                `Cannot assign ${tech?.full_name || tech?.name || "this technician"}: already assigned to "${otherTeams[0].team_name}". Each technician can only belong to one squad at a time.`,
                "error",
            );
            return;
        }

        setFormData((prev) => {
            const exists = prev.member_ids.includes(techId);
            const updated = exists
                ? prev.member_ids.filter((id) => id !== techId)
                : [...prev.member_ids, techId];
            return {
                ...prev,
                member_ids: updated,
            };
        });
    };

    const handleSubmit = async () => {
        if (!formData.team_name.trim()) {
            addToast("Team name is required.", "error");
            return;
        }

        setSaving(true);
        try {
            const endpoint = ep.teams || "/api/shared/teams";
            const payload = {
                team_name: formData.team_name,
                leader_id: formData.leader_id ? Number(formData.leader_id) : null,
                description: formData.description,
                status: formData.status,
                member_ids: formData.member_ids,
            };

            if (editingTeam) {
                const updateUrl = ep.updateTeam
                    ? ep.updateTeam(editingTeam.team_id)
                    : `${endpoint}/${editingTeam.team_id}`;
                const { data } = await window.axios.patch(updateUrl, payload);
                addToast(data?.message || "Team updated successfully.");
            } else {
                const { data } = await window.axios.post(endpoint, payload);
                addToast(data?.message || "Team created successfully.");
            }

            setModalOpen(false);
            await fetchTeams(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to save technician team."),
                "error",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async () => {
        if (!archiveModal || deleting) return;
        setDeleting(true);
        try {
            const endpoint = ep.teams || "/api/shared/teams";
            const archiveUrl = ep.archiveTeam
                ? ep.archiveTeam(archiveModal.team_id)
                : `${endpoint}/${archiveModal.team_id}/archive`;
            const { data } = await window.axios.patch(archiveUrl);
            addToast(data?.message || "Technician squad archived successfully.");
            setArchiveModal(null);
            await fetchTeams(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to archive squad."),
                "error",
            );
        } finally {
            setDeleting(false);
        }
    };

    const handleForceDelete = async () => {
        if (!forceDeleteModal || forceDeleting) return;
        setForceDeleting(true);
        try {
            const deleteUrl = ep.forceDeleteTeam
                ? ep.forceDeleteTeam(forceDeleteModal.team_id)
                : `/super-admin/teams/${forceDeleteModal.team_id}/force-delete`;
            const { data } = await window.axios.delete(deleteUrl);
            addToast(data?.message || "Technician squad permanently deleted.", "success");
            setForceDeleteModal(null);
            await fetchTeams(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to permanently delete squad."),
                "error",
            );
        } finally {
            setForceDeleting(false);
        }
    };

    const handleRestore = async (team) => {
        try {
            const endpoint = ep.teams || "/api/shared/teams";
            const restoreUrl = ep.restoreTeam
                ? ep.restoreTeam(team.team_id)
                : `${endpoint}/${team.team_id}/restore`;
            const { data } = await window.axios.patch(restoreUrl);
            addToast(data?.message || `Squad "${team.team_name}" restored to active status.`);
            await fetchTeams(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(error, "Unable to restore squad."),
                "error",
            );
        }
    };

    const filteredTeams = useMemo(() => {
        return teams.filter((t) => {
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch = !q ||
                t.team_name.toLowerCase().includes(q) ||
                (t.leader_name && t.leader_name.toLowerCase().includes(q)) ||
                (t.description && t.description.toLowerCase().includes(q));

            const matchesStatus =
                teamFilterStatus === "all"
                    ? true
                    : teamFilterStatus === "Active"
                    ? t.status === "Active"
                    : t.status === "Archived";

            return matchesSearch && matchesStatus;
        });
    }, [teams, searchQuery, teamFilterStatus]);

    const activeCount = useMemo(
        () => teams.filter((t) => t.status === "Active").length,
        [teams],
    );

    const archivedCount = useMemo(
        () => teams.filter((t) => t.status === "Archived").length,
        [teams],
    );

    const unassignedCount = useMemo(
        () =>
            technicians.filter(
                (t) => !Array.isArray(t.teams) || t.teams.length === 0,
            ).length,
        [technicians],
    );

    const totalMembersAssigned = useMemo(() => {
        const uniqueTechIds = new Set();
        teams.forEach((t) => {
            if (Array.isArray(t.members)) {
                t.members.forEach((m) =>
                    uniqueTechIds.add(m.technician_id || m.user_id),
                );
            }
        });
        return uniqueTechIds.size;
    }, [teams]);

    // Filtered technicians for the Create/Edit Team Modal
    const filteredModalTechnicians = useMemo(() => {
        let list = technicians;

        if (memberFilterTab === "selected") {
            list = list.filter((t) =>
                formData.member_ids.includes(t.user_id),
            );
        } else if (memberFilterTab === "unassigned") {
            list = list.filter(
                (t) => !Array.isArray(t.teams) || t.teams.length === 0,
            );
        } else if (memberFilterTab === "head") {
            list = list.filter((t) => t.is_head_technician);
        }

        const q = memberSearchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (t) =>
                    (t.full_name || t.name || "")
                        .toLowerCase()
                        .includes(q) ||
                    (t.email || "").toLowerCase().includes(q) ||
                    (t.contact_number || "").toLowerCase().includes(q) ||
                    String(t.user_id).includes(q),
            );
        }

        return list;
    }, [technicians, memberFilterTab, memberSearchQuery, formData.member_ids]);

    // Available technicians for Quick Add Modal (strictly unassigned technicians who do not have any squad)
    const quickAddAvailableTechnicians = useMemo(() => {
        if (!quickAddModal) return [];

        let list = technicians.filter(
            (t) => !Array.isArray(t.teams) || t.teams.length === 0,
        );

        const q = quickAddSearch.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (t) =>
                    (t.full_name || t.name || "")
                        .toLowerCase()
                        .includes(q) ||
                    (t.email || "").toLowerCase().includes(q) ||
                    (t.contact_number || "").toLowerCase().includes(q) ||
                    String(t.user_id).includes(q),
            );
        }

        return list;
    }, [technicians, quickAddModal, quickAddSearch]);

    // Quick Add Single Member to Team
    const handleQuickAddMember = async () => {
        if (!quickAddModal || !quickAddData.technician_id || quickAdding)
            return;
        setQuickAdding(true);
        try {
            const techId = Number(quickAddData.technician_id);
            if (ep.addTeamMember) {
                const url = ep.addTeamMember(quickAddModal.team_id);
                const { data } = await window.axios.post(url, {
                    technician_id: techId,
                    role_in_team: quickAddData.role_in_team,
                });
                addToast(
                    data?.message ||
                        "Technician added to squad successfully.",
                );
            } else {
                const existingIds = Array.isArray(quickAddModal.members)
                    ? quickAddModal.members.map(
                          (m) => m.technician_id || m.user_id,
                      )
                    : [];
                const newIds = Array.from(
                    new Set([...existingIds, techId]),
                );
                const endpoint = ep.teams || "/api/shared/teams";
                const updateUrl = ep.updateTeam
                    ? ep.updateTeam(quickAddModal.team_id)
                    : `${endpoint}/${quickAddModal.team_id}`;
                const { data } = await window.axios.patch(updateUrl, {
                    team_name: quickAddModal.team_name,
                    member_ids: newIds,
                });
                addToast(
                    data?.message ||
                        "Technician added to squad successfully.",
                );
            }

            setQuickAddModal(null);
            setQuickAddData({ technician_id: "", role_in_team: "Member" });
            setQuickAddSearch("");
            await fetchTeams(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    "Unable to add technician to team.",
                ),
                "error",
            );
        } finally {
            setQuickAdding(false);
        }
    };

    // Quick Remove Single Member from Team
    const handleQuickRemoveMember = async (team, techId, techName) => {
        if (
            !window.confirm(
                `Are you sure you want to remove ${techName} from ${team.team_name}?`,
            )
        ) {
            return;
        }
        try {
            if (ep.removeTeamMember) {
                const url = ep.removeTeamMember(team.team_id, techId);
                const { data } = await window.axios.delete(url);
                addToast(data?.message || `Removed ${techName} from squad.`);
            } else {
                const existingIds = Array.isArray(team.members)
                    ? team.members
                          .map((m) => m.technician_id || m.user_id)
                          .filter((id) => id !== techId)
                    : [];
                const endpoint = ep.teams || "/api/shared/teams";
                const updateUrl = ep.updateTeam
                    ? ep.updateTeam(team.team_id)
                    : `${endpoint}/${team.team_id}`;
                const { data } = await window.axios.patch(updateUrl, {
                    team_name: team.team_name,
                    member_ids: existingIds,
                });
                addToast(data?.message || `Removed ${techName} from squad.`);
            }

            await fetchTeams(false);
            onDataChanged?.();
        } catch (error) {
            addToast(
                extractErrorMessage(
                    error,
                    "Unable to remove technician from team.",
                ),
                "error",
            );
        }
    };

    return (
        <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title font-display">
                        Technician Team Management
                    </h1>
                    <p className="page-subtitle">
                        Organize technicians into dynamic teams, assign squad leaders, and coordinate field assignments
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button className="btn-secondary" onClick={() => fetchTeams()}>
                        Refresh
                    </button>
                    <button className="btn-primary" onClick={openCreateModal}>
                        + Create New Team
                    </button>
                </div>
            </div>

            {/* Quick Metrics Banner */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 14,
                    marginBottom: 20,
                }}
            >
                <div className="card" style={{ padding: 16 }}>
                    <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Total Squads</span>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2F5F", marginTop: 4 }}>{teams.length}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Active Squads</span>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981", marginTop: 4 }}>{activeCount}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Archived Squads</span>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#D97706", marginTop: 4 }}>{archivedCount}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Techs in Teams</span>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#3F7DFF", marginTop: 4 }}>{totalMembersAssigned}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Unassigned Techs</span>
                    <div style={{ fontSize: 24, fontWeight: 700, color: unassignedCount > 0 ? "#10B981" : "#6B7280", marginTop: 4 }}>
                        {unassignedCount} <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>/ {technicians.length}</span>
                    </div>
                </div>
            </div>

            {/* Teams Grid / List Card */}
            <div className="card" style={{ padding: 20 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                        flexWrap: "wrap",
                        gap: 10,
                    }}
                >
                    <p className="section-label" style={{ margin: 0 }}>
                        Active Squads & Rosters
                    </p>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <select
                            className="input-field"
                            style={{ maxWidth: 150, padding: "7px 12px", fontSize: 13 }}
                            value={teamFilterStatus}
                            onChange={(e) => setTeamFilterStatus(e.target.value)}
                        >
                            <option value="all">All Squads ({teams.length})</option>
                            <option value="Active">Active ({activeCount})</option>
                            <option value="Archived">Archived ({archivedCount})</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Search squads by name or leader..."
                            className="input-field"
                            style={{ maxWidth: 260, padding: "7px 12px", fontSize: 13 }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: 24, color: "#6B7280", background: "#F9FAFB", borderRadius: 12 }}>
                        Loading technician teams...
                    </div>
                ) : filteredTeams.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#6B7280", background: "#F9FAFB", borderRadius: 12 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                        <p style={{ fontWeight: 600, margin: "0 0 4px" }}>No technician teams found</p>
                        <p style={{ fontSize: 12, margin: 0 }}>Create a new team to group regular technicians under a squad leader.</p>
                    </div>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                            gap: 16,
                        }}
                    >
                        {filteredTeams.map((team) => (
                            <div
                                key={team.team_id}
                                style={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 14,
                                    padding: 16,
                                    background: "#FFFFFF",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <div>
                                            <h3
                                                style={{
                                                    margin: 0,
                                                    fontSize: 16,
                                                    fontWeight: 700,
                                                    color: "#1E2F5F",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <span>👥</span>
                                                <span>{team.team_name}</span>
                                            </h3>
                                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                                                ID #{team.team_id} · Created {formatDateTime(team.created_at)}
                                            </span>
                                        </div>
                                        <StatusBadge status={team.status} />
                                    </div>

                                    {team.description && (
                                        <p
                                            style={{
                                                fontSize: 12,
                                                color: "#6B7280",
                                                margin: "0 0 12px",
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {team.description}
                                        </p>
                                    )}

                                    {/* Leader Badge */}
                                    <div
                                        style={{
                                            background: "#F8FAFC",
                                            border: "1px solid #E2E8F0",
                                            borderRadius: 8,
                                            padding: "8px 10px",
                                            marginBottom: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <span style={{ fontSize: 14 }}>⭐</span>
                                        <div style={{ fontSize: 12 }}>
                                            <span style={{ color: "#64748B", fontSize: 10, textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                                Team Leader
                                            </span>
                                            <strong style={{ color: "#1E2F5F" }}>
                                                {team.leader_name || "Unassigned"}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* Members Roster */}
                                    <div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#6B7280",
                                                textTransform: "uppercase",
                                                marginBottom: 6,
                                            }}
                                        >
                                            <span>Team Members</span>
                                            <span>{team.members?.length || 0} Technicians</span>
                                        </div>

                                        <div
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 6,
                                                minHeight: 32,
                                            }}
                                        >
                                            {Array.isArray(team.members) && team.members.length > 0 ? (
                                                team.members.map((member) => {
                                                    const mId =
                                                        member.technician_id ||
                                                        member.user_id;
                                                    const mName =
                                                        member.full_name ||
                                                        member.name;
                                                    const isLead =
                                                        member.role_in_team ===
                                                            "Lead" ||
                                                        member.role_in_team ===
                                                            "Leader";

                                                    return (
                                                        <span
                                                            key={mId}
                                                            style={{
                                                                fontSize: 11,
                                                                padding:
                                                                    "3px 8px",
                                                                borderRadius: 6,
                                                                background:
                                                                    isLead
                                                                        ? "#EFF6FF"
                                                                        : "#F3F4F6",
                                                                color: isLead
                                                                    ? "#1E40AF"
                                                                    : "#374151",
                                                                border: `1px solid ${
                                                                    isLead
                                                                        ? "#BFDBFE"
                                                                        : "#E5E7EB"
                                                                }`,
                                                                display:
                                                                    "inline-flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: 4,
                                                            }}
                                                        >
                                                            <span>
                                                                {isLead
                                                                    ? "👑"
                                                                    : "🔧"}
                                                            </span>
                                                            <span>{mName}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleQuickRemoveMember(
                                                                        team,
                                                                        mId,
                                                                        mName,
                                                                    )
                                                                }
                                                                title={`Remove ${mName} from squad`}
                                                                style={{
                                                                    background:
                                                                        "none",
                                                                    border: "none",
                                                                    color: "#9CA3AF",
                                                                    cursor: "pointer",
                                                                    fontSize: 11,
                                                                    padding:
                                                                        "0 2px",
                                                                    lineHeight: 1,
                                                                    borderRadius: 3,
                                                                    display:
                                                                        "inline-flex",
                                                                    alignItems:
                                                                        "center",
                                                                }}
                                                                onMouseEnter={(
                                                                    e,
                                                                ) =>
                                                                    (e.target.style.color =
                                                                        "#EF4444")
                                                                }
                                                                onMouseLeave={(
                                                                    e,
                                                                ) =>
                                                                    (e.target.style.color =
                                                                        "#9CA3AF")
                                                                }
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
                                                    No members assigned yet
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems: "center",
                                        gap: 8,
                                        marginTop: 16,
                                        paddingTop: 12,
                                        borderTop: "1px solid #F3F4F6",
                                    }}
                                >
                                    {team.status !== "Archived" ? (
                                        <button
                                            className="btn-primary"
                                            style={{
                                                padding: "5px 12px",
                                                fontSize: 12,
                                            }}
                                            onClick={() => {
                                                setQuickAddModal(team);
                                                setQuickAddData({
                                                    technician_id: "",
                                                    role_in_team: "Member",
                                                });
                                                setQuickAddSearch("");
                                            }}
                                        >
                                            + Add Tech
                                        </button>
                                    ) : (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: "#D97706",
                                                fontWeight: 600,
                                                background: "#FEF3C7",
                                                padding: "4px 8px",
                                                borderRadius: 6,
                                            }}
                                        >
                                            📦 Archived Squad
                                        </span>
                                    )}
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                            className="btn-secondary"
                                            style={{
                                                padding: "5px 10px",
                                                fontSize: 12,
                                            }}
                                            onClick={() => openEditModal(team)}
                                        >
                                            ✏️ Edit
                                        </button>
                                        {team.status === "Archived" ? (
                                            <>
                                                <button
                                                    className="btn-secondary"
                                                    style={{
                                                        padding: "5px 10px",
                                                        fontSize: 12,
                                                        color: "#059669",
                                                        borderColor: "#A7F3D0",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 4,
                                                    }}
                                                    onClick={() => handleRestore(team)}
                                                    title="Restore this squad to active status"
                                                >
                                                    <span>🔄</span>
                                                    <span>Restore</span>
                                                </button>
                                                {isSuperAdmin && (
                                                    <button
                                                        className="btn-secondary"
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: 12,
                                                            color: "#DC2626",
                                                            borderColor: "#FECACA",
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 4,
                                                        }}
                                                        onClick={() => setForceDeleteModal(team)}
                                                        title="Permanently delete this squad from database (Super Admin only)"
                                                    >
                                                        <span>🗑️</span>
                                                        <span>Delete</span>
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                className="btn-secondary"
                                                style={{
                                                    padding: "5px 10px",
                                                    fontSize: 12,
                                                    color: "#D97706",
                                                    borderColor: "#FDE68A",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                                onClick={() => setArchiveModal(team)}
                                                title="Archive this squad and release technicians"
                                            >
                                                <span>📦</span>
                                                <span>Archive</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create / Edit Team Modal */}
            <Modal
                open={modalOpen}
                title={editingTeam ? `Edit Team: ${editingTeam.team_name}` : "Create New Technician Team"}
                message="Group regular technicians under a squad leader for live service assignments."
                confirmLabel={saving ? "Saving..." : editingTeam ? "Update Team" : "Create Team"}
                confirmDisabled={saving || !formData.team_name.trim()}
                maxWidth={600}
                onConfirm={handleSubmit}
                onCancel={() => !saving && setModalOpen(false)}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                            Team Name *
                        </label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Alpha Cooling Squad, Delta AC Specialists"
                            value={formData.team_name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, team_name: e.target.value }))}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                                Squad Leader (Optional)
                            </label>
                            <select
                                className="input-field"
                                value={formData.leader_id}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData((prev) => {
                                        const newMemberIds = val && !prev.member_ids.includes(Number(val))
                                            ? [...prev.member_ids, Number(val)]
                                            : prev.member_ids;
                                        return {
                                            ...prev,
                                            leader_id: val,
                                            member_ids: newMemberIds,
                                        };
                                    });
                                }}
                            >
                                <option value="">No Squad Leader (Unassigned)</option>
                                {technicians.map((tech) => {
                                    const otherTeams = (tech.teams || []).filter(
                                        (t) => !editingTeam || t.team_id !== editingTeam.team_id,
                                    );
                                    const isAssignedElsewhere = otherTeams.length > 0;
                                    return (
                                        <option
                                            key={tech.user_id}
                                            value={tech.user_id}
                                            disabled={isAssignedElsewhere}
                                        >
                                            {tech.full_name || tech.name} {tech.is_head_technician ? "⭐ (Head Tech)" : ""}
                                            {isAssignedElsewhere
                                                ? ` — (Assigned to: ${otherTeams.map((t) => t.team_name).join(", ")}) [Unavailable]`
                                                : ` — ID #${tech.user_id}`}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                                Squad Status
                            </label>
                            <select
                                className="input-field"
                                value={formData.status}
                                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                            Description / Specialization
                        </label>
                        <textarea
                            className="input-field"
                            rows={2}
                            placeholder="e.g. Specializes in commercial cooling tower overhauls and water treatment."
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    {/* Member Selection with Search and Filter */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <label className="section-label" style={{ margin: 0 }}>
                                Assign Technicians to Squad
                            </label>
                            <span style={{ fontSize: 11, color: "#3F7DFF", fontWeight: 600 }}>
                                {formData.member_ids.length} selected
                            </span>
                        </div>

                        {/* Selected Members Chips */}
                        {formData.member_ids.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 6,
                                    marginBottom: 10,
                                    padding: 8,
                                    background: "#EFF6FF",
                                    borderRadius: 8,
                                    border: "1px solid #BFDBFE",
                                    maxHeight: 90,
                                    overflowY: "auto",
                                }}
                            >
                                {formData.member_ids.map((id) => {
                                    const memberTech = technicians.find((t) => t.user_id === id);
                                    const isLeader = Number(formData.leader_id) === id;
                                    const displayName = memberTech
                                        ? memberTech.full_name || memberTech.name
                                        : `ID #${id}`;

                                    return (
                                        <span
                                            key={id}
                                            style={{
                                                fontSize: 11,
                                                background: "#FFFFFF",
                                                border: "1px solid #93C5FD",
                                                padding: "3px 8px",
                                                borderRadius: 14,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 6,
                                                color: "#1E40AF",
                                                fontWeight: 600,
                                            }}
                                        >
                                            <span>{isLeader ? "👑" : "🔧"}</span>
                                            <span>{displayName}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMember(id);
                                                }}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "#EF4444",
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    padding: 0,
                                                    lineHeight: 1,
                                                }}
                                                title="Remove member"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {/* Search Input & Filter Tabs */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ position: "relative", marginBottom: 8 }}>
                                <span
                                    style={{
                                        position: "absolute",
                                        left: 10,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "#9CA3AF",
                                        fontSize: 13,
                                        pointerEvents: "none",
                                    }}
                                >
                                    🔍
                                </span>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Search technician by name, email, or ID..."
                                    value={memberSearchQuery}
                                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                                    style={{
                                        paddingLeft: 30,
                                        paddingRight: memberSearchQuery ? 26 : 10,
                                        paddingTop: 6,
                                        paddingBottom: 6,
                                        fontSize: 12,
                                    }}
                                />
                                {memberSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setMemberSearchQuery("")}
                                        style={{
                                            position: "absolute",
                                            right: 8,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            color: "#9CA3AF",
                                            cursor: "pointer",
                                            fontSize: 12,
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 6,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <div style={{ display: "flex", gap: 4 }}>
                                    {[
                                        { id: "all", label: `All (${technicians.length})` },
                                        { id: "selected", label: `Selected (${formData.member_ids.length})` },
                                        {
                                            id: "unassigned",
                                            label: `Unassigned (${
                                                technicians.filter(
                                                    (t) =>
                                                        !Array.isArray(t.teams) ||
                                                        t.teams.length === 0,
                                                ).length
                                            })`,
                                        },
                                        {
                                            id: "head",
                                            label: `Head Techs (${
                                                technicians.filter((t) => t.is_head_technician).length
                                            })`,
                                        },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setMemberFilterTab(tab.id)}
                                            style={{
                                                padding: "3px 8px",
                                                fontSize: 11,
                                                borderRadius: 6,
                                                border: "1px solid",
                                                borderColor:
                                                    memberFilterTab === tab.id ? "#3F7DFF" : "#E5E7EB",
                                                background:
                                                    memberFilterTab === tab.id ? "#EFF6FF" : "#F9FAFB",
                                                color:
                                                    memberFilterTab === tab.id ? "#1D4ED8" : "#4B5563",
                                                fontWeight: memberFilterTab === tab.id ? 600 : 400,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: "flex", gap: 6 }}>
                                    {filteredModalTechnicians.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const selectableFilteredIds = filteredModalTechnicians
                                                    .filter((t) => {
                                                        const otherTeams = (t.teams || []).filter(
                                                            (tm) => !editingTeam || tm.team_id !== editingTeam.team_id,
                                                        );
                                                        return otherTeams.length === 0 || formData.member_ids.includes(t.user_id);
                                                    })
                                                    .map((t) => t.user_id);

                                                setFormData((prev) => ({
                                                    ...prev,
                                                    member_ids: Array.from(
                                                        new Set([...prev.member_ids, ...selectableFilteredIds]),
                                                    ),
                                                }));
                                            }}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#3F7DFF",
                                                fontSize: 11,
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                padding: 0,
                                            }}
                                        >
                                            + Select Filtered
                                        </button>
                                    )}
                                    {formData.member_ids.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData((prev) => ({ ...prev, member_ids: [] }))
                                            }
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#EF4444",
                                                fontSize: 11,
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                padding: 0,
                                            }}
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Technicians List */}
                        <div
                            style={{
                                maxHeight: 200,
                                overflowY: "auto",
                                border: "1px solid #E5E7EB",
                                borderRadius: 10,
                                padding: 8,
                                background: "#F9FAFB",
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                            }}
                        >
                            {technicians.length === 0 ? (
                                <p style={{ fontSize: 12, color: "#9CA3AF", margin: "16px 0", textAlign: "center" }}>
                                    No active technicians available in database.
                                </p>
                            ) : filteredModalTechnicians.length === 0 ? (
                                <p style={{ fontSize: 12, color: "#9CA3AF", margin: "16px 0", textAlign: "center" }}>
                                    {memberSearchQuery
                                        ? `No technicians match "${memberSearchQuery}".`
                                        : "No technicians match this filter."}
                                </p>
                            ) : (
                                filteredModalTechnicians.map((tech) => {
                                    const isSelected = formData.member_ids.includes(tech.user_id);
                                    const isLeader = Number(formData.leader_id) === tech.user_id;
                                    const currentTeams = Array.isArray(tech.teams) ? tech.teams : [];
                                    const otherTeams = currentTeams.filter(
                                        (t) => !editingTeam || t.team_id !== editingTeam.team_id,
                                    );
                                    const isAssignedElsewhere = otherTeams.length > 0;

                                    return (
                                        <div
                                            key={tech.user_id}
                                            onClick={() => toggleMember(tech.user_id)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                background: isSelected
                                                    ? "#F0FDF4"
                                                    : isAssignedElsewhere
                                                        ? "#F8FAFC"
                                                        : "#FFFFFF",
                                                border: `1px solid ${
                                                    isSelected
                                                        ? "#86EFAC"
                                                        : isAssignedElsewhere
                                                            ? "#E2E8F0"
                                                            : "#E5E7EB"
                                                }`,
                                                cursor: isAssignedElsewhere ? "not-allowed" : "pointer",
                                                opacity: isAssignedElsewhere ? 0.65 : 1,
                                                transition: "all 0.15s ease",
                                            }}
                                            title={
                                                isAssignedElsewhere
                                                    ? `Already assigned to ${otherTeams.map((t) => t.team_name).join(", ")}. Technicians can only belong to one squad.`
                                                    : ""
                                            }
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isAssignedElsewhere}
                                                    onChange={() => {}}
                                                    style={{
                                                        cursor: isAssignedElsewhere ? "not-allowed" : "pointer",
                                                        width: 15,
                                                        height: 15,
                                                    }}
                                                />
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                                color: isAssignedElsewhere ? "#64748B" : "#1E2F5F",
                                                            }}
                                                        >
                                                            {tech.full_name || tech.name}
                                                        </span>
                                                        {tech.is_head_technician && (
                                                            <span style={{ fontSize: 10, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>
                                                                Head Tech
                                                            </span>
                                                        )}
                                                        {isLeader && (
                                                            <span style={{ fontSize: 10, background: "#FEF3C7", color: "#92400E", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>
                                                                👑 Leader
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                                                        {tech.email} · {tech.contact_number || "No contact"} · ID #{tech.user_id}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {isAssignedElsewhere ? (
                                                    <span
                                                        style={{
                                                            fontSize: 10,
                                                            background: "#FEE2E2",
                                                            color: "#991B1B",
                                                            padding: "3px 8px",
                                                            borderRadius: 6,
                                                            fontWeight: 600,
                                                            border: "1px solid #FECACA",
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 4,
                                                        }}
                                                    >
                                                        🔒 In {otherTeams.map((t) => t.team_name).join(", ")}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span style={{ fontSize: 10, background: "#ECFDF5", color: "#065F46", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                                            Available
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                color: isSelected ? "#15803D" : "#3F7DFF",
                                                                padding: "3px 8px",
                                                                borderRadius: 6,
                                                                background: isSelected ? "#DCFCE7" : "#EFF6FF",
                                                            }}
                                                        >
                                                            {isSelected ? "✓ Added" : "+ Add"}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Quick Add Technician Modal */}
            <Modal
                open={!!quickAddModal}
                title={`Add Technician to: ${quickAddModal?.team_name}`}
                message="Select an active technician user from the searchable list below to assign to this squad."
                confirmLabel={quickAdding ? "Adding..." : "Add to Squad"}
                confirmDisabled={quickAdding || !quickAddData.technician_id}
                maxWidth={520}
                onConfirm={handleQuickAddMember}
                onCancel={() => !quickAdding && setQuickAddModal(null)}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Notice if no technicians are free */}
                    {unassignedCount === 0 && (
                        <div
                            style={{
                                background: "#FFFBEB",
                                border: "1px solid #FDE68A",
                                color: "#92400E",
                                padding: "10px 12px",
                                borderRadius: 8,
                                fontSize: 12,
                                lineHeight: 1.4,
                            }}
                        >
                            ⚠️ <strong>All active technicians are currently assigned to squads.</strong> Each technician can only belong to one squad at a time. To add someone to this team, first remove them from their current squad.
                        </div>
                    )}

                    {/* Search Input */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <label className="section-label" style={{ margin: 0 }}>
                                Search & Select Unassigned Technician *
                            </label>
                            <span style={{ fontSize: 11, color: unassignedCount > 0 ? "#10B981" : "#9CA3AF", fontWeight: 600 }}>
                                {unassignedCount} available in database
                            </span>
                        </div>
                        <div style={{ position: "relative", marginBottom: 8 }}>
                            <span
                                style={{
                                    position: "absolute",
                                    left: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#9CA3AF",
                                    fontSize: 13,
                                    pointerEvents: "none",
                                }}
                            >
                                🔍
                            </span>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Search unassigned tech by name, email, or ID..."
                                value={quickAddSearch}
                                onChange={(e) => setQuickAddSearch(e.target.value)}
                                style={{
                                    paddingLeft: 30,
                                    paddingRight: quickAddSearch ? 26 : 10,
                                    paddingTop: 7,
                                    paddingBottom: 7,
                                    fontSize: 13,
                                }}
                            />
                            {quickAddSearch && (
                                <button
                                    type="button"
                                    onClick={() => setQuickAddSearch("")}
                                    style={{
                                        position: "absolute",
                                        right: 8,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        color: "#9CA3AF",
                                        cursor: "pointer",
                                        fontSize: 12,
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Dropdown Select */}
                        <select
                            className="input-field"
                            value={quickAddData.technician_id}
                            onChange={(e) =>
                                setQuickAddData((prev) => ({
                                    ...prev,
                                    technician_id: e.target.value,
                                }))
                            }
                            style={{ fontSize: 13, padding: "8px 12px" }}
                        >
                            <option value="">
                                {unassignedCount === 0
                                    ? "All active technicians already belong to a squad"
                                    : quickAddAvailableTechnicians.length === 0
                                        ? `No unassigned technicians match "${quickAddSearch}"`
                                        : `-- Select an Unassigned Technician (${quickAddAvailableTechnicians.length} available) --`}
                            </option>
                            {quickAddAvailableTechnicians.map((tech) => (
                                <option key={tech.user_id} value={tech.user_id}>
                                    {tech.full_name || tech.name} {tech.is_head_technician ? "⭐ [Head Tech]" : ""} · ID #{tech.user_id} (Available)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Role in Team */}
                    <div>
                        <label className="section-label" style={{ marginBottom: 4, display: "block" }}>
                            Role in Squad
                        </label>
                        <select
                            className="input-field"
                            value={quickAddData.role_in_team}
                            onChange={(e) =>
                                setQuickAddData((prev) => ({
                                    ...prev,
                                    role_in_team: e.target.value,
                                }))
                            }
                            style={{ fontSize: 13, padding: "8px 12px" }}
                        >
                            <option value="Member">Regular Member</option>
                            <option value="Lead">Squad Leader</option>
                        </select>
                    </div>

                    {/* Selected Tech Preview Card */}
                    {quickAddData.technician_id && (() => {
                        const selectedTech = technicians.find(
                            (t) => t.user_id === Number(quickAddData.technician_id),
                        );
                        if (!selectedTech) return null;
                        return (
                            <div
                                style={{
                                    background: "#EFF6FF",
                                    border: "1px solid #BFDBFE",
                                    borderRadius: 8,
                                    padding: "10px 14px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, color: "#1E2F5F", fontSize: 13 }}>
                                        {selectedTech.full_name || selectedTech.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>
                                        {selectedTech.email} · {selectedTech.contact_number || "No contact"}
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        background: "#DBEAFE",
                                        color: "#1E40AF",
                                        padding: "3px 8px",
                                        borderRadius: 6,
                                        fontWeight: 600,
                                    }}
                                >
                                    Ready to Assign
                                </span>
                            </div>
                        );
                    })()}
                </div>
            </Modal>

            {/* Archive Confirmation Modal */}
            <Modal
                open={!!archiveModal}
                title={`Archive Squad: ${archiveModal?.team_name}`}
                message="Are you sure you want to archive this squad? The squad will be moved to archived status and its technicians will be unassigned and become available to join other squads."
                confirmLabel={deleting ? "Archiving..." : "Confirm Archive"}
                confirmDisabled={deleting}
                variant="warning"
                maxWidth={440}
                onConfirm={handleArchive}
                onCancel={() => !deleting && setArchiveModal(null)}
            />

            {/* Permanent Delete Confirmation Modal (Super Admin Only) */}
            <Modal
                open={!!forceDeleteModal}
                title={`Permanently Delete Squad: ${forceDeleteModal?.team_name}`}
                message="Are you sure you want to permanently delete this squad from the database? This action is irreversible and cannot be undone."
                confirmLabel={forceDeleting ? "Deleting..." : "Confirm Permanent Delete"}
                confirmDisabled={forceDeleting}
                variant="danger"
                maxWidth={440}
                onConfirm={handleForceDelete}
                onCancel={() => !forceDeleting && setForceDeleteModal(null)}
            />
        </div>
    );
}
