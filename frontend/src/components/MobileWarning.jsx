import React from 'react'
import styles from './modules/MobileWarning.module.css' 
import { useNavigate } from 'react-router-dom';


const MobileWarning = () => {
    const navigate = useNavigate();
    const MobileHomeNav = () => {
        navigate('/mobile');
      };



  return (
 
        <div className={styles['mobile-background']}>
            <div className={styles['mobile-textcontainer1']}>
                <span className={styles['mobile-textbody1']}>Access Denied</span>
                <div className={styles['mobile-textcontainer2']}>
                    <span className={styles['mobile-textbody2']}>The page you requested cannot be accessed on mobile. Please try again on desktop or</span>
                </div>
                <div className={styles['mobile-button']} onClick={MobileHomeNav}>
                    <span className={styles['mobile-buttontext']}>return to main</span>
                </div>
            </div>
        </div>
   

  )
}

export default MobileWarning