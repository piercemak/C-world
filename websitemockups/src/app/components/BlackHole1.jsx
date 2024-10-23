import React from 'react';
import styles from './templates/BlackHole.module.scss'; 

const BlackHole = () => {
  return (
    <div className="relative black-hole-container">
      <svg width="0" height="0">
        <filter id="gooey-black-hole">
          <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 50 -16"
            result="goo"
          />
        </filter>
      </svg>

      <div className={styles['black-hole']}>
        <ul className={styles['gooey-container']}>
          <li className={styles['bubble']}></li>
          <li className={styles['bubble']}></li>
          <li className={styles['bubble']}></li>
          <li className={styles['bubble']}></li>
          <li className={styles['bubble']}></li>
          <li className={styles['bubble']}></li>
        </ul>
      </div>
    </div>
  );
};

export default BlackHole;
