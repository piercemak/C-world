import { React, useEffect, useState } from 'react'
import {Box, Button, Typography} from '@mui/material'
import AxiosInstance from './Axios'
import {useNavigate, useParams} from 'react-router-dom'
import styles from './modules/Slidertest.module.css'


const Delete = () => {

      
    return (
        <section className={`${styles['asection']}`}>
            { loading ? <p>Loading data...</p> :
                <Box className={`${styles['acontent']}`} sx={{display:'flex', width:'70%', padding:4, flexDirection:'column', fontSize: "18px"}}>
hello                   
                </Box>
            }
            

        </section>
    )
}


export default Delete 