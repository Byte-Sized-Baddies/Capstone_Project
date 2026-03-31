"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../auth/supabaseClient";

type Step = "email" | "sent" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setIsDark(saved === "dark");
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      localStorage.setItem("theme", !prev ? "dark" : "light");
      return !prev;
    });
  };

  // Listen for PASSWORD_RECOVERY — fires when user clicks the reset link in email
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep("reset");
        setErr(null);
        setSuccess(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Countdown for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Step 1: Send reset email
  const handleSendReset = async () => {
    setErr(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return setErr("Please enter your email address");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return setErr("Please enter a valid email address");

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/forgotpassword`,
      });
      if (error) return setErr(error.message);
      setStep("sent");
      setCountdown(60);
    } finally {
      setLoading(false);
    }
  };

  // Resend
  const handleResend = async () => {
    if (countdown > 0) return;
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/forgotpassword`,
      });
      if (error) return setErr(error.message);
      setSuccess("A new reset link has been sent to your email");
      setCountdown(60);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update password
  const handleResetPassword = async () => {
    setErr(null);
    if (!newPassword) return setErr("Please enter a new password");
    if (newPassword.length < 8) return setErr("Password must be at least 8 characters");
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) return setErr("Password must contain both letters and numbers");
    if (newPassword !== confirmPassword) return setErr("Passwords do not match");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return setErr(error.message);
      setStep("done");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "", color: "transparent", width: "0%" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: "Weak", color: "#ef4444", width: "25%" };
    if (score <= 2) return { label: "Fair", color: "#f97316", width: "50%" };
    if (score <= 3) return { label: "Good", color: "#FFC107", width: "75%" };
    return { label: "Strong", color: "#22c55e", width: "100%" };
  };

  const strength = getPasswordStrength(newPassword);

  const bg = isDark ? "#111113" : "#fffaf3";
  const surface = isDark ? "#18181b" : "#ffffff";
  const border = isDark ? "#27272a" : "#f5e99f";
  const borderStrong = isDark ? "#3f3f46" : "#e6d870";
  const text = isDark ? "#fafafa" : "#1a1a1a";
  const textMuted = isDark ? "#a1a1aa" : "#6b6b6b";
  const textDim = isDark ? "#71717a" : "#9a9a9a";
  const accent = isDark ? "#FFC107" : "#f5c800";
  const accentText = "#18181b";
  const inputBg = isDark ? "#27272a" : "#fffdf2";
  const surfaceHover = isDark ? "#27272a" : "#fff8e6";

  const stepIndex = { email: 0, sent: 1, reset: 2, done: 3 }[step];

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    @keyframes floatUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes checkIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
    .float-up { animation: floatUp 0.4s ease-out forwards; }
    .icon-bounce { animation: bounce 2s ease-in-out infinite; display: inline-block; }
    .check-in { animation: checkIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; display: inline-block; }
    input::placeholder { color: ${textDim}; }
    input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px ${inputBg} inset !important; -webkit-text-fill-color: ${text} !important; }
    input:focus { border-color: ${accent} !important; outline: none; }
  `;

  return (
    <main style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", transition: "background 0.3s ease", padding: "24px 16px" }}>
      <style>{inlineStyles}</style>

      <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: accent, opacity: isDark ? 0.06 : 0.18, filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, right: -80, width: 350, height: 350, borderRadius: "50%", background: accent, opacity: isDark ? 0.04 : 0.12, filter: "blur(70px)", pointerEvents: "none" }} />

      <button onClick={toggleTheme} style={{ position: "fixed", top: 24, right: 24, width: 40, height: 40, borderRadius: 12, background: surface, border: `1px solid ${border}`, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <div className="float-up" style={{ position: "relative", zIndex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 28, padding: "48px 40px", width: "100%", maxWidth: 460, boxShadow: isDark ? "0 25px 60px rgba(0,0,0,0.4)" : "0 25px 60px rgba(0,0,0,0.08)" }}>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ height: 4, width: i <= stepIndex ? 32 : 16, borderRadius: 2, background: i <= stepIndex ? accent : borderStrong, transition: "all 0.3s ease" }} />
          ))}
        </div>

        {err && (
          <div style={{ background: "#ef444415", border: "1px solid #ef444440", borderRadius: 12, padding: "12px 16px", color: "#f87171", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
            {err}
          </div>
        )}
        {success && (
          <div style={{ background: "#22c55e15", border: "1px solid #22c55e40", borderRadius: 12, padding: "12px 16px", color: "#22c55e", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
            {success}
          </div>
        )}

        {/* STEP 1: Email */}
        {step === "email" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span className="icon-bounce" style={{ fontSize: 48, marginBottom: 16, display: "block" }}>✉️</span>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: text, margin: "0 0 8px" }}>Forgot Password?</h1>
              <p style={{ fontSize: 14, color: textMuted, margin: 0, lineHeight: 1.5 }}>Enter your email and we&apos;ll send you a reset link</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: textDim, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErr(null); }}
                  onKeyDown={e => { if (e.key === "Enter") handleSendReset(); }}
                  placeholder="you@example.com"
                  autoFocus
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 15, outline: "none" }}
                />
              </div>
              <button onClick={handleSendReset} disabled={loading}
                style={{ width: "100%", padding: "14px", borderRadius: 14, background: accent, color: accentText, fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${accent}40`, marginTop: 4 }}>
                {loading ? "Sending…" : "Send Reset Link →"}
              </button>
              <p style={{ textAlign: "center", fontSize: 14, color: textMuted, margin: "8px 0 0" }}>
                Remember your password?{" "}
                <Link href="/login" style={{ color: accent, fontWeight: 600, textDecoration: "none" }}>Sign In</Link>
              </p>
            </div>
          </>
        )}

        {/* STEP 2: Email sent */}
        {step === "sent" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span className="icon-bounce" style={{ fontSize: 48, marginBottom: 16, display: "block" }}>📬</span>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: text, margin: "0 0 8px" }}>Check Your Email</h1>
              <p style={{ fontSize: 14, color: textMuted, margin: 0, lineHeight: 1.5 }}>
                We sent a reset link to <strong style={{ color: text }}>{email}</strong>
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 16, padding: "20px 24px" }}>
                <p style={{ fontSize: 14, color: text, margin: "0 0 10px", fontWeight: 600 }}>What to do next:</p>
                <ol style={{ fontSize: 13, color: textMuted, margin: 0, paddingLeft: 20, lineHeight: 2.2 }}>
                  <li>Open the email from Supabase Auth</li>
                  <li>Click the <strong style={{ color: text }}>&quot;Reset Password&quot;</strong> link</li>
                  <li>You&apos;ll be brought back here to set your new password</li>
                </ol>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, color: textMuted, margin: "0 0 6px" }}>Didn&apos;t receive it? Check your spam folder or</p>
                <button onClick={handleResend} disabled={countdown > 0 || loading}
                  style={{ background: "none", border: "none", cursor: countdown > 0 ? "not-allowed" : "pointer", color: countdown > 0 ? textDim : accent, fontSize: 14, fontWeight: 600, padding: 0 }}>
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend Email"}
                </button>
              </div>
              <button onClick={() => { setStep("email"); setErr(null); setSuccess(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: textDim, fontSize: 13, padding: 0, textDecoration: "underline", textAlign: "center" as const }}>
                ← Use a different email
              </button>
            </div>
          </>
        )}

        {/* STEP 3: New password */}
        {step === "reset" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span className="icon-bounce" style={{ fontSize: 48, marginBottom: 16, display: "block" }}>🔑</span>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: text, margin: "0 0 8px" }}>Set New Password</h1>
              <p style={{ fontSize: 14, color: textMuted, margin: 0 }}>Create a strong new password for your account</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: textDim, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setErr(null); }}
                    placeholder="At least 8 characters"
                    autoFocus
                    style={{ width: "100%", padding: "14px 48px 14px 16px", borderRadius: 14, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 15, outline: "none" }}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textDim, fontSize: 16, padding: 0 }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {newPassword && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, borderRadius: 2, background: borderStrong, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: strength.width, background: strength.color, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: strength.color }}>{strength.label}</span>
                      <span style={{ fontSize: 11, color: textDim }}>{newPassword.length} chars</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: textDim, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErr(null); }}
                    placeholder="Re-enter your password"
                    onKeyDown={e => { if (e.key === "Enter") handleResetPassword(); }}
                    style={{ width: "100%", padding: "14px 48px 14px 16px", borderRadius: 14, border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? "#ef4444" : confirmPassword && confirmPassword === newPassword ? "#22c55e" : border}`, background: inputBg, color: text, fontSize: 15, outline: "none" }}
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textDim, fontSize: 16, padding: 0 }}>
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                </div>
                {confirmPassword && (
                  <p style={{ fontSize: 12, color: confirmPassword === newPassword ? "#22c55e" : "#ef4444", marginTop: 6, marginBottom: 0 }}>
                    {confirmPassword === newPassword ? "✓ Passwords match" : "✗ Passwords don't match"}
                  </p>
                )}
              </div>

              <div style={{ background: surfaceHover, borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: textDim, margin: "0 0 10px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Requirements</p>
                {[
                  { label: "At least 8 characters", met: newPassword.length >= 8 },
                  { label: "Contains letters and numbers", met: /(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword) },
                  { label: "Passwords match", met: !!confirmPassword && newPassword === confirmPassword },
                ].map(({ label, met }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: met ? "#22c55e" : textDim, fontWeight: 600 }}>{met ? "✓" : "○"}</span>
                    <span style={{ fontSize: 13, color: met ? "#22c55e" : textDim }}>{label}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleResetPassword}
                disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                style={{ width: "100%", padding: "14px", borderRadius: 14, background: newPassword.length >= 8 && newPassword === confirmPassword ? accent : borderStrong, color: newPassword.length >= 8 && newPassword === confirmPassword ? accentText : textDim, fontWeight: 700, fontSize: 15, border: "none", cursor: loading || newPassword.length < 8 || newPassword !== confirmPassword ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: newPassword.length >= 8 && newPassword === confirmPassword ? `0 4px 16px ${accent}40` : "none", transition: "all 0.2s", marginTop: 4 }}>
                {loading ? "Updating password…" : "Update Password →"}
              </button>
            </div>
          </>
        )}

        {/* STEP 4: Done */}
        {step === "done" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span className="check-in" style={{ fontSize: 64, marginBottom: 16, display: "block" }}>✅</span>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: text, margin: "0 0 8px" }}>Password Reset!</h1>
              <p style={{ fontSize: 14, color: textMuted, margin: 0 }}>Your password has been successfully updated</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#22c55e15", border: "1px solid #22c55e30", borderRadius: 16, padding: "16px 20px", textAlign: "center" as const }}>
                <p style={{ fontSize: 14, color: "#22c55e", margin: 0 }}>You can now sign in with your new password.</p>
              </div>
              <button onClick={() => router.push("/login")}
                style={{ width: "100%", padding: "14px", borderRadius: 14, background: accent, color: accentText, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", boxShadow: `0 4px 16px ${accent}40` }}>
                Sign In Now →
              </button>
            </div>
          </>
        )}

        {(step === "email" || step === "reset") && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link href="/login" style={{ fontSize: 13, color: textDim, textDecoration: "none" }}>← Back to Sign In</Link>
          </div>
        )}
      </div>
    </main>
  );
}