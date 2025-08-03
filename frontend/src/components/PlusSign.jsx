import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './modules/plusSign.scss'; 

const PlusSign = ({ pageOptions = [], pageIndex, setPageIndex }) => {
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="centered">
      <div
        className={`plus ${isActive ? 'plus--active' : ''}`}
        onClick={() => setIsActive(!isActive)}
      >
        <div className="plus__line plus__line--v">
          {pageOptions.map((Icon, idx) => (
            <div
              key={idx}
              className="plus__link p-2 size-10 hover:text-green-300/30 rounded-full cursor-pointer transition-colors duration-200"
              onClick={(e) => {
                e.stopPropagation();
                setPageIndex(idx);
                if (idx === 0) {
                  navigate('/home');
                }
                setIsActive(false);
              }}
            >
              {Icon}
            </div>
          ))}
        </div>
        <div className="plus__line plus__line--h"></div>
      </div>
    </div>
  );
};

export default PlusSign;
