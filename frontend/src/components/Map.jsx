import { React, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Loader } from "@googlemaps/js-api-loader";
import AxiosInstance from './Axios'
import {useNavigate, useParams, useLocation} from 'react-router-dom'
import {useForm} from 'react-hook-form'
import moonmarker from '../assets/images/moonmarker.png'
import smallcluster from '../assets/images/MarkerClusterCustom1.svg'
import largecluster from '../assets/images/MarkerClusterCustom2.svg'
import styles from './modules/Maps.module.css'
import { MarkerClusterer } from "@googlemaps/markerclusterer";





const Map = () => {
    const mapRef = useRef(null);
    const infoWindowRef = useRef([]);

    

    //Fetch location/geocode data
    const MyParam = useParams()
    const MyID = MyParam.id
    const infoWind = []
    
    const { register, handleSubmit, setValue } = useForm()
    const [mapInstance, setMapInstance] = useState(null);
    const [markers, setMarkers] = useState([]);
    const [myData, setMyData] = useState()
    const [geocodeData, setGeocodeData] = useState() 
    const [loading, setLoading] = useState(true)

    const GetData = () => {
        AxiosInstance.get(`locations/`)
        
        .then((res) => {
            setMyData([res.data])
            console.log('data before:', res.data)
            setLoading(false)    
        })

    }
    const GetGeoCoords = () => {
        AxiosInstance.get(`geocoder/`)
        //parse and set data
        .then((response) => {
          setGeocodeData([response.data])
          console.log('geo:', response.data)
          setGeocodeData(response.data.map(item => ({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lng),
            name: item.name,
            address: item.address, 
            city: item.city,
            zipcode: item.zipcode,
            country: item.country

        })));
          setLoading(false)
        })
        .catch((error) => {
          console.error('Error fetching geocode data:', error);
          setLoading(false);
        });

    }

    useEffect(() => {
        GetData(); 
        GetGeoCoords();
    }, [MyID]) 
     

    const resetView = () => {
        if (mapInstance) {
            mapInstance.setCenter(new google.maps.LatLng(20, 0)); 
            mapInstance.setZoom(2.7); 
            infoWind.current.forEach(iw => iw.close()); 
        }
    };


    //Map button handling
    const location = useLocation();
    const entry = location.state?.entry;
    console.log('Entry received in destination component:', entry);

    useEffect(() => {
        if (mapInstance && entry) {
            console.log('Map instance and entry available, centering map:', entry);
            const { lat, lng } = entry;
            mapInstance.setCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
            mapInstance.setZoom(15);

            //Info window pop-up
            const marker = markers.find(marker => marker.getPosition().lat() === parseFloat(lat) && marker.getPosition().lng() === parseFloat(lng));
            if (marker && marker.infoWindow) {
                marker.infoWindow.open(mapInstance, marker);
            }

        } else {
            if (!mapInstance) console.log('mapInstance not available');
            if (!entry) console.log('entry not available');
        }
    }, [mapInstance, entry]);


    //Map
    useEffect(() => {
        const loader = new Loader({
            apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
            version: "weekly",
            libraries: ["places"],
            
        });

        loader.importLibrary("maps").then(() => {
            if (mapRef.current) {
                const initialCenter = { lat: 20, lng: 0 }
                const initialZoom = 2.7
                const map = new google.maps.Map(mapRef.current, {
                    center: initialCenter,
                    zoom: initialZoom,
                    mapId: "255749da87a8d346",
                });

                setMapInstance(map);

                // Reset Button Element
                const controlButton = document.createElement('button');
                controlButton.textContent = 'Reset View';
                controlButton.className = `${styles['custom-map-control-button']}`;
                controlButton.style.margin = '10px';
                controlButton.style.padding = '5px';
                controlButton.style.fontSize = '12px';

                // Reset the map view and close info window
                controlButton.addEventListener('click', () => {
                    map.setCenter(initialCenter);
                    map.setZoom(initialZoom);
                    infoWindowRef.current.forEach(iw => iw.close()); 
                });

                // Push the control to the map
                map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlButton);

            }
        }).catch(e => console.error('Error loading the Google Maps script', e));

    }, []);


    //Markers
    useEffect(() => {
        if (mapInstance && geocodeData) {
            const newMarkers = geocodeData.map((location) => {

                const markerElement = document.createElement('div');
                markerElement.className = `${styles.pulse}`;
                markerElement.style.backgroundImage = `url(${moonmarker})`;


                const marker1 = new google.maps.Marker({
                    position: { lat: parseFloat(location.lat), lng: parseFloat(location.lng) },
                    map: mapInstance,
                    icon: {
                        url: moonmarker, 
                        scaledSize: new google.maps.Size(32, 32) 
                    },
                    content: markerElement
                    
                });
                
                //Marker Info window
                const infoStyle = `
                    <div>
                        <h3 class="${styles['marker-info-window-content']}">${location.name}</h3>
                        <div class="${styles['info-details']}">
                            <span> ${location.address}</span>
                            <span> ${location.city}</span>
                            <span> ${location.zipcode}</span>
                            <span> ${location.country}</span>
                        </div>
                    </div>
                `;
                const info_window = new google.maps.InfoWindow({
                    content: infoStyle
                });

                marker1.addListener('click', function(){
                    infoWindowRef.current.forEach(iw => iw.close());
                    info_window.open(mapInstance, marker1)
                    mapInstance.setCenter(marker1.getPosition());
                    mapInstance.setZoom(15);
                    
                })
                infoWindowRef.current.push(info_window)

                marker1.infoWindow = info_window;
                return marker1
            });
       
        setMarkers(newMarkers);


        const renderer = {
            render: ({ count, position }) => {
              let url;
              let size;
          
              // Customize based on the count of markers in the cluster
              if (count < 10) {
                url = smallcluster;
                size = new google.maps.Size(110, 110);
              } else if (count < 100) {
                url = largecluster;
                size = new google.maps.Size(110, 110);
              } else {
                url = largecluster;
                size = new google.maps.Size(110, 110);
              }
          
              return new google.maps.Marker({
                position,
                icon: {
                  url,
                  scaledSize: size,
                  labelOrigin: new google.maps.Point(size.width / 2, size.height / 2),
                },
                label: {
                  text: String(count),
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                },
                zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
              });
            },
          };





        new MarkerClusterer({ 
            markers: newMarkers, 
            map: mapInstance, 
            renderer,

        });

        // Close info window when the map itself is clicked                      
        mapInstance.addListener('click', () => {
            infoWindowRef.current.forEach(iw => iw.close());
        });

        }
    }, [geocodeData, mapInstance]);
    






    return (
        <Box 
            ref={mapRef}
            sx={{
                position: 'absolute',
                bottom: '0',
                width: '100%',
                height: 'calc(100vh - 100px)' // Adjust based on header height
              }}
        >
            {/* This Box will serve as the container for the Google Map. */}
          
        </Box>
        
    );
}

export default Map;
