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
import InfoIcon from '@mui/icons-material/Info';
import CreateIcon from '@mui/icons-material/Create';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton } from '@mui/material';
import styles from './modules/NavBar.module.css' 




export default function Navbar(props) {
    const {drawerWidth, content} = props
    const location = useLocation();     //Tells us location of where the user is at in the application
    const path = location.pathname      //The URL of where the user is currently at
    
    const [open, setOpen] = React.useState(false);

    const changeOpenStatus = () => {
        setOpen(!open)      //Takes the default value of open (false) and sets it to true or vice versa
    }

    const myDrawer = (
        <div>
             <Toolbar />
            <Box sx={{ overflow: 'auto'}}>
            <List>

                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/" selected={"/" === path}>
                    <ListItemIcon>
                            <HomeIcon/>
                    </ListItemIcon>
                    <ListItemText primary={"Home"} />
                    </ListItemButton>
                </ListItem>             

                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/table" selected={"/table" === path}>
                    <ListItemIcon>
                            <TableChartIcon/>
                    </ListItemIcon>
                    <ListItemText primary={"Table"} />
                    </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/create" selected={"/create" === path}>
                    <ListItemIcon>
                            <CreateIcon/>
                    </ListItemIcon>
                    <ListItemText primary={"Create"} />
                    </ListItemButton>
                </ListItem>

            </List> 
            </Box>
      
        </div>
    )
    

    return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%)' }}>
        <Toolbar               
              sx={{
                '@media (min-width:600px)': {
                  paddingLeft: '10px',
                },
              }}   
          >

          <IconButton  
                color = "inheret"
                onClick={changeOpenStatus}
                sx ={{mr:2,display:{sm:"none"}}}
                >
                <MenuIcon/>
          </IconButton>

          <Box>
            <Typography 
              className={`${styles['comfortaa-font']}`} 
              variant="h6" 
              noWrap component="div" 
              justifyContent='center'           
            >
              CRUD Application 
            </Typography>
          </Box>

        </Toolbar>
      </AppBar>


      <Drawer
        variant="permanent"
        sx={{
        display: {xs: "none", sm: "block"},    //shown all the way until it gets small
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
        >  

        {myDrawer}

      </Drawer>


      <Drawer
        variant="temporary"
        open = {open}
        onClose = {changeOpenStatus}
        sx={{
        display: {xs: "block", sm: "none"},    //shown conditionally depending on whether the icon button has been pressed or not
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
        >  

        {myDrawer}

      </Drawer>


      <Box component="main" sx={{ flexGrow: 1}}>
        <Toolbar />
       
            {content}

      </Box>
    </Box>
  );
}