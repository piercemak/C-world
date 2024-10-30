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
        Hello
            

        </section>
    )
}


export default Delete 