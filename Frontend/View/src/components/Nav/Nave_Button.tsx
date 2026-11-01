import type { MouseEventHandler } from 'react';
import { NavLink } from 'react-router-dom';

interface Nave_ButtonProps {
  name: string;
  to: string;
  variant?: 'default' | 'quote';
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  end?: boolean;
}

function Nave_Button({
  name,
  to,
  variant = 'default',
  onClick,
  end = false,
}: Nave_ButtonProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `nav-button${variant === 'quote' ? ' nav-button-quote' : ''}${
          isActive ? ' nav-button-active' : ''
        }`
      }
    >
      {name}
    </NavLink>
  );
}

export default Nave_Button;
