import '../styles/navbar.css'
import { Link, useNavigate } from "react-router";
import AuthService from "../services/auth.service";

function Navbar() {
  const navigate = useNavigate();

  function handleLogout() {
    AuthService.logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          MyApp
        </Link>
        <Link to="/profile" className="navbar-link">
          Profile
        </Link>
      </div>

      <button onClick={handleLogout} className="navbar-logout">
        Logout
      </button>
    </nav>
  );
}

export default Navbar;
