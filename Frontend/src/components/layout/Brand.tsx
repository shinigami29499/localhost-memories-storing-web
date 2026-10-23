import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="ShinigaCim home">
      <span className="brand__mark" aria-hidden="true">S</span>
      <span>ShinigaCim<span className="brand__dot">.</span></span>
    </Link>
  );
}
