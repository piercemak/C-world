import * as React from 'react';
import AxiosInstance from '../Axios'
import { useEffect, useState } from 'react'
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import {Controller} from 'react-hook-form'
import FormHelperText from '@mui/material/FormHelperText';
import {TextField, IconButton, Box, CircularProgress} from '@mui/material'
import { ArrowForward, ArrowBack } from '@mui/icons-material';



export default function MySelectField(props) {
  const [age, setAge] = React.useState('');

  const handleChange = (event) => {
    setAge(event.target.value);
  };




  // Pagination for entries
    
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);  
  
  // Need seperate loading states for Location and Transportation Modes
  const [loadingLocations, setLoadingLocations] = useState(true);  
  const [loadingModes, setLoadingModes] = useState(false); 
  const [locations, setLocations] = useState([]);

  const [filteredLocations, setFilteredLocations] = useState([]);
  const itemsPerPage = 10;
  const [error, setError] = useState('');

  const fetchLocations = () => {
    AxiosInstance.get(`locations/`)
      .then((res) => {
        setLocations(res.data);
        setFilteredLocations(res.data.slice(0, itemsPerPage));
        setTotalPages(Math.ceil(res.data.length / itemsPerPage));
        setLoadingLocations(false);
      })
      .catch((err) => {
        setError('Error fetching locations');
        setLoadingLocations(false);
      });
  };

  useEffect(() => {
    if (['from_location', 'to_location'].includes(props.name)) {
      fetchLocations();
    }
  }, []);


  // useEffect to filter locations based on search term and page number
  useEffect(() => {
    if (['from_location', 'to_location'].includes(props.name)) {
      const filtered = locations.filter((location) =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLocations(filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage));
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    }
  }, [searchTerm, page, locations]);

  // Handle changes to the search term
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1); 
  };

   // Handle page change for pagination
  const handlePageChange = (direction) => {
      if (direction === 'next' && page < totalPages) {
          setPage(page + 1);
      } else if (direction === 'prev' && page > 1) {
          setPage(page - 1);
      }
  };




  const {label, width, name, control, options} = props
  return (
    <Box>
            <Controller
            name = {name}
            control = {control}
            render={({
                field:{onChange, value},
                fieldState:{error},
                formState,
            }) => (
              <FormControl variant="standard" sx={{ width:{width}}}>
              <InputLabel id="demo-simple-select-filled-label">{label}</InputLabel>
              
                <Select
                    labelId="demo-simple-select-filled-label"
                    id="demo-simple-select-filled"
                    onChange={onChange}
                    value={value}
                    error = {!!error}
                    helperText = {error?.message}
                    MenuProps={{
                      disableAutoFocusItem: true,
                      MenuListProps: {
                        onMouseDown: (e) => e.stopPropagation(),
                      },
                    }}  
                    >
                      {['from_location', 'to_location'].includes(name) && (
                        <MenuItem>
                          <TextField
                            placeholder={`Search ${label}`}
                            value={searchTerm}
                            onChange={handleSearchChange}
                            fullWidth
                            margin="dense"
                            onClick={(e) => e.stopPropagation()}  
                            onKeyDown={(e) => e.stopPropagation()}                       
                          />
                        </MenuItem>
                      )}

                      {['from_location', 'to_location'].includes(name) && loadingLocations ? (
                        <MenuItem disabled>
                          <CircularProgress size={24} />
                        </MenuItem>
                      ) : ['from_location', 'to_location'].includes(name) ? (
                        filteredLocations.map((option) => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.name}
                          </MenuItem>
                        ))
                      ) : loadingModes ? ( // Separate loading state for modes
                        <MenuItem disabled>
                          <CircularProgress size={24} />
                        </MenuItem>
                      ) : (
                        options.map((option) => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.name}
                          </MenuItem>
                        ))
                      )}

                      {['from_location', 'to_location'].includes(name) && (
                        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                          <IconButton onClick={() => handlePageChange('prev')} disabled={page <= 1}>
                            <ArrowBack />
                          </IconButton>
                          <span>{page} / {totalPages}</span>
                          <IconButton onClick={() => handlePageChange('next')} disabled={page >= totalPages}>
                            <ArrowForward />
                          </IconButton>
                        </Box>
                      )}
                      
                </Select>

                <FormHelperText sx={{color:"#d32f2f"}}> {error?.message} </FormHelperText>

              </FormControl>

            ) 
            }
            /> 



    </Box>
    
  );
}
