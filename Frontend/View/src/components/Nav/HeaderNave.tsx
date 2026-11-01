import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Nave_Button from './Nave_Button';
import { getCurrentUser } from '../../connection';
import '../../styles/Nav/Nav.css';

interface NavigationLink {
  label: string;
  to: string;
  end?: boolean;
}

const homeLinks: NavigationLink[] = [
  { label: 'Product', to: '/products' },
  { label: 'About', to: '/about' },
  { label: 'Gallery', to: '/gallery' },
];

const productLinks: NavigationLink[] = [
  { label: 'Home', to: '/home', end: true },
  { label: 'Packaging', to: '/packaging' },
  { label: 'Gallery', to: '/gallery' },
];

const aboutLinks: NavigationLink[] = [
  { label: 'Home', to: '/home', end: true },
  { label: 'Contract', to: '/contract' },
  { label: 'Distributor', to: '/distributor' },
  { label: 'Status', to: '/status' },
];

const cartLinks: NavigationLink[] = [
  { label: 'Product', to: '/products' },
  { label: 'Bulk order', to: '/bulk-order' },
  { label: 'Gallery', to: '/gallery' },
];

const orderStatusLinks: NavigationLink[] = [
  { label: 'Successfully delivered', to: '/order/success' },
  { label: 'Pending', to: '/order/pending' },
  { label: 'Cancel', to: '/order/cancel' },
];

const accountLinks: NavigationLink[] = [
  { label: 'Login', to: '/login' },
  { label: 'Log out', to: '/logout' },
  { label: 'Register', to: '/register' },
];

function NavigationDropdown({
  label,
  accessibleLabel,
  links,
}: {
  label: string;
  accessibleLabel: string;
  links: NavigationLink[];
}) {
  return (
    <details className="nav-dropdown">
      <summary className="nav-button" aria-label={accessibleLabel}>
        {label}
      </summary>
      <div className="nav-dropdown-menu">
        {links.map(({ label: linkLabel, to }) => (
          <NavLink key={to} to={to} className="nav-dropdown-link">
            {linkLabel}
          </NavLink>
        ))}
      </div>
    </details>
  );
}

function HeaderNave() {
  const { pathname } = useLocation();
  const isSignedIn = Boolean(localStorage.getItem("indkan_access_token"));
  const [accountRole, setAccountRole] = useState<string | null>(() =>
    isSignedIn ? localStorage.getItem("indkan_user_role") : null,
  );
  const isAuthStartPage = pathname === "/";
  const isAboutPage = ['/about', '/contract', '/distributor', '/export-quantity', '/status']
    .includes(pathname);
  const isProductPage = ['/products', '/product-details', '/packaging', '/gallery'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isCartPage = ['/cart', '/checkout', '/order'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const navigationLinks = isAuthStartPage
    ? []
    : isAboutPage
      ? aboutLinks
      : isProductPage
        ? productLinks
        : isCartPage
          ? cartLinks
          : homeLinks;

  useEffect(() => {
    if (!isSignedIn) return;

    let active = true;
    void getCurrentUser()
      .then((user) => {
        if (!active) return;
        setAccountRole(user.role);
        localStorage.setItem("indkan_user_role", user.role);
      })
      .catch(() => {
        if (!active) return;
        setAccountRole(null);
        localStorage.removeItem("indkan_user_role");
      });

    return () => {
      active = false;
    };
  }, [isSignedIn]);

  const visibleRole = isSignedIn ? accountRole : null;
  const messageRoute = visibleRole === "admin"
    ? "/owner/communications"
    : visibleRole
      ? "/client/messages"
      : "/messages";
  const visibleAccountLinks = visibleRole === "admin"
    ? [{ label: 'Owner dashboard', to: '/owner' }, ...accountLinks]
    : accountLinks;

  return (
    <nav className="site-navigation" aria-label="Main navigation">
      {navigationLinks.map(({ label, to, end }) => (
        <Nave_Button key={to} name={label} to={to} end={end} />
      ))}
      {isSignedIn && (
        <Nave_Button name="Messages" to={messageRoute} />
      )}
      {!isAboutPage && !isAuthStartPage && (
        <>
          <NavigationDropdown
            label="🛒"
            accessibleLabel="Shopping cart and order status"
            links={[
              { label: 'Cart', to: '/cart' },
              ...cartLinks,
              ...orderStatusLinks,
            ]}
          />
          {!isCartPage && (
            <NavigationDropdown
              label="🍎"
              accessibleLabel="Account menu"
              links={visibleAccountLinks}
            />
          )}
        </>
      )}
    </nav>
  );
}

export default HeaderNave;
