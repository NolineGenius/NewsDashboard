"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rss } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch {
      setError("Ungültige E-Mail-Adresse oder Passwort.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary">
            <Rss className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-xl">Anmelden</CardTitle>
          <CardDescription>
            Melden Sie sich bei NewsDash an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">
                E-Mail
              </label>
              <Input
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">
                Passwort
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Anmelden
            </Button>
            <p className="text-center text-sm text-text-muted">
              Noch kein Konto?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Registrieren
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
