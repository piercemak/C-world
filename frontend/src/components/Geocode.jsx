import { React, useEffect, useMemo, useState} from 'react'
import {Box,Button, Typography} from '@mui/material'
import {useForm} from 'react-hook-form'
import AxiosInstance from './Axios'
import {useNavigate, useParams} from 'react-router-dom'
import { MaterialReactTable } from 'material-react-table'
import styles from './modules/Geocode.module.css' 



const GeoCode = () => {
    const MyParam = useParams()
    const MyID = MyParam.id
    
    const { register, handleSubmit, setValue } = useForm()
    const [myData, setMyData] = useState()
    const [geocodeData, setGeocodeData] = useState() 
    const [loading, setLoading] = useState(true)

    const GetData = () => {
        AxiosInstance.get(`locations/${MyID}`)
        
        .then((res) => {
            setMyData([res.data])
            console.log('data before:', res.data)
            setValue("name", res.data.name)
            setValue("address", res.data.address)
            setValue("zipcode", res.data.zipcode)
            setValue("city", res.data.city)
            setValue("country", res.data.country)
            setLoading(false)    
        })

    }
    
    
    const GetGeoCoords = () => {
        AxiosInstance.get(`geocoder/${MyID}`)

        .then((response) => {
          setGeocodeData([response.data])
          setValue("lat", response.data.lat)
          setValue("lng", response.data.lng)
          console.log('resdata:', response.data)
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
     


    const columns = useMemo(
        () => [
          {
            accessorKey: 'id', //access nested data with dot notation
            header: 'ID',
            size: 150,
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
            accessorKey: 'lat', //normal accessorKey
            header: 'Latitude',
            size: 200,
          },     
          {
            accessorKey: 'lng', //normal accessorKey
            header: 'Longitude',
            size: 200,
          }, 
          {
            accessorKey: 'place_id', //normal accessorKey
            header: 'Place ID',
            size: 200,
          }, 
                   

        ],
        [],
      );




    return (
        <section>
            {loading ? (
                <Typography textAlign="center">Loading data...</Typography>
            ) : (
                <>
                  <Box>
                    <MaterialReactTable 
                      
                      columns={columns} 
                      data={myData} 


                      muiTablePaperProps={{
                        sx: {
                          
                          width: '100%',
                          height: '100%',
                          overflowX: 'auto',
                          flexGrow: 1, 
                          
                        },
                        
                      }}  
                    
                    />
                  </Box>
                </>
            )}
        </section>   
    )
}


export default GeoCode 