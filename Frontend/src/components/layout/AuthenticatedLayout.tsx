import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AuthenticatedLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Header />
        <div className="app-shell__content">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}
