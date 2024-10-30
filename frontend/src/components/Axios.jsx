import axios from 'axios'


const baseURL = import.meta.env.VITE_BACKEND_URL;
const AxiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 5000,
    headers: {
        "Content-Type": "application/json",
        accept: "application/json",
    }


})

export default AxiosInstance