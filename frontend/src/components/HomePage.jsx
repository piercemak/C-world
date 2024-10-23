import React, { useEffect, useRef } from 'react'
import styles from './modules/Homepage.module.css' 
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import ringNebula from '../assets/images/SouthernRingNebula.png' 
import GoogleMapsHome from '../assets/images/GoogleMaps-home.svg' 
import crudimage from '../assets/images/crudapp.png'
import { Link, useNavigate } from 'react-router-dom';



const HomePage = () => {
  const navigate = useNavigate();

  const CRUDhandleButtonClick = () => {
    navigate('/create');
  };
  const GMAPShandleButtonClick = () => {
    navigate('/scrollsection');
  };

  const sliderRef = useRef(null);  

  useEffect(() => {
    const slider = sliderRef.current; // Access the slider DOM element

    const activate = (e) => {
      // Ensure items are selected within the slider component
      const items = slider.querySelectorAll(`.${styles['homePage-item']}`);
      
      //Determines the button clicked and performs an action
      //If 'next' button is clicked, move the first item to the end of the slider
      if (e.target.matches(`.${styles['homePage-btn']}`)) {
        slider.append(items[0]);
      //If 'prev' button is clicked, move the last item to the start of the slider
      } else if (e.target.matches(`.${styles['homePage-btn']}`)) {
        slider.prepend(items[items.length - 1]);
      }
    };

    const handleArrowKeys = (e) => {
      const items = slider.querySelectorAll(`.${styles['homePage-item']}`)
      if(e.key === 'ArrowRight') {
        slider.append(items[0])
      }
      else if(e.key === 'ArrowLeft') {
        slider.prepend(items[items.length - 1])
      }

    }

    // Attatch Event listener to the slider for better scope control
    // Cleanup the event listener on component unmount
    slider.addEventListener('click', activate, false);
    window.addEventListener('keydown', handleArrowKeys);
    return () => {
      slider.removeEventListener('click', activate, false);
      window.removeEventListener('keydown', handleArrowKeys);
    }

  }, []);

  
  return (

    <div className={`${styles['homePageWrapper']}`}>
      <main className={`${styles['homePage']}`}>
        <ul ref={sliderRef} className={styles['homePage-globalReset']}>
          {/* List items with background images */}

          <li className={styles['homePage-item']} style={{ backgroundImage: "url('https://i.redd.it/tc0aqpv92pn21.jpg')" }}>
            <div className={styles['homePage-content']}>
              <h2 className={styles['homePage-title']}>PlaceHolder 1</h2>
              <p className={styles['homePage-description']}>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Tempore fuga voluptatum, iure corporis inventore praesentium nisi. Id laboriosam ipsam enim.</p>
              <button className={styles['homePage-button']}>Read More</button>
            </div>
          </li>

          <li className={styles['homePage-item']} style={{ backgroundImage: `url(${ringNebula})` }}>
            <div className={styles['homePage-content']}>
              <h2 className={styles['homePage-title']}>Astrolarity</h2>
              <p className={styles['homePage-description']}>A comprehensive repository featuring detailed profiles of astronomical objects. Astrolarity encompasses a wide array of celestial entities, from the familiar planets of our Solar System to distant exoplanets, all documented with precision for educational enrichment and astrophysical research.</p>
              <a href="https://www.astrolarity.com" target="_blank" rel="noopener noreferrer">
                <button className={styles['homePage-button']}>Read More</button>
              </a>
            </div>
          </li>

          <li className={styles['homePage-item']} style={{ backgroundImage: `url(${crudimage})` }}>
            <div className={styles['homePage-content']}>
              <h2 className={styles['homePage-title']}>CRUD Application</h2>
              <p className={styles['homePage-description']}>A simple CRUD application designed to manage data, supporting the essential operations of Create, Read, Update, and Delete.</p>
              <button className={styles['homePage-button']} onClick={CRUDhandleButtonClick}>
                Read More
              </button>
            </div>
          </li>

          <li className={styles['homePage-item']} style={{ backgroundImage: `url(${GoogleMapsHome})` }}>
            <div className={styles['homePage-content']}>
              <h2 className={styles['homePage-title']}>Google Maps Application</h2>
              <p className={styles['homePage-description']}>Utilized the Google Maps API to geocode observatory addresses into coordinates, calculate distances between locations, and plot markers on a map.</p>
              <button className={styles['homePage-button']} onClick={GMAPShandleButtonClick}> 
                Read More
              </button>
            </div>
          </li>

          <li className={styles['homePage-item']} style={{ backgroundImage: "url('https://da.se/app/uploads/2015/09/simon-december1994.jpg')" }}>
            <div className={styles['homePage-content']}>
              <h2 className={styles['homePage-title']}>Tailwind Application</h2>
              <p className={styles['homePage-description']}>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Tempore fuga voluptatum, iure corporis inventore praesentium nisi. Id laboriosam ipsam enim.</p>
              <button className={styles['homePage-button']}>Read More</button>
            </div>
          </li>

          
        </ul>
        <nav className={styles['homePage-nav']}>
            <button
              onClick={() => {
                const items = sliderRef.current.querySelectorAll(`.${styles['homePage-item']}`);
                sliderRef.current.prepend(items[items.length - 1]);
              }}
              className={styles['homePage-btn']}
            >
              <FiArrowLeft />
            </button>
            <button
              onClick={() => {
                const items = sliderRef.current.querySelectorAll(`.${styles['homePage-item']}`);
                sliderRef.current.append(items[0]);
              }}
              className={styles['homePage-btn']}
            >
              <FiArrowRight />
            </button>
        </nav>
      </main>
    </div>

  );
};

export default HomePage;
