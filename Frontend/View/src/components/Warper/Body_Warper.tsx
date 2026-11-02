
import type { ReactNode } from 'react';
import '../../styles/Warper/Body_Warper.css';

interface Body_WarperProps {
  children: ReactNode;
}

function Body_Warper({ children }: Body_WarperProps) {
  return (
    <div className="body-warper">
      <div className="body-content">
        {children}
      </div>
    </div>
  );
}

export default Body_Warper;
