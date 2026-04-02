import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Button, Input, Card } from "@/components/ui-elements";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();

  const getRedirect = () => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    return from ? decodeURIComponent(from) : "/studio";
  };

  if (isLoggedIn) {
    navigate(getRedirect());
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate(getRedirect());
    } else {
      setError(result.error ?? "Login failed.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    const result = await signup(name, email, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate(getRedirect());
    } else {
      setError(result.error ?? "Registration failed.");
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
                  placeholder="Create a password (min. 8 characters)"
                  className="h-12 bg-black/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />

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
