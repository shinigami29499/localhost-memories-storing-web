import { Brand } from "./Brand";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <Brand />
        <p className="site-footer__message">Share moments. Build community.</p>
        <p className="site-footer__copyright">© {new Date().getFullYear()} ShinigaCim</p>
      </div>
    </footer>
  );
}
