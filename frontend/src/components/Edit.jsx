import { React, useEffect, useState} from 'react'
import {Box,Button, Typography} from '@mui/material'
import MyDatePickerField from './forms/MyDatePickerField'
import MyMultilineField from './forms/MyMultilineField'
import MySelectFieldCRUD from './forms/MySelectFieldCRUD' 
import MyTextField from './forms/MyTextField'
import {useForm} from 'react-hook-form'
import AxiosInstance from './Axios'
import Dayjs from 'dayjs'
import {useNavigate, useParams} from 'react-router-dom'
import styles from './modules/Slidertest.module.css' 


const Edit = () => {
    const MyParam = useParams()
    const MyID = MyParam.id

    const [projectmanager, setProjectmanager] = useState()
    
    const hardcoded_options = [
        {id:"", name:'None'},
        {id:"Open", name:'Open'},
        {id:"In Progress", name:'In Progress'},
        {id:"Completed", name:'Completed'},
    ]

    const [myData, setMyData] = useState()
    const [loading, setLoading] = useState(true)

    const GetData = () => {
        AxiosInstance.get(`projectmanager/`)
        
        .then((res) => {
            setProjectmanager(res.data)
            console.log(res.data)
          
        })        
        
        AxiosInstance.get(`project/${MyID}`)
        
        .then((res) => {
            setMyData(res.data)
            console.log(res.data)
            setValue("name", res.data.name)
            setValue("projectmanager", res.data.projectmanager)
            setValue("status", res.data.status)
            setValue("comments", res.data.comments)
            setValue("start_date", Dayjs(res.data.end_date))
            setValue("end_date", Dayjs(res.data.end_date))
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

    const {handleSubmit, setValue, control} = useForm({defaultValues:defaultValues})
    const submission = (data) => 
    {
        const StartDate = Dayjs(data.start_date["$d"]).format("YYYY-MM-DD")
        const EndDate = Dayjs(data.end_date["$d"]).format("YYYY-MM-DD")
        
        AxiosInstance.put( `project/${MyID}/`, {
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
        <section className={`${styles['asection']}`}>

        { loading ? <p style={{ textAlign: 'center' }}>Loading data...</p> :
            <form onSubmit={handleSubmit(submission)}> 

            <Box className={`${styles['acontent']}`} sx={{display:'flex', width:'100%', padding:4, flexDirection:'column', fontSize: "18px"}}>
                <Box>
                    <h2>Edit Records</h2>
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
                    className={`${styles['bbtn']}`} 
                    sx={{display:'flex', justifyContent:'start', marginTop: "40px"}}    
                    onClick={handleSubmit(submission)} 
                    role="button" 
                    tabIndex="0" 
                >
                    Submit
                </Box>

            </Box>

            </form> }

            <ul className={`${styles['circles2']}`}>
                {Array(10).fill().map((_, index) => (
                <li key={index}></li>
                ))}
            </ul>

        </section>
    )
}


export default Edit 