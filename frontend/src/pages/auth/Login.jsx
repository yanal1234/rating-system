import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import "./Login.css";
import logo42 from "../../assets/42-logo.svg";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      toast.error("Please enter your username and password.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await login({
        username: username.trim(),
        password,
      });

      toast.success("Welcome back!");

      navigate(
        response.user.role === "staff"
          ? "/staff/dashboard"
          : "/student/dashboard",
        { replace: true },
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Invalid username or password.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <header className="top-nav">
        <div className="brand-logo">
          <img src={logo42} alt="42" className="nav-logo-image" />
          <span className="brand-text">Rating System</span>
        </div>
      </header>

      <main className="login-content">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <img src={logo42} alt="42 Logo" className="hero-logo-image" />
            <span className="subtitle-tag">PEER RATING SYSTEM</span>
          </div>

          <h1 className="login-title">
            Better peers.
            <br />
            Stronger learning.
          </h1>

          <p className="login-description">
            A private space to reflect on the people you learn with at 42 Amman.
          </p>

          <div className="login-form">
            <div className="login-field">
              <label htmlFor="username">Intra Username</label>

              <div className="login-input-wrapper">
                <UserRound size={18} className="field-icon" />

                <input
                  id="username"
                  type="text"
                  placeholder="Enter your Intra username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Intra Password</label>

              <div className="login-input-wrapper">
                <LockKeyhole size={18} className="field-icon" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={submitting}>
              <LockKeyhole size={17} />
              <span>
                {submitting ? "Signing in..." : "Enter with 42 Account"}
              </span>
            </button>
          </div>

          <p className="helper-text">Use your 42 account credentials.</p>

          <div className="privacy-footer">
            <ShieldCheck size={18} />
            <span>
              Your feedback stays private. Only your own average is visible to
              you.
            </span>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Login;
