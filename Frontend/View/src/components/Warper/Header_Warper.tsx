
import type { ReactNode } from 'react';
import indkanLogo from '../../assets/indkan_leaf_only.png';
import '../../styles/Warper/Warper.css';

interface Header_WarperProps {
  children?: ReactNode;
  logo?: string;
}

function Header_Warper({
  children,
  logo = indkanLogo,
}: Header_WarperProps) {
  return (
    <div className="header-wrapper">
      <header className="header">
        <div className="header-logo-container">
          <img
            src={logo}
            alt="INDKAN Logo"
            className="header-logo"
          />

          <div className="header-text-container">
            <h1 className="header-title">
              INDKAN
            </h1>

            <p className="header-subtitle">
              World Wide Exim Pvt. Ltd.
            </p>
          </div>
        </div>

        {children}
      </header>
    </div>
  );
}

export default Header_Warper;
