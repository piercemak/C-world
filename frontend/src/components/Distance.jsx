import { React, useEffect, useMemo, useState} from 'react'
import {Box, IconButton, Typography, ButtonBase, Card, CardContent, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from '@mui/material'
import {useForm} from 'react-hook-form'
import AxiosInstance from './Axios'
import {useNavigate, useParams} from 'react-router-dom'
import { MaterialReactTable } from 'material-react-table'
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom'
import styles from './modules/Slidertest.module.css'
import styles2 from './modules/ScrollSection.module.css';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from "yup"
import cloudlogo2 from '../assets/images/cloudlogo2.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';



const Distance = () => {
    const [distances, setDistances] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('');


    const defaultValues = {
        from_location: '',
        to_location: '',
        mode: 'driving'  
    }

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
    const { control, handleSubmit, reset} = useForm({defaultValues:defaultValues, resolver: yupResolver(schema)})



    const GetLocationData = () => {
        AxiosInstance.get(`locations/`)
        
        .then((res) => {
            setLocations(res.data)
            console.log(res.data)
            setLoading(false)
        })

    }



    const GetDistanceData = () => {
        AxiosInstance.get(`distance/`)
        
        .then((res) => {
            setDistances(res.data)
            console.log('test', res.data)
            setLoading(false)
        })

    }

    
    useEffect(() => {
        GetLocationData();
        GetDistanceData(); 
    },[])




    const modes = [
        { id: 'driving', name: 'Driving' },
        { id: 'walking', name: 'Walking' },
        { id: 'bicycling', name: 'Bicycling' },
        { id: 'transit', name: 'Transit' }
    ]


    // Manages pagination state of the table rows per page
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 5,
    });


    //opens message
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    
    const handleClickOpen = (id) => {
        console.log("Opening dialog for ID:", id);
        setDeleteId(id);
        setOpen(true);
    };
    
    const handleClose = () => {
        setOpen(false);
    };

    //Deletes
    const handleConfirmDelete = () => {
      console.log("Deleting ID:", deleteId); 
      AxiosInstance.delete(`distance/${deleteId}/`)
        .then((res) => {
          console.log("Delete response:", res); 
          setOpen(false);
          GetDistanceData(); // Refresh data after deletion
        })
        .catch((error) => {
          console.error('Delete failed:', error);
        });
    };

    const onAddDistance = (newDistance) => {
      setDistances(prevDistances => [...prevDistances, newDistance]);
    }

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
                  <IconButton color="error" onClick={() => handleClickOpen(row.original.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>

                
            ),
            size: 150
          }    
                   
        ],
        [],
      );






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
                            width: '10px', // Adjust scrollbar width if needed
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
    
                        <Box className={`${styles2['atlasTable']}`}>
                            <MaterialReactTable 
                                className={styles2["mui-table-container"]}
                                columns={columns} 
                                data={distances}
                                onPaginationChange={setPagination}
                                state={{ pagination }}
                                enableFullScreenToggle={false}
                                key={distances.length}
                              
                             

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
                                    content: '"Observatory Distance Calculator"',
                                    fontFamily: 'Outfit, sans-serif !important',
                                    fontWeight: '800',
                                    fontOpticalSizing: 'auto',
                                    fontStyle: 'normal',
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    color: '#2f2f2f',
                                    wordWrap: 'break-word',
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
                                    left: '355px',
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


                        <Dialog 
                          open={open} 
                          onClose={handleClose} 
                          //overrides mui dialog css
                          PaperProps={{
                            sx: {
                              backgroundColor: 'transparent',
                              color: 'inherit',
                              transition: 'none',
                              borderRadius: '40px',
                              boxShadow: '#fff',
                              margin: 0,
                              position: 'static',
                              overflowY: 'visible',
                              display: 'block',
                              maxHeight: 'none',
                              maxWidth: '400px',
                            },
                          }}
                  

                        >

                          <Box className={styles2["delete-Container"]}>

                              <FontAwesomeIcon icon={faTrash} className={styles2["trash-icon"]}/>

                              <Box className={styles2["delete-message"]}>
                                  Are you sure you want to permanently erase the selected entry?
                                  
                                  <Box className={styles2["delete-message-sub"]}>
                                    You can't undo this action.               
                                  </Box>               
                              </Box>

                              <Box className={styles2["confirm-container"]}>
                                  <Box 
                                      sx={{width:"30%", fontSize: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center'}} 
                                      className={`${styles2['cancel-button']}`} onClick={handleClose}     
                                  >
                                      Cancel                              
                                  </Box>

                                  <Box 
                                      sx={{width:"30%", fontSize: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center'}} 
                                      className={`${styles2['delete-button']}`} onClick={handleConfirmDelete} 
                                  >
                                      Delete                              
                                  </Box>

                                  
                              </Box>


                          </Box>   

                        </Dialog> 
                        

                  </>
                )}
            </div>
        </ThemeProvider>
    )
}


export default Distance 