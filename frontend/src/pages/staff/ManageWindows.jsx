import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Clock3,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Check,
  Ban,
  CalendarCheck,
  AlertCircle,
  ChevronDown,
  Users,
  Vote,
  UserPlus,
  UserMinus,
  UserCheck,
  SearchX,
} from "lucide-react";

import api from "../../services/api";
import "./ManageWindows.css";

const emptyForm = {
  window_name: "",
  starts_at: "",
  ends_at: "",
  min_votes: 1,
  max_votes: 5,
  status: "draft",
};

const statusLabels = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(
    typeof value === "string" && !value.includes("T")
      ? value.replace(" ", "T")
      : value,
  );
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(
    typeof value === "string" && !value.includes("T")
      ? value.replace(" ", "T")
      : value,
  );
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.replace(" ", "T").slice(0, 16);
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const getWindowState = (item) => {
  if (item.status === "cancelled") return "cancelled";
  if (item.status === "draft") return "draft";

  const now = new Date();
  const start = new Date(String(item.starts_at).replace(" ", "T"));
  const end = new Date(String(item.ends_at).replace(" ", "T"));

  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
};

export default function ManageWindows() {
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteWindow, setDeleteWindow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState(null);

  // Participants
  const [participantsWindow, setParticipantsWindow] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [participantTab, setParticipantTab] = useState("available");
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsSaving, setParticipantsSaving] = useState(false);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4500);
  };

  const fetchWindows = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await api.get("/voting-windows");
      setWindows(
        Array.isArray(response.data?.windows) ? response.data.windows : [],
      );
    } catch (error) {
      console.error("Fetch voting windows error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to retrieve voting windows.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  const stats = useMemo(
    () => ({
      total: windows.length,
      active: windows.filter((item) => getWindowState(item) === "active")
        .length,
      upcoming: windows.filter((item) => getWindowState(item) === "upcoming")
        .length,
      drafts: windows.filter((item) => item.status === "draft").length,
      completed: windows.filter((item) => getWindowState(item) === "completed")
        .length,
    }),
    [windows],
  );

  const filteredWindows = useMemo(() => {
    return windows.filter((item) => {
      const matchesSearch = item.window_name
        ?.toLowerCase()
        .includes(search.toLowerCase());

      const state = getWindowState(item);
      const matchesStatus =
        statusFilter === "all" ||
        state === statusFilter ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [windows, search, statusFilter]);

  // Load participants and student list for the selected window
  const fetchParticipantsData = async (windowId) => {
    try {
      setParticipantsLoading(true);

      const [participantsResponse, usersResponse] = await Promise.all([
        api.get(`/participants/${windowId}`),
        api.get("/users"),
      ]);

      const currentParticipants = participantsResponse.data?.participants || [];

      const allUsers = usersResponse.data?.users || [];

      setParticipants(
        Array.isArray(currentParticipants) ? currentParticipants : [],
      );
      setStudents(
        Array.isArray(allUsers)
          ? allUsers.filter((user) => user.role === "student")
          : [],
      );
      setSelectedStudents([]);
    } catch (error) {
      console.error("Fetch participants error:", error);
      showMessage(
        "error",
        error.response?.data?.message ||
          "Failed to retrieve participants or students.",
      );
    } finally {
      setParticipantsLoading(false);
    }
  };

  const openParticipants = async (item) => {
    setParticipantsWindow(item);
    setParticipants([]);
    setStudents([]);
    setSelectedStudents([]);
    setStudentSearch("");
    setParticipantTab("available");
    await fetchParticipantsData(item.window_id);
  };

  const closeParticipants = () => {
    if (participantsSaving) return;
    setParticipantsWindow(null);
    setParticipants([]);
    setStudents([]);
    setSelectedStudents([]);
    setStudentSearch("");
  };

  const participantIds = useMemo(
    () => new Set(participants.map((item) => String(item.user_id))),
    [participants],
  );

  const availableStudents = useMemo(
    () =>
      students.filter(
        (student) => !participantIds.has(String(student.user_id)),
      ),
    [students, participantIds],
  );

  const filteredStudents = useMemo(() => {
    const source =
      participantTab === "available" ? availableStudents : participants;

    const term = studentSearch.toLowerCase().trim();

    if (!term) return source;

    return source.filter((student) =>
      [student.username, student.full_name, student.email, student.user_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [participantTab, availableStudents, participants, studentSearch]);

  const toggleStudent = (userId) => {
    const id = String(userId);

    setSelectedStudents((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredStudents.map((student) =>
      String(student.user_id),
    );
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedStudents.includes(id));

    if (allSelected) {
      setSelectedStudents((previous) =>
        previous.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedStudents((previous) => [
        ...new Set([...previous, ...visibleIds]),
      ]);
    }
  };

  const addSelectedParticipants = async () => {
    if (!participantsWindow || selectedStudents.length === 0) return;

    try {
      setParticipantsSaving(true);

      const results = await Promise.allSettled(
        selectedStudents.map((userId) =>
          api.post("/participants", {
            window_id: participantsWindow.window_id,
            user_id: Number(userId),
          }),
        ),
      );

      const succeeded = results.filter(
        (result) => result.status === "fulfilled",
      ).length;

      const failed = results.length - succeeded;

      await fetchParticipantsData(participantsWindow.window_id);

      if (failed === 0) {
        showMessage(
          "success",
          `${succeeded} student${succeeded === 1 ? "" : "s"} added successfully.`,
        );
      } else {
        showMessage(
          "error",
          `${succeeded} added successfully, ${failed} could not be added.`,
        );
      }
    } catch (error) {
      console.error("Add participants error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to add participants.",
      );
    } finally {
      setParticipantsSaving(false);
    }
  };

  const removeParticipant = async (student) => {
    if (!participantsWindow) return;

    const name = student.full_name || student.username || "this student";

    if (!window.confirm(`Remove ${name} from this voting window?`)) return;

    try {
      setParticipantsSaving(true);

      await api.delete(
        `/participants/${participantsWindow.window_id}/${student.user_id}`,
      );

      await fetchParticipantsData(participantsWindow.window_id);
      showMessage("success", "Participant removed successfully.");
    } catch (error) {
      console.error("Remove participant error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to remove participant.",
      );
    } finally {
      setParticipantsSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingWindow(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingWindow(item);
    setForm({
      window_name: item.window_name || "",
      starts_at: toDateTimeLocal(item.starts_at),
      ends_at: toDateTimeLocal(item.ends_at),
      min_votes: item.min_votes ?? 1,
      max_votes: item.max_votes ?? 5,
      status: item.status || "draft",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingWindow(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validateForm = () => {
    if (!form.window_name.trim()) {
      showMessage("error", "Please enter a voting window name.");
      return false;
    }

    if (!form.starts_at || !form.ends_at) {
      showMessage("error", "Start and end dates are required.");
      return false;
    }

    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      showMessage("error", "The end date must be later than the start date.");
      return false;
    }

    if (
      !Number.isInteger(Number(form.min_votes)) ||
      !Number.isInteger(Number(form.max_votes)) ||
      Number(form.min_votes) < 1 ||
      Number(form.max_votes) < Number(form.min_votes)
    ) {
      showMessage("error", "Please enter valid vote limits.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      window_name: form.window_name.trim(),
      starts_at: form.starts_at.replace("T", " "),
      ends_at: form.ends_at.replace("T", " "),
      min_votes: Number(form.min_votes),
      max_votes: Number(form.max_votes),
      status: form.status,
    };

    try {
      setSaving(true);

      if (editingWindow) {
        await api.put(`/voting-windows/${editingWindow.window_id}`, payload);
        showMessage("success", "Voting window updated successfully.");
      } else {
        await api.post("/voting-windows", {
          window_name: payload.window_name,
          starts_at: payload.starts_at,
          ends_at: payload.ends_at,
          min_votes: payload.min_votes,
          max_votes: payload.max_votes,
        });
        showMessage("success", "Voting window created successfully.");
      }

      setModalOpen(false);
      setEditingWindow(null);
      setForm(emptyForm);
      await fetchWindows(true);
    } catch (error) {
      console.error("Save voting window error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to save voting window.",
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item, newStatus) => {
    try {
      await api.put(`/voting-windows/${item.window_id}`, {
        status: newStatus,
      });
      showMessage("success", `Voting window ${newStatus} successfully.`);
      await fetchWindows(true);
    } catch (error) {
      console.error("Change voting window status error:", error);
      showMessage(
        "error",
        error.response?.data?.message ||
          "Failed to update voting window status.",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteWindow) return;

    try {
      setDeleting(true);
      await api.delete(`/voting-windows/${deleteWindow.window_id}`);
      showMessage("success", "Voting window deleted successfully.");
      setDeleteWindow(null);
      await fetchWindows(true);
    } catch (error) {
      console.error("Delete voting window error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete voting window.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const getStatusClass = (item) => {
    const state = getWindowState(item);
    if (state === "active") return "mw-status-active";
    if (state === "upcoming") return "mw-status-upcoming";
    if (state === "completed") return "mw-status-completed";
    if (state === "cancelled") return "mw-status-cancelled";
    return "mw-status-draft";
  };

  const getStatusText = (item) => {
    const state = getWindowState(item);
    if (state === "active") return "Active";
    if (state === "upcoming") return "Upcoming";
    if (state === "completed") return "Completed";
    return statusLabels[item.status] || item.status;
  };

  return (
    <div className="manage-windows-page">
      <div className="mw-header">
        <div>
          <div className="mw-breadcrumb">
            STAFF PANEL <span>/</span> VOTING WINDOWS
          </div>
          <h1>Voting Windows</h1>
          <p>Create and manage voting periods.</p>
        </div>

        <div className="mw-header-actions">
          <button
            className="mw-refresh-btn"
            onClick={() => fetchWindows(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={15} className={refreshing ? "mw-spinning" : ""} />
          </button>
          <button className="mw-create-btn" onClick={openCreateModal}>
            <Plus size={16} />
            Create Window
          </button>
        </div>
      </div>

      {message && (
        <div className={`mw-message mw-message-${message.type}`}>
          {message.type === "success" ? (
            <Check size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="mw-stats-grid">
        <div className="mw-stat-card">
          <div className="mw-stat-top">
            <span className="mw-stat-icon cyan">
              <CalendarDays size={17} />
            </span>
            <span className="mw-stat-caption">ALL PERIODS</span>
          </div>
          <strong>{stats.total}</strong>
          <span className="mw-stat-description">Total voting windows</span>
        </div>

        <div className="mw-stat-card">
          <div className="mw-stat-top">
            <span className="mw-stat-icon green">
              <Activity size={17} />
            </span>
            <span className="mw-stat-caption">LIVE NOW</span>
          </div>
          <strong>{stats.active}</strong>
          <span className="mw-stat-description">Currently active</span>
        </div>

        <div className="mw-stat-card">
          <div className="mw-stat-top">
            <span className="mw-stat-icon orange">
              <Clock3 size={17} />
            </span>
            <span className="mw-stat-caption">UPCOMING</span>
          </div>
          <strong>{stats.upcoming}</strong>
          <span className="mw-stat-description">Scheduled periods</span>
        </div>

        <div className="mw-stat-card">
          <div className="mw-stat-top">
            <span className="mw-stat-icon muted">
              <CalendarCheck size={17} />
            </span>
            <span className="mw-stat-caption">COMPLETED</span>
          </div>
          <strong>{stats.completed}</strong>
          <span className="mw-stat-description">Finished periods</span>
        </div>
      </div>

      <div className="mw-content-card">
        <div className="mw-content-heading">
          <div>
            <h2>Voting Periods</h2>
            <p>Manage your campus voting schedule.</p>
          </div>
          <span className="mw-record-count">
            {filteredWindows.length} RECORDS
          </span>
        </div>

        <div className="mw-toolbar">
          <div className="mw-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search voting windows..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mw-filter">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All periods</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown size={14} />
          </div>
        </div>

        {loading ? (
          <div className="mw-state">
            <RefreshCw size={23} className="mw-spinning" />
            <span>Loading voting windows...</span>
          </div>
        ) : filteredWindows.length === 0 ? (
          <div className="mw-state">
            <CalendarDays size={30} />
            <strong>No voting windows found</strong>
            <span>
              {windows.length === 0
                ? "Create your first voting window to get started."
                : "Try changing your search or filters."}
            </span>
            {windows.length === 0 && (
              <button className="mw-empty-create" onClick={openCreateModal}>
                <Plus size={15} /> Create Window
              </button>
            )}
          </div>
        ) : (
          <div className="mw-table-scroll">
            <table className="mw-table">
              <thead>
                <tr>
                  <th>WINDOW</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>VOTE LIMITS</th>
                  <th>STATUS</th>
                  <th className="mw-actions-heading">ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredWindows.map((item) => (
                  <tr key={item.window_id}>
                    <td>
                      <div className="mw-window-name">
                        <span className="mw-window-icon">
                          <Vote size={16} />
                        </span>
                        <div>
                          <strong>{item.window_name}</strong>
                          <small>ID #{item.window_id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="mw-date-cell">
                        <span>{formatDate(item.starts_at)}</span>
                        <small>{formatTime(item.starts_at)}</small>
                      </div>
                    </td>

                    <td>
                      <div className="mw-date-cell">
                        <span>{formatDate(item.ends_at)}</span>
                        <small>{formatTime(item.ends_at)}</small>
                      </div>
                    </td>

                    <td>
                      <div className="mw-vote-limits">
                        <Users size={14} />
                        <span>
                          {item.min_votes} – {item.max_votes}
                        </span>
                        <small>votes</small>
                      </div>
                    </td>

                    <td>
                      <span className={`mw-status ${getStatusClass(item)}`}>
                        <span className="mw-status-dot" />
                        {getStatusText(item)}
                      </span>
                    </td>

                    <td>
                      <div className="mw-row-actions">
                        <button
                          className="mw-action-btn participants"
                          title="Manage participants"
                          onClick={() => openParticipants(item)}
                        >
                          <Users size={15} />
                        </button>

                        <button
                          className="mw-action-btn edit"
                          title="Edit window"
                          onClick={() => openEditModal(item)}
                        >
                          <Pencil size={15} />
                        </button>

                        {item.status === "draft" && (
                          <button
                            className="mw-action-btn publish"
                            title="Publish window"
                            onClick={() => changeStatus(item, "published")}
                          >
                            <Check size={15} />
                          </button>
                        )}

                        {item.status === "published" && (
                          <button
                            className="mw-action-btn cancel"
                            title="Cancel window"
                            onClick={() => changeStatus(item, "cancelled")}
                          >
                            <Ban size={15} />
                          </button>
                        )}

                        {item.status === "cancelled" && (
                          <button
                            className="mw-action-btn draft"
                            title="Move to draft"
                            onClick={() => changeStatus(item, "draft")}
                          >
                            <Clock3 size={15} />
                          </button>
                        )}

                        <button
                          className="mw-action-btn delete"
                          title="Delete window"
                          onClick={() => setDeleteWindow(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredWindows.length > 0 && (
          <div className="mw-table-footer">
            <span>
              Showing {filteredWindows.length} of {windows.length} voting
              windows
            </span>
            <span>
              <span className="mw-footer-dot" /> Live data
            </span>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="mw-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="mw-modal">
            <div className="mw-modal-header">
              <div>
                <span className="mw-modal-eyebrow">VOTING MANAGEMENT</span>
                <h2>
                  {editingWindow
                    ? "Edit Voting Window"
                    : "Create Voting Window"}
                </h2>
                <p>
                  {editingWindow
                    ? "Update the selected voting period."
                    : "Set up a new voting period for your campus."}
                </p>
              </div>
              <button
                className="mw-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mw-form-body">
                <div className="mw-form-group">
                  <label htmlFor="window_name">
                    Window Name <span>*</span>
                  </label>
                  <input
                    id="window_name"
                    name="window_name"
                    type="text"
                    maxLength={100}
                    placeholder="e.g. November Voting Period"
                    value={form.window_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mw-form-row">
                  <div className="mw-form-group">
                    <label htmlFor="starts_at">
                      Start Date <span>*</span>
                    </label>
                    <input
                      id="starts_at"
                      name="starts_at"
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mw-form-group">
                    <label htmlFor="ends_at">
                      End Date <span>*</span>
                    </label>
                    <input
                      id="ends_at"
                      name="ends_at"
                      type="datetime-local"
                      min={form.starts_at || undefined}
                      value={form.ends_at}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mw-form-row">
                  <div className="mw-form-group">
                    <label htmlFor="min_votes">Minimum Votes</label>
                    <input
                      id="min_votes"
                      name="min_votes"
                      type="number"
                      min="1"
                      step="1"
                      value={form.min_votes}
                      onChange={handleChange}
                      required
                    />
                    <small>Minimum votes required from each participant.</small>
                  </div>

                  <div className="mw-form-group">
                    <label htmlFor="max_votes">Maximum Votes</label>
                    <input
                      id="max_votes"
                      name="max_votes"
                      type="number"
                      min="1"
                      step="1"
                      value={form.max_votes}
                      onChange={handleChange}
                      required
                    />
                    <small>Maximum votes allowed per participant.</small>
                  </div>
                </div>

                {editingWindow && (
                  <div className="mw-form-group">
                    <label htmlFor="status">Window Status</label>
                    <div className="mw-select-wrapper">
                      <select
                        id="status"
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown size={15} />
                    </div>
                  </div>
                )}

                <div className="mw-form-note">
                  <AlertCircle size={15} />
                  <span>
                    Once ratings have been submitted, voting dates and vote
                    limits cannot be changed.
                  </span>
                </div>
              </div>

              <div className="mw-modal-footer">
                <button
                  type="button"
                  className="mw-btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mw-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="mw-spinning" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={15} />{" "}
                      {editingWindow ? "Save Changes" : "Create Window"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {participantsWindow && (
        <div
          className="mw-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeParticipants();
          }}
        >
          <div className="mw-participants-modal">
            <div className="mw-modal-header">
              <div>
                <span className="mw-modal-eyebrow">VOTING MANAGEMENT</span>
                <h2>Manage Participants</h2>
                <p>{participantsWindow.window_name}</p>
              </div>
              <button
                className="mw-modal-close"
                onClick={closeParticipants}
                disabled={participantsSaving}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mw-participants-summary">
              <div>
                <span className="mw-participants-summary-icon">
                  <UserCheck size={17} />
                </span>
                <div>
                  <strong>{participants.length}</strong>
                  <small>Current participants</small>
                </div>
              </div>
              <div>
                <span className="mw-participants-summary-icon">
                  <Users size={17} />
                </span>
                <div>
                  <strong>{availableStudents.length}</strong>
                  <small>Available students</small>
                </div>
              </div>
            </div>

            <div className="mw-participant-tabs">
              <button
                className={participantTab === "available" ? "active" : ""}
                onClick={() => {
                  setParticipantTab("available");
                  setSelectedStudents([]);
                  setStudentSearch("");
                }}
              >
                Available Students <span>{availableStudents.length}</span>
              </button>
              <button
                className={participantTab === "current" ? "active" : ""}
                onClick={() => {
                  setParticipantTab("current");
                  setSelectedStudents([]);
                  setStudentSearch("");
                }}
              >
                Current Participants <span>{participants.length}</span>
              </button>
            </div>

            <div className="mw-participants-body">
              <div className="mw-participants-toolbar">
                <div className="mw-search mw-participants-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                  />
                  {studentSearch && (
                    <button onClick={() => setStudentSearch("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {participantTab === "available" &&
                  filteredStudents.length > 0 && (
                    <button className="mw-select-all" onClick={toggleSelectAll}>
                      Select all
                    </button>
                  )}
              </div>

              {participantsLoading ? (
                <div className="mw-participants-state">
                  <RefreshCw size={22} className="mw-spinning" />
                  <span>Loading students...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="mw-participants-state">
                  <SearchX size={25} />
                  <strong>
                    {participantTab === "available"
                      ? "No available students"
                      : "No participants yet"}
                  </strong>
                  <span>
                    {studentSearch
                      ? "Try another search."
                      : participantTab === "available"
                        ? "All students have already been added."
                        : "Add students from the Available Students tab."}
                  </span>
                </div>
              ) : (
                <div className="mw-student-list">
                  {filteredStudents.map((student) => {
                    const id = String(student.user_id);
                    const checked = selectedStudents.includes(id);
                    const name =
                      student.full_name || student.username || `Student #${id}`;

                    return (
                      <div className="mw-student-row" key={id}>
                        {participantTab === "available" ? (
                          <label className="mw-student-select">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStudent(id)}
                            />
                            <span className="mw-custom-check">
                              {checked && <Check size={12} />}
                            </span>
                            <span className="mw-student-avatar">
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <span className="mw-student-info">
                              <strong>{name}</strong>
                              <small>
                                {student.email ||
                                  student.username ||
                                  `ID #${id}`}
                              </small>
                            </span>
                          </label>
                        ) : (
                          <>
                            <span className="mw-student-avatar">
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <span className="mw-student-info">
                              <strong>{name}</strong>
                              <small>
                                {student.email ||
                                  student.username ||
                                  `ID #${id}`}
                              </small>
                            </span>
                            <button
                              className="mw-remove-participant"
                              title="Remove participant"
                              onClick={() => removeParticipant(student)}
                              disabled={participantsSaving}
                            >
                              <UserMinus size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {participantTab === "available" && (
              <div className="mw-modal-footer mw-participants-footer">
                <span className="mw-selected-count">
                  {selectedStudents.length} selected
                </span>
                <button
                  className="mw-btn-secondary"
                  onClick={closeParticipants}
                  disabled={participantsSaving}
                >
                  Close
                </button>
                <button
                  className="mw-btn-primary"
                  onClick={addSelectedParticipants}
                  disabled={participantsSaving || selectedStudents.length === 0}
                >
                  {participantsSaving ? (
                    <>
                      <RefreshCw size={15} className="mw-spinning" /> Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} /> Add Selected
                    </>
                  )}
                </button>
              </div>
            )}

            {participantTab === "current" && (
              <div className="mw-modal-footer">
                <span className="mw-selected-count">
                  {participants.length} participants
                </span>
                <button
                  className="mw-btn-secondary"
                  onClick={closeParticipants}
                  disabled={participantsSaving}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteWindow && (
        <div className="mw-overlay">
          <div className="mw-delete-modal">
            <div className="mw-delete-icon">
              <Trash2 size={22} />
            </div>
            <h2>Delete Voting Window?</h2>
            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteWindow.window_name}</strong>? This action cannot be
              undone.
            </p>
            <div className="mw-delete-note">
              Windows linked to participants or ratings cannot be deleted.
            </div>
            <div className="mw-modal-footer">
              <button
                className="mw-btn-secondary"
                onClick={() => setDeleteWindow(null)}
                disabled={deleting}
              >
                Keep Window
              </button>
              <button
                className="mw-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <RefreshCw size={15} className="mw-spinning" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Delete Window
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
