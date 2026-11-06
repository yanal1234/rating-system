import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  UserRound,
  Code2,
  FileText,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import "./EditProfile.css";

export default function EditProfile() {
  const { user, checkAuth } = useAuth();

  const normalizeSkills = (userSkills) => {
    if (!Array.isArray(userSkills)) return [];

    return userSkills
      .map((skill) => (typeof skill === "string" ? skill : skill?.name))
      .filter(Boolean);
  };

  const [bio, setBio] = useState(user?.bio || "");
  const [skills, setSkills] = useState(normalizeSkills(user?.skills));
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    setBio(user?.bio || "");
    setSkills(normalizeSkills(user?.skills));
  }, [user]);

  const addSkill = () => {
    const skill = newSkill.trim();

    if (!skill) return;

    const exists = skills.some(
      (item) => item.toLowerCase() === skill.toLowerCase(),
    );

    if (exists) {
      setNewSkill("");
      return;
    }

    setSkills((prev) => [...prev, skill]);
    setNewSkill("");
  };

  const removeSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((skill) => skill !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      await api.patch("/users/me/profile", {
        bio,
        skills,
      });

      await checkAuth();

      setMessage("Your profile has been updated successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Update profile error:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to update your profile. Please try again.",
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const fullName = user?.full_name || user?.username || "Student";

  const username = user?.username || "student";

  const profilePicture = user?.profile_picture || user?.avatar || null;

  return (
    <main className="edit-profile-page">
      <div className="ep-container">
        <Link to="/student/dashboard" className="ep-back">
          <ArrowLeft size={16} />
          <span>Back to My Profile</span>
        </Link>

        <header className="ep-header">
          <div>
            <div className="ep-eyebrow">ACCOUNT SETTINGS</div>
            <h1>Edit Profile</h1>
            <p>Update your personal introduction and technical skills.</p>
          </div>

          <div className="ep-header-icon">
            <UserRound size={23} />
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="ep-card ep-profile-card">
            <div className="ep-section-heading">
              <div className="ep-icon">
                <UserRound size={18} />
              </div>

              <div>
                <h2>Profile Information</h2>
                <p>Your account information</p>
              </div>

              <span className="ep-readonly">READ ONLY</span>
            </div>

            <div className="ep-user">
              <div className="ep-avatar">
                {profilePicture ? (
                  <img src={profilePicture} alt={fullName} />
                ) : (
                  <UserRound size={30} />
                )}
              </div>

              <div>
                <h3>{fullName}</h3>
                <span>@{username}</span>
              </div>
            </div>

            <p className="ep-note">
              Your name, username and profile picture cannot be changed here.
            </p>
          </section>

          <section className="ep-card">
            <div className="ep-section-heading">
              <div className="ep-icon">
                <FileText size={18} />
              </div>

              <div>
                <h2>About Me</h2>
                <p>Tell others a little about yourself</p>
              </div>
            </div>

            <label className="ep-label" htmlFor="bio">
              BIO
            </label>

            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself, your interests and what you do..."
              maxLength={500}
              rows={5}
            />

            <div className="ep-field-footer">
              <span>Keep it short and interesting.</span>
              <span>{bio.length}/500</span>
            </div>
          </section>

          <section className="ep-card">
            <div className="ep-section-heading">
              <div className="ep-icon">
                <Code2 size={18} />
              </div>

              <div>
                <h2>My Skills</h2>
                <p>Showcase the technologies you work with</p>
              </div>
            </div>

            <label className="ep-label" htmlFor="new-skill">
              ADD A SKILL
            </label>

            <div className="ep-skill-input">
              <input
                id="new-skill"
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g. JavaScript, React, Python..."
                maxLength={100}
              />

              <button
                type="button"
                className="ep-add-btn"
                onClick={addSkill}
                disabled={!newSkill.trim()}
              >
                <Plus size={17} />
                Add
              </button>
            </div>

            <div className="ep-skills-heading">
              <span>YOUR SKILLS</span>
              <span>{skills.length} SKILLS</span>
            </div>

            <div className="ep-skills">
              {skills.length > 0 ? (
                skills.map((skill, index) => (
                  <div className="ep-skill" key={`${skill}-${index}`}>
                    <span>{skill}</span>

                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      title="Remove skill"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="ep-empty">
                  No skills added yet. Add your first skill above.
                </div>
              )}
            </div>
          </section>

          {message && (
            <div className={`ep-message ${messageType}`}>
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          <div className="ep-actions">
            <Link to="/student/profile" className="ep-cancel">
              Cancel
            </Link>

            <button type="submit" className="ep-save" disabled={saving}>
              {saving ? (
                <LoaderCircle className="ep-spinner" size={17} />
              ) : (
                <Save size={17} />
              )}

              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
