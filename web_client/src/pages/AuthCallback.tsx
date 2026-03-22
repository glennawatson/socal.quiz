import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { handleOAuthCallback } from "@/auth/AuthProvider";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received");
      return;
    }

    void handleOAuthCallback(code)
      .then(() => {
        // Force reload to pick up new token in AuthProvider
        window.location.href = "/";
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Authentication failed");
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
}
