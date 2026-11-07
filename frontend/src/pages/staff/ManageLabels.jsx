import { useEffect, useMemo, useState } from "react";
import {
  Tags,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Power,
  X,
  Check,
  AlertCircle,
  Tag,
  FileText,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import api from "../../services/api";
import "./ManageLabels.css";

export default function ManageLabels() {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    label_name: "",
    description: "",
  });

  const [message, setMessage] = useState({
    text: "",
    type: "",
  });

  const fetchLabels = async () => {
    try {
      setLoading(true);

      const response = await api.get("/labels");

      setLabels(response.data?.labels || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load labels.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
  };

  const filteredLabels = useMemo(() => {
    return labels.filter((label) => {
      const matchesSearch =
        label.label_name?.toLowerCase().includes(search.toLowerCase()) ||
        label.description?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        activeFilter === "all" ||
        (activeFilter === "active" && Number(label.is_active) === 1) ||
        (activeFilter === "inactive" && Number(label.is_active) === 0);

      return matchesSearch && matchesStatus;
    });
  }, [labels, search, activeFilter]);

  const activeCount = labels.filter(
    (label) => Number(label.is_active) === 1,
  ).length;

  const inactiveCount = labels.length - activeCount;

  const openCreateModal = () => {
    setEditingLabel(null);
    setForm({
      label_name: "",
      description: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (label) => {
    setEditingLabel(label);
    setForm({
      label_name: label.label_name || "",
      description: label.description || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingLabel(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.label_name.trim()) {
      showMessage("Label name is required.", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        label_name: form.label_name.trim(),
        description: form.description.trim() || null,
      };

      if (editingLabel) {
        await api.put(`/labels/${editingLabel.label_id}`, payload);
        showMessage("Label updated successfully.");
      } else {
        await api.post("/labels", payload);
        showMessage("Label created successfully.");
      }

      setModalOpen(false);
      setEditingLabel(null);

      await fetchLabels();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Something went wrong.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (label) => {
    const nextStatus = Number(label.is_active) === 1 ? 0 : 1;

    try {
      await api.patch(`/labels/${label.label_id}/status`, {
        is_active: nextStatus,
      });

      setLabels((previous) =>
        previous.map((item) =>
          item.label_id === label.label_id
            ? { ...item, is_active: nextStatus }
            : item,
        ),
      );

      showMessage(
        nextStatus === 1
          ? "Label activated successfully."
          : "Label deactivated successfully.",
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update label status.",
        "error",
      );
    }
  };

  return (
    <div className="ml-page">
      <div className="ml-header">
        <div>
          <div className="ml-eyebrow">
            <Tags size={15} />
            STAFF MANAGEMENT
          </div>

          <h1>Manage Labels</h1>

          <p>Create and manage rating labels.</p>
        </div>

        <button className="ml-primary-btn" onClick={openCreateModal}>
          <Plus size={17} />
          Create Label
        </button>
      </div>

      {message.text && (
        <div className={`ml-message ${message.type}`}>
          {message.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Check size={16} />
          )}

          <span>{message.text}</span>

          <button onClick={() => setMessage({ text: "", type: "" })}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="ml-stats">
        <div className="ml-stat-card">
          <div className="ml-stat-icon total">
            <Tags size={19} />
          </div>
          <div>
            <span>Total Labels</span>
            <strong>{labels.length}</strong>
          </div>
        </div>

        <div className="ml-stat-card">
          <div className="ml-stat-icon active">
            <ToggleRight size={20} />
          </div>
          <div>
            <span>Active Labels</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="ml-stat-card">
          <div className="ml-stat-icon inactive">
            <ToggleLeft size={20} />
          </div>
          <div>
            <span>Inactive Labels</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      <div className="ml-content-card">
        <div className="ml-toolbar">
          <div className="ml-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search labels..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="ml-filters">
            {[
              { value: "all", label: "All Labels" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ].map((filter) => (
              <button
                key={filter.value}
                className={activeFilter === filter.value ? "selected" : ""}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            className="ml-refresh-btn"
            onClick={fetchLabels}
            disabled={loading}
            title="Refresh labels"
          >
            <RefreshCw size={16} className={loading ? "ml-spinning" : ""} />
          </button>
        </div>

        <div className="ml-table-heading">
          <div>
            <h2>Rating Labels</h2>
            <p>Manage the labels available for student ratings.</p>
          </div>

          <span>{filteredLabels.length} RESULTS</span>
        </div>

        <div className="ml-table-wrapper">
          <table className="ml-table">
            <thead>
              <tr>
                <th>LABEL</th>
                <th>DESCRIPTION</th>
                <th>CREATED AT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">
                    <div className="ml-state">
                      <RefreshCw size={22} className="ml-spinning" />
                      <span>Loading labels...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLabels.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="ml-state">
                      <Search size={25} />
                      <strong>No labels found</strong>
                      <span>
                        Try changing your search or create a new label.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLabels.map((label) => {
                  const isActive = Number(label.is_active) === 1;

                  return (
                    <tr key={label.label_id}>
                      <td>
                        <div className="ml-label-cell">
                          <div className="ml-label-icon">
                            <Tag size={16} />
                          </div>
                          <div>
                            <strong>{label.label_name}</strong>
                            <small>#{label.label_id}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="ml-description">
                          {label.description || "No description provided"}
                        </div>
                      </td>

                      <td>
                        <span className="ml-date">
                          {label.created_at
                            ? new Date(label.created_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`ml-status ${isActive ? "active" : "inactive"}`}
                        >
                          <span />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="ml-actions">
                          <button
                            className="ml-action-btn edit"
                            onClick={() => openEditModal(label)}
                            title="Edit label"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            className={`ml-action-btn ${isActive ? "deactivate" : "activate"}`}
                            onClick={() => handleToggleStatus(label)}
                            title={
                              isActive ? "Deactivate label" : "Activate label"
                            }
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="ml-modal-overlay" onMouseDown={closeModal}>
          <div
            className="ml-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="ml-modal-header">
              <div>
                <div className="ml-modal-icon">
                  {editingLabel ? <Pencil size={19} /> : <Plus size={20} />}
                </div>
                <div>
                  <h2>{editingLabel ? "Edit Label" : "Create Label"}</h2>
                  <p>
                    {editingLabel
                      ? "Update the label information."
                      : "Add a new rating label."}
                  </p>
                </div>
              </div>

              <button
                className="ml-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ml-form-body">
                <label>
                  Label Name <span>*</span>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Teamwork"
                    value={form.label_name}
                    onChange={(event) =>
                      setForm({ ...form, label_name: event.target.value })
                    }
                    required
                  />
                  <small>{form.label_name.length}/100 characters</small>
                </label>

                <label>
                  Description
                  <div className="ml-textarea-wrap">
                    <FileText size={16} />
                    <textarea
                      rows={4}
                      placeholder="Describe what this label represents..."
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                    />
                  </div>
                </label>
              </div>

              <div className="ml-modal-footer">
                <button
                  type="button"
                  className="ml-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ml-primary-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw size={16} className="ml-spinning" />
                  ) : (
                    <Check size={16} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingLabel
                      ? "Save Changes"
                      : "Create Label"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
