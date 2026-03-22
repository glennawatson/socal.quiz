import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigate } from "react-router";

export function LoginPage() {
  const { token, login, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">SoCal Quiz Editor</CardTitle>
          <CardDescription>
            Sign in with Discord to manage your quiz question banks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button size="lg" onClick={() => void login()}>
            Log in with Discord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
