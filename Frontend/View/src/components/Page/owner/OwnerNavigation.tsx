import { NavLink } from "react-router-dom";
import "../../../styles/page/Owner.css";

export const ownerPages = [
  { label: "Dashboard", path: "/owner", title: "Owner dashboard" },
  { label: "Orders", path: "/owner/orders", title: "Manage orders" },
  { label: "Products", path: "/owner/products", title: "Product catalog" },
  { label: "Add product", path: "/owner/products/new", title: "Add a product" },
  { label: "Clients", path: "/owner/clients", title: "Client directory" },
  { label: "Distributors", path: "/owner/distributors", title: "Manage distributors" },
  { label: "Packaging", path: "/owner/packaging", title: "Packaging records" },
  { label: "Coming soon", path: "/owner/coming-soon", title: "Coming soon products" },
  { label: "Messages", path: "/owner/communications", title: "Messages" },
  { label: "Exports", path: "/owner/exports", title: "Export shipments" },
  { label: "Settings", path: "/owner/settings", title: "Owner settings" },
  { label: "Employee Settings", path: "/owner/employee-settings", title: "Employee settings" },
] as const;

function OwnerNavigation() {
  return (
    <nav className="owner-navigation" aria-label="Owner dashboard navigation">
      {ownerPages.map(({ label, path }) => (
        <NavLink
          className={({ isActive }) =>
            `owner-navigation-link${isActive ? " owner-navigation-link-active" : ""}`
          }
          end={path === "/owner"}
          key={path}
          to={path}
        >
          {label}
        </NavLink>
      ))}
      <NavLink
        className="owner-navigation-link owner-navigation-logout"
        to="/logout"
      >
        Logout
      </NavLink>
    </nav>
  );
}

export default OwnerNavigation;
