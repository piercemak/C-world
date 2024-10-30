import { React, useEffect, useState } from 'react'
import {Box, Button, Typography} from '@mui/material'
import AxiosInstance from './Axios'
import {useNavigate, useParams} from 'react-router-dom'
import styles from './modules/Slidertest.module.css'


const Delete = () => {
    const MyParam = useParams()
    const MyID = MyParam.id
    
    const [myData, setMyData] = useState()
    const [loading, setLoading] = useState(true)

    const GetData = () => {
        AxiosInstance.get(`project/${MyID}`)
        
        .then((res) => {
            setMyData(res.data)
            console.log(res.data)
            setLoading(false)
        })

    }
    
    useEffect(() => {
        GetData(); 
    },[])     

    const navigate = useNavigate()

    const submission = (data) => 
    {
        AxiosInstance.delete( `project/${MyID}/`)

        .then((res) => {
            navigate(`/`)
        })

    }

    const homeNav = () => {
        navigate(`/`)
    }

    return (
        <section className={`${styles['asection']}`}>
            { loading ? <p>Loading data...</p> :
                <Box className={`${styles['acontent']}`} sx={{display:'flex', width:'70%', padding:4, flexDirection:'column', fontSize: "18px"}}>
                    <Box>
                        <h2>Delete {myData.name}: </h2>
                        <Box sx={{marginTop:'20px'}}>
                            <hr></hr>
                        </Box>

                    </Box>


                    <Box sx={{display:'flex', width:'100%', padding:4, flexDirection:'column'}}>

                        <Box sx={{display:'flex', justifyContent:'center', marginBottom:"40px", fontSize: '25px'}}>
                            Are you sure you want to delete {myData.name}?               
                        </Box>

                        <Box sx={{display: "flex", justifyContent:"center", gap:"16px"}}>
                            <Box 
                                sx={{width:"30%", fontSize: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center'}} 
                                className={`${styles['dbtn']}`} 
                                onClick={homeNav}     
                            >
                                Keep Project                             
                            </Box>

                            <Box 
                                sx={{width:"30%", fontSize: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center'}} 
                                className={`${styles['cbtn']}`} 
                                onClick={submission}       
                            >
                                Delete Project                             
                            </Box>

                            
                        </Box>


                    </Box>                    
                </Box>
            }
            

        </section>
    )
}


export default Delete 