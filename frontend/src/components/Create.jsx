import { React, useEffect, useState } from 'react'
import {Box,Button, Typography} from '@mui/material'
import MyDatePickerField from './forms/MyDatePickerField'
import MyMultilineField from './forms/MyMultilineField'
import MySelectFieldCRUD from './forms/MySelectFieldCRUD'
import MyTextField from './forms/MyTextField'
import {useForm} from 'react-hook-form'
import AxiosInstance from './Axios'
import Dayjs from 'dayjs'
import {useNavigate} from 'react-router-dom'
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import styles from './modules/Slidertest.module.css' 


const Create = () => {
    const [projectmanager, setProjectmanager] = useState()
    const [loading, setLoading] = useState(true)

    const hardcoded_options = [
        {id:"", name:'None'},
        {id:"Open", name:'Open'},
        {id:"In Progress", name:'In Progress'},
        {id:"Completed", name:'Completed'},
    ]

    const GetData = () => {
        AxiosInstance.get(`projectmanager/`)
        console.log('Backend URL:', import.meta.env.VITE_BACKEND_URL)

        
        .then((res) => {
            setProjectmanager(res.data)
            console.log(res.data)
            setLoading(false)
        })

    }
    
    useEffect(() => {
        GetData(); 
    },[])


    const navigate = useNavigate()
    const defaultValues = {
        name : "", 
        comments : "",
        status : "",

    }

    const schema = yup
    .object({
      name: yup.string().required('Name is a required field'),
      projectmanager: yup.string().required('Project manager is a required field'),
      status: yup.string().required('Status is a required field'),
      comments: yup.string(),
      start_date: yup.date().required('Start Date is a required field'),
      end_date: yup.date().required('End Date is a required field').min(yup.ref('start_date'), 'End date cannot be before the start date'),
    })

    const {handleSubmit, control} = useForm({defaultValues:defaultValues, resolver: yupResolver(schema)})
    const submission = (data) => 
    {
        const StartDate = Dayjs(data.start_date["$d"]).format("YYYY-MM-DD")
        const EndDate = Dayjs(data.end_date["$d"]).format("YYYY-MM-DD")
        
        AxiosInstance.post( `project/`, {
            name: data.name,
            projectmanager: data.projectmanager, 
            status: data.status,
            comments: data.comments,
            start_date: StartDate,
            end_date: EndDate,
        })

        .then((res) => {
            navigate(`/`)
        })

    }

    return (
    <div className={`${styles['createWrapper']}`}>
        <section className={`${styles['asection']}`}>

        { loading ? <p style={{ textAlign: 'center' }}>Loading data...</p> :
            <form onSubmit={handleSubmit(submission)}> 

            <Box className={`${styles['acontent']}`} sx={{display:'flex', width:'100%', padding:4, flexDirection:'column', fontSize: "18px"}}>
                <Box>
                    <h2>Create Records</h2>
                    <Box sx={{marginTop: '20px'}}>
                        <hr></hr>
                    </Box>
                </Box>
               
                    
                
                <Box sx={{display:'flex', justifyContent:'space-around', marginBottom:"10px"}}>
                    <MyTextField  
                        label="Name"
                        name="name"
                        control={control}
                        placeholder="Provide Project Name"
                        width={"30%"}
                    
                    />

                    <MyDatePickerField
                        label="Start Date"
                        name="start_date"
                        control={control}
                        width={"30%"}
                        className={styles['customFieldset']}
                    
                    />

                    <MyDatePickerField
                        label="End Date"
                        name="end_date"
                        control={control}
                        width={"30%"}
                    
                    />                                            


                </Box>

                <Box sx={{display:'flex', justifyContent:'space-around'}}>
                    <MyMultilineField
                        label="Comments"
                        name="comments"
                        control={control}
                        placeholder="Provide Comments"
                        width={"30%"}
                    
                    />

                    <MySelectFieldCRUD
                        label="Status"
                        name="status"
                        control={control}
                        width={"30%"}
                        options = {hardcoded_options}
                    
                    />

                    <MySelectFieldCRUD
                        label="Project manager"
                        name="projectmanager"
                        control={control}
                        width={"30%"}
                        options = {projectmanager}
                    />                  
                                           
                </Box>                

                <Box 
                    className={`${styles['abtn']}`} 
                    sx={{display:'flex', justifyContent:'start', marginTop: "40px"}}    
                    onClick={handleSubmit(submission)} 
                    role="button" 
                    tabIndex="0" 
                >
                    Submit
                </Box>

            </Box>

            </form> }

            <ul className={`${styles['circles']}`}>
                {Array(10).fill().map((_, index) => (
                <li key={index}></li>
                ))}
            </ul>

        </section>

    </div>    
    )
}


export default Create 