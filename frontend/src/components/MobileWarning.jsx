import { React, useEffect } from 'react'
import warningBackground from '../assets/images/WarningBackground.svg'
import styles from './modules/MobileWarning.module.css' 


const MobileWarning = () => {
    useEffect(() => {
        const setHeight = () => {
          document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        };
        setHeight();
        window.addEventListener('resize', setHeight);
        return () => window.removeEventListener('resize', setHeight);
      }, []);


  return (
        <div className={styles['mobile-background']} style={{ backgroundImage: `url(${warningBackground})`, height: 'calc(var(--vh, 1vh) * 100)' }}>
            <div className={styles['mobile-textcontainer1']}>
                <span className={styles['mobile-textbody1']}>Access Denied</span>
                <div className={styles['mobile-textcontainer2']}>
                    <span className={styles['mobile-textbody2']}>The page you requested cannot be accessed on mobile. Please try again on desktop or</span>
                </div>
                <div className={styles['mobile-button']}>
                    <span className={styles['mobile-buttontext']}>return to main</span>
                </div>
            </div>
        </div>
  )
}

export default MobileWarning