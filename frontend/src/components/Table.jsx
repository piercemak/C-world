import { React, useEffect, useMemo, useState } from 'react'
import AxiosInstance from './Axios'
import { MaterialReactTable } from 'material-react-table'
import { Dialog } from '@mui/material'
import Dayjs from 'dayjs'
import { Box, IconButton } from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom'
import styles from './modules/Table.module.css' 
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';






const Table = () => {
    

    const [myData, setMyData] = useState()
    const [loading, setLoading] = useState(true)

    const GetData = () => {
        AxiosInstance.get(`project/`)
        
        .then((res) => {
            setMyData(res.data)
            console.log(res.data)
            setLoading(false)
        })

    }
    
    useEffect(() => {
        GetData(); 
    },[])
      

        const columns = useMemo(
          () => [
            {
              accessorKey: 'name', //access nested data with dot notation
              header: 'Name',
              size: 150,
            },
            {
              accessorKey: 'status',
              header: 'Status',
              size: 150,
            },
            {
              accessorKey: 'comments', //normal accessorKey
              header: 'Comments',
              size: 200,
            },
            {
              accessorFn: (row) => Dayjs(row.start_date).format('MM-DD-YYYY'),
              header: 'Start Date',
              size: 150,
            },
            {
              accessorFn: (row) => Dayjs(row.end_date).format('MM-DD-YYYY'),
              header: 'End Date',
              size: 150,
            },
          ],
          [],
        )        

        const oneTheme = createTheme({
          palette: {
            background: {
              paper: 'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%)',
            },
          },
          components: {
            MuiIconButton: {
              styleOverrides: {
                root: {
                  color: '#fff',
                },

                colorSecondary: {
                  color: '#F6CE4D'
                },
                colorError: {
                  color: '#9663F7'
                }

              },
            },

            MuiSelect: {
              styleOverrides: {
                root: {
                  backgroundColor: '#393A39',
                  opacity: '1',
                  borderRadius: '8px',
                },

              },
            },

            MuiTableCell: {
              styleOverrides: {
                root: {
                  color: '#fff',
                },

              },
            },

            MuiInput: {
              styleOverrides: {
                root: {
                  color: '#fff',
                  paddingLeft: '5px',
                  fontFamily: 'Comfortaa, cursive',
                },

              },
            },

            MuiInputLabel: {
              styleOverrides: {
                root: {
                  color: '#fff',
                  paddingLeft: '5px',
                  fontFamily: 'Comfortaa, cursive',
                  borderRadius: '20px',
                },

              },
            },

            MuiList: {
              styleOverrides: {
                root: {
                  color: '#fff',
                  outlineStyle: 'solid',
                  backgroundColor: '#737373 !important',
                  
                },

              },
            },

            MuiTableSortLabel: {
              styleOverrides: {
                root: {
                  color: '#fff !important',
                                  
                },

              },
            },

            MuiInputBase: {
              styleOverrides: {
                root: {
                  color: '#fff !important',
                                  
                },

              },
            },
            

            
          },
        });   

    return(
      <ThemeProvider theme={oneTheme}>
        <section className={`${styles['asection']}`}>
              { loading ? <p style={{ textAlign: 'center' }}>Loading data...</p> :
             <Box className={`${styles['customTable']}`}>
             <MaterialReactTable
                  columns={columns} 
                  data={myData}                
                  enableRowActions
                  enableRowPinning={true}
                  enableRowSelection={true}
                  enableFullScreenToggle={false}

                  muiTablePaperProps={{
                    sx: {
                      bgcolor:'transparent !important',
                      color: '#fff !important',
                      fontFamily: 'Comfortaa, cursive',
                      width: '100%',
                      height: '100%',
                    },
                    
                  }}  

                  muiTableBodyRowProps={{
                    sx: {
                      bgcolor:'transparent !important',
                    },
                  }}                 
 
                  muiBottomToolbarProps={{
                    sx: {
                      bgcolor:'transparent !important',
                      color: '#fff !important',
                    },
                  }}    

                  muiTopToolbarProps={{
                    sx: {
                      bgcolor:'transparent !important',
                    },
                  }} 
                  
                  muiTableHeadRowProps={{
                    sx: {
                      bgcolor:'transparent !important',                    
                    },
                  }}  

                  muiTableBodyCellProps={{
                    sx: {
                      color: '#fff !important',
                      fontFamily: 'Comfortaa, cursive',
                    },
                  }} 

                  muiColumnActionsButtonProps={{
                    sx: {
                      color: '#fff !important',
                      fontFamily: 'Comfortaa, cursive',
                    },
                  }}
                  
                  muiSelectAllCheckboxProps={{
                    sx: {
                      color: '#fff !important',
                      fontFamily: 'Comfortaa, cursive',
                    },
                  }}

                  muiSelectCheckboxProps={{
                    sx: {
                      color: '#fff !important',
                      fontFamily: 'Comfortaa, cursive',
                    },
                  }}
                  


                  renderRowActions={({row}) => (
                    <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '8px'}}>

                      <IconButton color="secondary" component={Link} to={`/edit/${row.original.id}`}>
                        <EditIcon />
                      </IconButton>

                      <IconButton color="error" component={Link} to={`/delete/${row.original.id}`}>
                        <DeleteIcon />
                      </IconButton>
                      
                    </Box>
                  )}   
                               
              />
             </Box> 
              } 
            <ul className={`${styles['circles']}`}>
                {Array(10).fill().map((_, index) => (
                <li key={index}></li>
                ))}
            </ul>
                
          </section>
        </ThemeProvider>      
    )
}


export default Table