import React, { useEffect, useRef } from 'react'
import styles from './modules/HomepageMobile.module.css' 
import ringNebula from '../assets/images/SouthernRingNebula.svg' 
import googleElement from '../assets/images/GoogleElement.svg' 
import crudBackground from '../assets/images/BlueMockupMobile.svg'
import mockupBackground from '../assets/images/OrangeMockupMobile.svg'
import pmElement from '../assets/images/PMElement.svg'
import constructionElement from '../assets/images/ConstructionElement.svg'
import { Link, useNavigate } from 'react-router-dom';



const HomePageMobile = () => {
    const navigate = useNavigate();
    const CRUDhandleButtonClick = () => {
        navigate('/mobilewarning');
      };
      const GMAPShandleButtonClick = () => {
        navigate('/mobilewarning');
      };
    
      const testnav = () => {
        navigate('/mobile');
      };

    /* Slider swiping and clicking functionality */
    const sliderRef = useRef(null);  
    useEffect(() => {
        const slider = sliderRef.current;
        let startY = 0;
        let endY = 0;

        const handleTouchStart = (e) => {
          startY = e.touches[0].clientY; 
        };
        const handleTouchEnd = (e) => {
          endY = e.changedTouches[0].clientY;
          const items = slider.querySelectorAll(`.${styles['homePage-item']}`);
          if (startY - endY > 50) {
              //Swipe up 
              slider.append(items[0]);

          } else if (endY - startY > 50) {
              //Swipe down 
              slider.prepend(items[items.length - 1]);
          }
        };
        slider.addEventListener('touchstart', handleTouchStart, false);
        slider.addEventListener('touchend', handleTouchEnd, false)
        
        return () => {
            slider.removeEventListener('touchstart', handleTouchStart, false);
            slider.removeEventListener('touchend', handleTouchEnd, false);
        };
    }, []);


    
  return (
    <div className={`${styles['homePageWrapper']}`}>
      <main>
        <ul ref={sliderRef} className={styles['homePage-ul']}>

          {/* List items with background images */}
          <li className={styles['homePage-item']} style={{ background: "#fdba32" }}>
            <div className={styles['Element_container']}>
              <img src={constructionElement} alt="Construction Element" className={styles['ConstructionElement']} />
            </div>
            <div className={styles['homePage-content']}>
              <span className={styles['homePage-title']}>Project in Progress</span>
              <p className={styles['homePage-description']}>
                Currently working on this new project
                <span className={styles['homePage-creation']}>
                    <hr style={{ width: '220px', marginTop: '10px', opacity: 0.5 }}/> 
                    <div style={{ marginTop: '8px', fontSize: 12, opacity: 0.5 }}>To be determined</div>
                </span>
              </p>
              <div className={styles['homePage-button']}>
                  <span className={styles['homePage-buttontext']} onClick={testnav}> Check it Out </span>
              </div>
            </div>
          </li>

          <li className={styles['homePage-item']} style={{ backgroundImage: `url(${ringNebula})` }}>
            <div className={styles['homePage-content']}>
              <span className={styles['homePage-title']}>Astrolarity</span>
              <p className={styles['homePage-description']}>
                A comprehensive database featuring detailed profiles of astronomical objects, interactive calculator, and more.
                <span className={styles['homePage-creation']}>
                    <hr style={{ width: '220px', marginTop: '10px', opacity: 0.5 }}/> 
                    <div style={{ marginTop: '8px', fontSize: 12, opacity: 0.5 }}>July, 2023</div>
                </span>
              </p>
                <a className={styles['homePage-button']} href="https://www.astrolarity.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none'}}>
                  <span className={styles['homePage-buttontext']}> Check it Out </span>
                </a>
            </div>
          </li>

          <li className={styles['homePage-item']} style={{ backgroundImage: `url(${crudBackground})` }}>
            <div className={styles['Element_container']}>
              <img src={pmElement} alt="PM Element" className={styles['PMElement']}/>
            </div>
            <div className={styles['homePage-content']}>
              <span className={styles['homePage-title']}>CRUD Application</span>
              <p className={styles['homePage-description']}>
                A simple CRUD application designed to manage data, supporting the essential operations of Create, Read, Update, and Delete.
                <span className={styles['homePage-creation']}>
                    <hr style={{ width: '220px', marginTop: '10px', opacity: 0.5 }}/> 
                    <div style={{ marginTop: '8px', fontSize: 12, opacity: 0.5 }}>January, 2024</div>
                </span>
              </p>
              <div className={styles['homePage-button']}>
                  <span className={styles['homePage-buttontext']} onClick={CRUDhandleButtonClick}> Check it Out </span>
              </div>
            </div>
          </li>          

          <li className={styles['homePage-item']} style={{ background: '#000' }}>
            <div className={styles['Element_container']}>
              <img src={googleElement} alt="Google Element" className={styles['GoogleElement']}/>
            </div>
            <div className={styles['homePage-content']}>
              <span className={styles['homePage-title']}>Google Maps Application</span>
              <p className={styles['homePage-description']}>
                Utilized the Google Maps API to geocode observatory addresses into coordinates, calculate distances between locations, and plot markers on a map.
                <span className={styles['homePage-creation']}>
                    <hr style={{ width: '220px', marginTop: '10px', opacity: 0.5 }}/> 
                    <div style={{ marginTop: '8px', fontSize: 12, opacity: 0.5 }}>June, 2024</div>
                </span>
              </p>
              <div className={styles['homePage-button']}>
                  <span className={styles['homePage-buttontext']} onClick={GMAPShandleButtonClick}> Check it Out </span>
              </div>
            </div>
          </li>
          <li className={styles['homePage-item']} style={{ backgroundImage: `url(${mockupBackground})` }}>
            <div className={styles['Element_container']}>
              <img src={pmElement} alt="PM Element" className={styles['PMElement']}/>
            </div>
            <div className={styles['homePage-content']}>
              <span className={styles['homePage-title']}>Tailwind Mockups</span>
              <p className={styles['homePage-description']}>
                Company website mockups built with Tailwind CSS and Next.js for modern, responsive design.
                <span className={styles['homePage-creation']}>
                    <hr style={{ width: '220px', marginTop: '10px', opacity: 0.5 }}/> 
                    <div style={{ marginTop: '8px', fontSize: 12, opacity: 0.5 }}>August, 2024</div>
                </span>
              </p>
                <a className={styles['homePage-button']} href="https://portfolioproject-websitemockups-ejqs.onrender.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none' }}>
                    <span className={styles['homePage-buttontext']}> Check it Out </span>
                </a>
            </div>
          </li>



          
        </ul>
      </main>
    </div>
  );
};

export default HomePageMobile;
