import { React, useEffect, useMemo, useState } from 'react'
import AxiosInstance from './Axios'
import { MaterialReactTable } from 'material-react-table'
import Dayjs from 'dayjs'
import { Box, IconButton } from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types';
import styles from './modules/ScrollSection.module.css';
import styles2 from './modules/Loading.module.scss'
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import cloudlogo2 from '../assets/images/cloudlogo2.png'





const GoogleMaps = ({className}) => {
    
    const [myData, setMyData] = useState()
    const [loading, setLoading] = useState(true)
    const [geocodeData, setGeocodeData] = useState() 
    const navigate = useNavigate();

    const GetData = () => {
        AxiosInstance.get(`locations/`)
        
        .then((res) => {
            setMyData(res.data)
            console.log(res.data)
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
    },[])
      

    // Manages pagination state of the table rows per page
    const [pagination, setPagination] = useState({
      pageIndex: 0,
      pageSize: 5,
    });



        const columns = useMemo(
          () => [
            {
              accessorKey: 'id', //access nested data with dot notation
              header: 'ID',
              size: 150,
              Cell: ({ row }) => {
                const idLength = row.original.id.toString().length;
                const circleSize = idLength === 1 ? '30px' : idLength === 2 ? '40px' : idLength === 3 ? '50px' : '60px';
                return (
                  <div
                    className={`${styles['circle-background']}`}
                    style={{
                      width: circleSize,
                      height: circleSize,
                      lineHeight: circleSize,
                    }}
                  >
                    {row.original.id}
                  </div>
                );
              },
            },
            {
              accessorKey: 'name',
              header: 'Name',
              size: 150,
            },
            {
              accessorKey: 'address', //normal accessorKey
              header: 'Address',
              size: 200,
            },
            {
              accessorKey: 'zipcode',
              header: 'Zipcode',
              size: 150,
            },
            {
              accessorKey: 'city', //normal accessorKey
              header: 'City',
              size: 200,
            },
            {
              accessorKey: 'country', //normal accessorKey
              header: 'Country',
              size: 200,
            },   
            { 
              accessorKey: 'map', // This can be any unique string that doesn't conflict with your data keys
              header: 'Map',
              Cell: ({ row }) => (
                <div className={`${styles['link-backdrop']}`}>
                  <IconButton style={{ textDecoration: 'none', color: '#4733dd', fontSize: '13px', fontFamily: 'Outfit, sans-serif', fontWeight: '650', width: '100%', height: '100%', paddingTop: '6px', paddingBottom: '6px', borderRadius: '20px', }} onClick={() => handleMapClick(row.original)}>Map</IconButton> 
                </div>
              ),
              size: 150,
            },            
          ],
          [],
        );


  
      //Map button handling
      const handleMapClick = (entry) => {
        // Pass data through state
        console.log('Navigating to map with entry:', entry);
        navigate('/scrollsection#map', { state: { entry } });

        // Scroll to the map section
        const mapSection = document.querySelector('#map');
        if (mapSection) {
          mapSection.scrollIntoView({ behavior: 'smooth' });
        }

      };



        const oneTheme = createTheme({
          palette: {
            background: {
              paper: 'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%)',
            },
          },
          components: {

            //icons
            MuiIconButton: {
              styleOverrides: {
                root: {
                  color: '#4733dd',

                  //color of icon when on first or last page
                  '&.Mui-disabled': {
                    backgroundColor: 'transparent',
                    color: '#aea5ef',
                    
                  },

                },

                colorSecondary: {
                  color: '#F6CE4D'
                },
                colorError: {
                  color: '#9663F7'
                }

              },
            },

            //rows per page background box
            MuiSelect: {
              styleOverrides: {
                root: {
                  backgroundColor: 'rgba(205, 203, 203, 0.425)',
                  opacity: '1',
                  borderRadius: '8px',
                },
                
                select: {
                  backgroundColor: 'rgba(187, 205, 255, 0.554)',
                  borderRadius: '8px',
                  paddingLeft: '20px',
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginBottom: '0px',
                  boxSizing: 'border-box',

                  color: '#494949',
                  fontFamily: 'Outfit, sans-serif !important',
                  fontWeight: '900',
                }

              },
            },


            // Selected menu item
            MuiMenuItem: {
              styleOverrides: {
                root: {
                  '&.Mui-selected': {                
                    color: '#4733dd',
                    backgroundColor: 'rgba(187, 205, 255, 0.554)',
                  },
                },
              },
            },         

            // Menu background
            MuiList: {
              styleOverrides: {
                root: {
                  '&.MuiMenu-list': {                
                    backgroundColor: '#d9d9d9',
                  },
                },
              },
            },   


            //number of results text
            MuiTypography: {
              styleOverrides: {
                root: {
                  color: '#494949',
                  fontFamily: 'Outfit, sans-serif !important',
                  fontWeight: '400',
                },

              },
            },  
            


            // 'Rows per page' text
            MuiInputLabel: {
              styleOverrides: {
                root: {
                  color: '#494949',
                  paddingLeft: '5px',
                  fontFamily: 'Outfit, sans-serif !important',
                  fontWeight: '600',
                },

              },
            },

            ////rows per page number '10'
            MuiInputBase: {
              styleOverrides: {
                root: {
                  color: '#000 !important',
                  fontFamily: '"Outfit", sans-serif'
                                  
                },

              },
            },


            //rows
            MuiTableRow: {
              styleOverrides: {
                root: {
                  color: '#fff !important',
                  
                                  
                },

              },
            },

            //head row text
            MuiTableCell: {
              styleOverrides: {
                root: {
                  // 'Name' through 'Country'
                  '& .Mui-TableHeadCell-Content-Wrapper': {
                    '&.MuiBox-root.css-lapokc': {
                      color: '#494949', 
                      fontFamily: 'Outfit, sans-serif !important', 
                      fontSize: '16px',
                    },

                  // 'ID' 
                    '&.MuiBox-root.css-1nz3nwl': {
                      color: '#494949', 
                      fontFamily: 'Outfit, sans-serif !important',
                      fontSize: '16px', 
                    },

                  // 'Map' 
                  '&.MuiBox-root.css-chb057': {
                    color: '#494949', 
                    fontFamily: 'Outfit, sans-serif !important', 
                    fontSize: '16px',
                  },                    

                  },


                },
              },
            },
           
    
                        
            

            
          },
        });   





    return(
      <ThemeProvider theme={oneTheme}>
          <div className={styles["googleMapsContainer"]}>
              { loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                  <div className={styles2["wrap"]}>
                    <div className={styles2["loading"]}>
                      <div className={styles2["bounceball"]}></div>
                      <div className={styles2["text"]}>NOW LOADING</div>
                    </div>
                  </div>
                </div>
              ) : (
              
            <div className={`${styles['testing']}`}>    
              <Box className={`${styles['atlasTable']}`} >
                <MaterialReactTable 

                  sx = {{overflow: 'auto'}}
                  className={styles["mui-table-container"]}
                  columns={columns} 
                  data={myData}
                  onPaginationChange={setPagination}
                  state={{ pagination }}
                  enableFullScreenToggle={false}


                  //Table Head row 
                  muiTableHeadRowProps={{
                    sx: {
                      bgcolor:'#f7f7f7 !important', 
                      fontFamily: 'Outfit, sans-serif !important',
                         
                                      
                    },
                  }}  

                  //Table rows background
                  muiTableBodyRowProps={{
                    sx: {
                      bgcolor:'#fff !important',
                    },
                  }}  

                  //Bottom toolbar
                  muiBottomToolbarProps={{
                    sx: {
                      bgcolor:'#fff !important',
                      
                    },
                  }}   

                  //Top toolbar background
                  muiTopToolbarProps={{
                    sx: {
                      bgcolor:'#fff !important',
                      //Table lable
                      '&::before': {
                        content: '"Global Observatory Locations"',
                        fontFamily: 'Outfit, sans-serif !important',
                        fontWeight: '800',
                        fontOpticalSizing: 'auto',
                        fontStyle: 'normal',
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        color: '#2f2f2f',
                      },
                      '&::after': {
                        content: '""',
                        display: 'block',
                        width: '45px',
                        height: '45px',
                        backgroundImage: `url(${cloudlogo2})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        position: 'absolute',
                        top: '3px',
                        left: '328px',
                        opacity: 0.81,
                        
                      },


                    },
                  }} 
                  
                  //Row text
                  muiTableBodyCellProps={{
                    sx: {
                      fontFamily: 'Outfit, sans-serif !important',
                      fontWeight: '600',
                      color: '#4f4f4f !important',
                      fontOpticalSizing: 'auto',
                      fontStyle: 'normal',
                    },
                  }} 


                  muiTablePaperProps={{
                    sx: {
                      bgcolor:'transparent !important',
                    },
                    
                  }}


                
                
                
                />
                
              </Box>
            </div>
              )
                  
                  
                            
              
              }   
          </div>
      </ThemeProvider>
    )
}


export default GoogleMaps