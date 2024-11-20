import { React, useEffect } from 'react'
import warningBackground from '../assets/images/WarningBackground.svg'
import styles from './modules/MobileWarning.module.css' 


const MobileWarning = () => {
    useEffect(() => {
        const enforceFullHeight = () => {
            const height = window.innerHeight;
            document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
        };

        window.addEventListener('resize', enforceFullHeight);
        window.addEventListener('load', enforceFullHeight);

        // Run once on mount
        enforceFullHeight();

        // Cleanup on unmount
        return () => {
            window.removeEventListener('resize', enforceFullHeight);
            window.removeEventListener('load', enforceFullHeight);
        };
    }, []);

  return (
 
        <div className={styles['mobile-background']}>
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