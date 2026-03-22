import { BrowserRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { AuthCallback } from "@/pages/AuthCallback";
import { GuildsPage } from "@/pages/GuildsPage";
import { QuestionBanksPage } from "@/pages/QuestionBanksPage";
import { EditQuestionBankPage } from "@/pages/EditQuestionBankPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <GuildsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guilds/:guildId/banks"
                element={
                  <ProtectedRoute>
                    <QuestionBanksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guilds/:guildId/banks/:bankName"
                element={
                  <ProtectedRoute>
                    <EditQuestionBankPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
