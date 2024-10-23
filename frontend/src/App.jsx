import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import darkTheme from './components/theme'; 
import Table from './components/Table';
import About from './components/About';
import Create from './components/Create';
import NavBar from './components/NavBar';
import GoogleNavBar from './components/GoogleNavBar';
import Edit from './components/Edit';
import Delete from './components/Delete';
import HomePage from './components/HomePage';
import './App.css';
import GoogleMaps from './components/GoogleMaps';
import GeoCode from './components/Geocode';
import SliderTest from './components/SliderTest'
import Distance from './components/Distance';
import DistanceDelete from './components/DistanceDelete';
import LocationDelete from './components/LocationDelete';
import Map from './components/Map';
import ScrollableSection from './components/ScrollableSection';

function App() {
  const myWidth = 220;
  const myWidth2 = 225;

  return (

    <ThemeProvider theme={darkTheme}>
      <div className="App">
        <Routes>
            {/* Route for the homepage without navbar */}
            <Route path="/homepage" element={<HomePage />} />

            {/* Google-specific routes with GoogleNavBar */}
            <Route path="/googlemap" element={<GoogleNavBar drawerWidth={myWidth2} content={<GoogleMaps />} />} />
            <Route path="/geocode/:id" element={<GoogleNavBar drawerWidth={myWidth2} content={<GeoCode />} />} />
            <Route path="/distance" element={<GoogleNavBar drawerWidth={myWidth2} content={<Distance />} />} />
            <Route path="/distancedelete/:id" element={<GoogleNavBar drawerWidth={myWidth2} content={<DistanceDelete />} />} />
            <Route path="/locationdelete/:id" element={<GoogleNavBar drawerWidth={myWidth2} content={<LocationDelete />} />} />
            <Route path="/map" element={<GoogleNavBar drawerWidth={myWidth2} content={<Map />} />} /> 

            {/* Route for the scrollable section */}
            <Route path="/scrollsection" element={<ScrollableSection />} />
            <Route path="/scrollsection/:id" element={<ScrollableSection />} />

            {/* Other routes with the main NavBar */}
            <Route path="/" element={<NavBar drawerWidth={myWidth} content={<Table />} />} />
            <Route path="/about" element={<NavBar drawerWidth={myWidth} content={<About />} />} />
            <Route path="/create" element={<NavBar drawerWidth={myWidth} content={<Create />} />} />
            <Route path="/edit/:id" element={<NavBar drawerWidth={myWidth} content={<Edit />} />} />
            <Route path="/delete/:id" element={<NavBar drawerWidth={myWidth} content={<Delete />} />} /> 
            <Route path="/slidertest" element={<NavBar drawerWidth={myWidth} content={<SliderTest />} />} />
          </Routes>
      </div>
    </ThemeProvider>

  );
}

export default App;
