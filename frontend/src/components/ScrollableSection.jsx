import { React, useEffect, useState } from 'react';
import GoogleMaps from './GoogleMaps';
import Map from './Map';
import Distance from './Distance';
import DistanceForm from './DistanceForm';
import Socials from './Socials';
import styles from './modules/ScrollSection.module.css';
import SkyAtlas1 from '../assets/images/SkyAtlas1.svg'
import wavyLine from '../assets/images/WavyLine.svg'
import socialFootersbar from '../assets/images/SocialsFooter.svg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom'


const ScrollableSection = () => {

// Homepage navigation
const navigate = useNavigate()
const homeNav = () => {
  navigate(`/`)
}


// Pop-up scroll message

  // Site visit count
  const [visitCount, setVisitCount] = useState(0);
  
  // Function to track visits using local storage
  const trackVisits = () => {
    const visits = localStorage.getItem('visitCount');
    // If visits are already stored
    if (visits) {
      setVisitCount(parseInt(visits, 10));
    // If no visits are stored
    } else {
      setVisitCount(1);
      localStorage.setItem('visitCount', '1');
    }
  };

  // Function to increment and track visit count
  const trackVisitCount = () => {
    if (visitCount > 0) {
      localStorage.setItem('visitCount', (visitCount + 1).toString());
    }
  };

  // Display suggestion box
  const [showSuggestion, setShowSuggestion] = useState(false);
  const displaySuggestion = () => {
    if (visitCount <= 300) {
      setShowSuggestion(true);
      setTimeout(() => setShowSuggestion(false), 5000);
    }
  };

  useEffect(() => {
    trackVisits();
  }, []);

  useEffect(() => {
    if (visitCount > 0) {
      trackVisitCount();
      displaySuggestion();
    }
  }, [visitCount]);




  return (
    <div className={`${styles["scroll-section"]} ${styles["scroll-section-container"]}`}>
      <header className={styles["site-header"]} >
        <div className={styles["header-container"]}>  
          <h1 className={styles["sr-only"]} style={{ paddingLeft: '20px' }}>
            <img 
              src={SkyAtlas1} alt="Skyatlas Logo" 
              style={{ width: '240px', height: '90px', overflow: 'hidden', objectFit: 'cover', objectPosition: 'center' }}
              onClick={homeNav}
              className={styles["home-button"]}
            />
          </h1>
          <div className={`${styles["fieldset-wrapper"]}`}  >
            <fieldset className={`${styles["customFieldset"]}`}>
              <legend className={styles["sr-only"]}>Effects</legend>
    
            {showSuggestion && (
              <div className={`${styles["suggestion-box"]} ${showSuggestion ? "show" : ""}`}>
                Try me out!
                <FontAwesomeIcon icon={faArrowRight}/>
              </div>
            )}           

              <input type="radio" id="horizontal-scroll-effect" name="effect" value="horizontal-scroll" checked className={styles["sr-only"]} />
              <label htmlFor="horizontal-scroll-effect" className={styles["noComfortaa"]}>Horizontal scroll</label>

              <input type="radio" id="backwards-scroll-effect" name="effect" value="backwards-scroll" className={styles["sr-only"]} />
              <label htmlFor="backwards-scroll-effect" className={styles["noComfortaa"]}>Backwards scroll</label>
              
            </fieldset>
          </div>
        </div>
        <nav>
          <ul className={styles["indicator"]}>
            <li><a href="#googlemaps"><span className={styles["sr-only"]}></span></a></li>
            <li><a href="#map"><span className={styles["sr-only"]}></span></a></li>
            <li><a href="#distance"><span className={styles["sr-only"]}></span></a></li>
            <li><a href="#socials"><span className={styles["sr-only"]}></span></a></li>
          </ul>
        </nav>
      </header>
      <main>
        <section id="googlemaps" className={styles["section"]}>
          <div>
            <div className={`${styles["content"]} ${styles["googlemaps-section"]}`}>

              <GoogleMaps />
            </div>

            <img src={wavyLine} alt="Wavy Line" className={styles["wavy-line-bottom1"]}/>
            <img src={wavyLine} alt="Wavy Line" className={styles["wavy-line-bottom2"]}/>
            

          </div>
        </section>

        <section id="map" className={styles["section"]}>
          <div className={`${styles["content"]} ${styles["map-section"]}`}>
            <div className={styles["googleMapsContainer-Map"]}></div>

            <Map />
          </div>
        </section>

        <section id="distance" className={styles["section"]}>
          <div className={`${styles["content"]} ${styles["distance-section"]} ${styles["flexside-container"]}`}>
              <Distance/>
              <DistanceForm/>
          </div>
        </section>

        <section id="socials" className={styles["section"]}>
            <div className={`${styles["content"]} ${styles["SocialsContainer"]}`} >
                <Socials />

                <img src={socialFootersbar} alt="Socials Footer" className={styles["socialsFooter"]}/>
            </div>
        </section>


      </main>

    </div>
  );
}

export default ScrollableSection;
