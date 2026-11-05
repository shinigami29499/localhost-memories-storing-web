import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { authService } from "../services/authService";

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async () => {
    const { accessToken, refreshToken, clear } = useAuthStore.getState();
    try {
      if (accessToken && refreshToken) {
        await authService.logout(refreshToken, { Authorization: `Bearer ${accessToken}` });
      }
    } catch {
      // logout is best-effort
    } finally {
      sessionStorage.setItem("shinigacim-logout-toast", "1");
      queryClient.clear();
      clear();
      navigate("/login", { replace: true });
    }
  };
}
