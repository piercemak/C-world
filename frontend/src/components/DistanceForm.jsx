import { React, useEffect, useMemo, useState} from 'react'
import {Box, IconButton, Typography } from '@mui/material'
import {useForm} from 'react-hook-form'
import AxiosInstance from './Axios'
import MySelectField from './forms/MySelectField'
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom'
import styles from './modules/Slidertest.module.css'
import styles2 from './modules/ScrollSection.module.css';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from "yup"



const DistanceForm = () => {
    const [distances, setDistances] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true)
    const [submissionLoad, setSubmissionLoad] = useState(true)
    const [error, setError] = useState('');

    // Default form values
    const defaultValues = {
        from_location: '',
        to_location: '',
        mode: 'driving'  
    }

    // Validation schema using yup
    const schema = yup
    .object({
        from_location: yup.string().required('From is a required field').notOneOf(
            [yup.ref('to_location'), null], 
            'From and To locations cannot be the same'
          ),
        to_location: yup.string().required('To is a required field').notOneOf(
            [yup.ref('from_location'), null], 
            'From and To locations cannot be the same'
          ),
        mode: yup.string().required('Mode is a required field'),

    })
    // Initialize form control with default values and validation schema
    const { control, handleSubmit, reset} = useForm({defaultValues:defaultValues, resolver: yupResolver(schema)})

    // Fetch distance data
    const GetDistanceData = () => {
        AxiosInstance.get(`distance/`)
        
        .then((res) => {
            setDistances(res.data)
            console.log('test', res.data)
            setLoading(false)
        })

    }

    useEffect(() => {
        GetDistanceData(); 
    },[])


    // Form submission
    const onSubmit = (data) => 
    {   
        AxiosInstance.post(`distance/`, {
            from_location: data.from_location,
            to_location: data.to_location,
            mode: data.mode,
        })
        .then((res) => {
            
            console.log('Distance calculation successful:', res.data);
            setError('');  
            // Update the distances state with the new entry
            setDistances(prevDistances => {
              const newDistances = [...prevDistances, res.data];
              console.log('NEW DISTANCES', newDistances); // Check the updated state
              return newDistances;
            });

            // Clear form fields or show a success message
            reset(defaultValues);
            window.location.reload();
            setSubmissionLoad(false);
        })
        .catch((error) => {
            if (error.response && error.response.data.error) {
                setError(error.response.data.error);
            } else {
                setError('An error occurred.');
            }
            console.error('Distance calculation failed:', error.response || error);
        });

    }
    // Handle form submission click
    const handleSubmitClick = (e) => {
      e.preventDefault(); 
      handleSubmit(onSubmit)(); 
    }



    // Transport modes options
    const modes = [
        { id: 'driving', name: 'Driving' },
        { id: 'walking', name: 'Walking' },
        { id: 'bicycling', name: 'Bicycling' },
        { id: 'transit', name: 'Transit' }
    ]

    const columns = useMemo(
        () => [
            {
              accessorKey: 'id', // Access nested data with dot notation
              header: 'ID',
              size: 150,
              Cell: ({ row }) => {
                const idLength = row.original.id.toString().length;
                const circleSize = idLength === 1 ? '30px' : idLength === 2 ? '40px' : idLength === 3 ? '50px' : '60px';
                return (
                  <div
                    className={`${styles2['circle-background']}`}
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
            accessorKey: 'from_location_name',
            header: 'From Location',
            size: 150,
          },
          {
            accessorKey: 'to_location_name', //normal accessorKey
            header: 'To Location',
            size: 200,
          },
          {
            accessorKey: 'mode',
            header: 'Mode',
            size: 150,
          },
          {
            accessorKey: 'distance_km', //normal accessorKey
            header: 'Distance (km)',
            size: 200,
          },
          {
            accessorKey: 'duration_mins', //normal accessorKey
            header: 'Duration (mins)',
            size: 200,
          },
          {
            accessorKey: 'duration_traffic_mins', //normal accessorKey
            header: 'Duration in Traffic (mins)',
            size: 200,
          }, 
          {
            id: 'actions',
            header: 'Delete',
            accessorFn: row => row.actions,
            Cell: ({row}) => (
                <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '8px'}}>
                  <IconButton color="error" component={Link} to={`/distancedelete/${row.original.id}`}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
            ),
            size: 150
          }    
                   
        ],
        [],
      );

        //Mui React Table targeted Styling
        const oneTheme = createTheme({
  
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


            MuiMenu: {
                styleOverrides: {
                    paper: {                     
                        border: '10px',

                        '&::-webkit-scrollbar': {
                            width: '10px', 
                            backgroundColor: 'rgba(187, 205, 255, 0.554)', // Background color of the scrollbar
                          },
                        
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#848484af', // Color of the scrollbar thumb
                            borderRadius: '10px', // Rounded corners for the thumb
                          },                       

                    }
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
                  color: '#fff !important',
                                  
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
                  // 'Name' through 'duration (mins)'
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
                    },

                    // 'Duration in Traffic (mins)' 
                    '&.MuiBox-root.css-1t5kuvk': {
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



    return (
        <ThemeProvider theme={oneTheme}>
            <div className={styles2["googleMapsContainer-Distance"]}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                      <p style={{ textAlign: 'center' }}>Loading data...</p>
                    </div>
                ) : (
                    <>  
                        <Box sx={{display:'flex', width:'100%', padding:4, flexDirection:'column', fontSize: "18px"}}>
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <MySelectField 
                                    name="from_location"
                                    label="From"
                                    width="100%"
                                    control={control}
                                    options={locations}
                                />
                                <MySelectField 
                                    name="to_location"
                                    label="To"
                                    width="100%"
                                    control={control}
                                    options={locations}
                                />
                                <MySelectField 
                                    name="mode"
                                    label="Transport Mode"
                                    width="100%"
                                    control={control}
                                    options={modes}
                                />
                                    
                                <Box 
                                    onClick={handleSubmitClick}
                                    sx={{width:"31%", fontSize: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: '"Outfit", sans-serif'}}
                                    className={`${styles['ebtn']}`} 
                                > 
                                    Calculate Distance 
                                </Box>
                                {error && (
                                    <Typography color="error" textAlign="center">{error}</Typography>
                                )}   
                            </form>
                        </Box>
                    </>
                )}
            </div>
        </ThemeProvider>
    )
}


export default DistanceForm 