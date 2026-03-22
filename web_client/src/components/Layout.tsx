import { Link, Outlet } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function Layout() {
  const { user, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            SoCal Quiz Editor
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.username}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Log out
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => void login()}>
                Log in with Discord
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
