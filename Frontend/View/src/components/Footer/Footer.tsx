import { Link } from 'react-router-dom';
import indkanLogo from '../../assets/indkan_leaf_only.png';
import '../../styles/Footer/Footer.css';

const footerLinks = [
  { label: 'Home', to: '/home' },
  { label: 'About', to: '/about' },
  { label: 'Products', to: '/products' },
  { label: 'Packaging', to: '/packaging' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
];

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <div className="site-footer-brand">
          <Link className="site-footer-logo" to="/home" aria-label="INDKAN home">
            <img src={indkanLogo} alt="" />
            <span>INDKAN</span>
          </Link>
          <p>World Wide Exim Pvt. Ltd.</p>
          <p className="site-footer-description">
            Quality fruit and export solutions connecting farms with the world.
          </p>
        </div>

        <nav className="site-footer-links" aria-label="Footer navigation">
          <h2>Explore</h2>
          {footerLinks.map(({ label, to }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="site-footer-contact">
          <h2>Let’s connect</h2>
          <p>Looking for fruit supply or export information?</p>
          <Link className="site-footer-contact-link" to="/contact">
            Contact our team
          </Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} INDKAN World Wide Exim Pvt. Ltd.</p>
        <Link to="/home">Back to home</Link>
      </div>
    </footer>
  );
}

export default Footer;
