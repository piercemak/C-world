import React, { useEffect, useState } from 'react';
import $ from 'jquery';
import styles from './modules/Socials.module.scss';
import profilepic from '../assets/images/ProfilePic.jpeg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faCheck } from '@fortawesome/free-solid-svg-icons';




library.add(faLinkedin);


const Socials = () => {

    const [copied, setCopied] = useState(false);

    const handleCopyClick = () => {
        navigator.clipboard.writeText("Piercefmak@gmail.com")
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Hide the message after 2 seconds
            })
    };
    
    
    const LinkedInButtonClick = () => {
        window.location.href = 'https://www.linkedin.com/in/pierce-makombe-5a8406221';
      };
    
    const GithubButtonClick = () => {
        window.location.href = 'https://github.com/piercemak';
      };
    
    return (
    <div style={{zIndex: 10001}} className={styles["SocialsContainer"]}>

    <div className={styles["me-outer"]}>
        <img className={styles["me"]} src={profilepic}/>
    </div>

      <div className={styles["social"]}>
        <FontAwesomeIcon id='linkedin' icon={faLinkedin} className={styles["linkedin-icon"]} onClick={LinkedInButtonClick}/>
        <FontAwesomeIcon id="github" icon={faGithub} className={styles["github-icon"]} onClick={GithubButtonClick}/>
        <FontAwesomeIcon id="envelop" icon={faEnvelope} className={styles["envelope-icon"]} onClick={handleCopyClick}/>
        {copied && 
                <div className={styles["message-shell"]}>
                    <span className={`${styles["copied-message"]} ${copied ? "show" : ""}`}>
                        <FontAwesomeIcon icon={faCheck} className={styles["checkmark"]}/>
                        Copied to clipboard
                    </span>
                </div>
        }
        
        
      </div>

    </div>
    );
  };
  
  export default Socials;
  