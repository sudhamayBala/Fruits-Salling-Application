
import type { ReactNode } from 'react';
import '../../styles/Warper/Body_Warper.css';
import back_Photo from '../../assets/Pastel Fruit Basket with Floating Leaves.png';

interface Body_WarperProps {
  children: ReactNode;
}

function Body_Warper({ children }: Body_WarperProps) {
  return (
    <div className="body-warper">
      <img
        src={back_Photo}
        alt="Pastel fruit basket background"
        className="background-image"
      />

      <div className="body-content">
        {children}
      </div>
    </div>
  );
}

export default Body_Warper;
