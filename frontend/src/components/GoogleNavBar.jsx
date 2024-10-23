import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import {Link, useLocation} from 'react-router-dom';
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HomeIcon from '@mui/icons-material/Home';
import TableChartIcon from '@mui/icons-material/TableChart';
import SocialDistanceIcon from '@mui/icons-material/SocialDistance';
import MapIcon from '@mui/icons-material/Map';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton } from '@mui/material';
import styles from './modules/NavBar.module.css' 
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';




export default function GoogleNavBar(props) {
    const {drawerWidth, content} = props
    const location = useLocation();     //Tells us location of where the user is at in the application
    const path = location.pathname      //The URL of where the user is currently at
    
    const [open, setOpen] = React.useState(false);
    const changeOpenStatus = () => {
        setOpen(!open)      //Takes the default value of open (false) and sets it to true or vice versa
    }

    const toggleDrawer = () => {
      setOpen(!open);
    };    

    const myDrawer = (
        <div>
            
            <Box sx={{ overflow: 'auto'}}>

              <Toolbar>
              
              </Toolbar>


              <List>

                  <ListItem disablePadding>
                      <ListItemButton component={Link} to="/homepage" selected={"/homepage" === path}>
                      <ListItemIcon>
                              <HomeIcon/>
                      </ListItemIcon>
                      <ListItemText primary={"Home"} />
                      </ListItemButton>
                  </ListItem>  

                  <ListItem disablePadding>
                      <ListItemButton component={Link} to="/googlemap" selected={"/googlemap" === path}>
                      <ListItemIcon>
                              <TableChartIcon/>
                      </ListItemIcon>
                      <ListItemText primary={"GeoLocations"} />
                      </ListItemButton>
                  </ListItem>  

                  <ListItem disablePadding>
                      <ListItemButton component={Link} to="/distance" selected={"/distance" === path}>
                      <ListItemIcon>
                              <SocialDistanceIcon/>
                      </ListItemIcon>
                      <ListItemText primary={"Distance Calculator"} />
                      </ListItemButton>
                  </ListItem> 

                  <ListItem disablePadding>
                      <ListItemButton component={Link} to="/map" selected={"/map" === path}>
                      <ListItemIcon>
                              <MapIcon/>
                      </ListItemIcon>
                      <ListItemText primary={"Map"} />
                      </ListItemButton>
                  </ListItem> 


              </List> 

            </Box>
      
        </div>
    )
    

    return (
   
      

      <Box 
      >
        <Toolbar/>
       
            {content}

                 

      </Box>
   
  );
}