import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Button, Input, Card } from "@/components/ui-elements";
import { useAuth } from "@/context/AuthContext";

function generateCaptcha() {
  const ops = ["+", "-"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const answer = op === "+" ? a + b : Math.abs(a - b);
  const display = op === "+" ? `${a} + ${b}` : `${Math.max(a, b)} − ${Math.min(a, b)}`;
  return { display, answer };
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();

  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
  }, []);

  useEffect(() => {
    refreshCaptcha();
  }, [isLogin, refreshCaptcha]);

  const getRedirect = () => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    return from ? decodeURIComponent(from) : "/studio";
  };

  if (isLoggedIn) {
    navigate(getRedirect());
    return null;
  }

  const validateCaptcha = () => {
    const val = parseInt(captchaInput.trim(), 10);
    if (isNaN(val) || val !== captcha.answer) {
      setCaptchaError(true);
      refreshCaptcha();
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!validateCaptcha()) {
      setError("Incorrect verification answer. Please try again.");
      return;
    }
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate(getRedirect());
    } else {
      setError(result.error ?? "Login failed.");
      refreshCaptcha();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setError("Only Gmail accounts (@gmail.com) are allowed to sign up.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!validateCaptcha()) {
      setError("Incorrect verification answer. Please try again.");
      return;
    }
    setIsSubmitting(true);
    const result = await signup(name, email, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate(getRedirect());
    } else {
      setError(result.error ?? "Registration failed.");
      refreshCaptcha();
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[500px] bg-secondary/10 blur-[150px] pointer-events-none rounded-full" />

      <Link href="/" className="relative z-10 mb-8 block hover:scale-105 transition-transform">
        <img src="/logo.png" alt="AfroMuse AI" className="h-16 w-auto drop-shadow-2xl" />
      </Link>

      <Card className="w-full max-w-md p-6 md:p-8 glass-card border-white/10 relative z-10 shadow-2xl">

        <div className="flex bg-black/40 rounded-lg p-1 mb-8">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? "bg-white/10 text-white shadow" : "text-muted-foreground hover:text-white"}`}
            onClick={() => { setIsLogin(true); setError(""); }}
          >
            Log In
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? "bg-white/10 text-white shadow" : "text-muted-foreground hover:text-white"}`}
            onClick={() => { setIsLogin(false); setError(""); }}
          >
            Sign Up
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back, Creator</h2>
                <p className="text-muted-foreground text-sm">Log in to pick up where you left off.</p>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <Input
                  type="email"
                  placeholder="Email address"
                  className="h-12 bg-black/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  className="h-12 bg-black/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />

                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1 font-semibold">Human Verification</p>
                    <p className="text-sm text-white/80 font-medium">What is {captcha.display}?</p>
                  </div>
                  <Input
                    type="number"
                    placeholder="Answer"
                    className={`h-10 w-24 bg-black/30 text-center ${captchaError ? "border-red-500/60" : ""}`}
                    value={captchaInput}
                    onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full h-12 mt-2" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in…" : "Log In"}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Join AfroMuse AI</h2>
                <p className="text-muted-foreground text-sm">Start writing your first song for free — no credit card needed.</p>
              </div>

              <form className="space-y-4" onSubmit={handleSignup}>
                <Input
                  type="text"
                  placeholder="Full Name"
                  className="h-12 bg-black/30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Gmail address (e.g. you@gmail.com)"
                    className="h-12 bg-black/30"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {email && !email.toLowerCase().endsWith("@gmail.com") && (
                    <p className="text-[11px] text-amber-400/80 mt-1 pl-1">Only @gmail.com addresses are accepted</p>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder="Create a password (min. 8 characters)"
                  className="h-12 bg-black/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />

                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1 font-semibold">Human Verification</p>
                    <p className="text-sm text-white/80 font-medium">What is {captcha.display}?</p>
                  </div>
                  <Input
                    type="number"
                    placeholder="Answer"
                    className={`h-10 w-24 bg-black/30 text-center ${captchaError ? "border-red-500/60" : ""}`}
                    value={captchaInput}
                    onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full h-12 mt-4" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account…" : "Create Free Account"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our <a href="#" className="underline hover:text-white">Terms of Service</a> and <a href="#" className="underline hover:text-white">Privacy Policy</a>.
        </p>
      </Card>
    </div>
  );
}
