import React from 'react'
import { useRef } from "react";
import { motion, useCycle } from "framer-motion";
import { useDimensions } from "./use-dimensions";
import { MenuToggle }  from "./MenuToggle.jsx";
import { Navigation } from "./Navigation.jsx";

const Menu = () => {
  const [isOpen, toggleOpen] = useCycle(false, true);
  const containerRef = useRef(null);
  const { height } = useDimensions(containerRef);

  const sidebar = {
  open: (height = 1000) => ({
    clipPath: `circle(${height * 2 + 200}px at 40px 40px)`,
    transition: {
      type: "spring",
      stiffness: 20,
      restDelta: 2
    }
  }),
  closed: {
    clipPath: "circle(30px at 40px 40px)",
    transition: {
      delay: 0.5,
      type: "spring",
      stiffness: 400,
      damping: 40
    }
  }
};


  return (
    <motion.nav
      initial={false}
      animate={isOpen ? "open" : "closed"}
      ref={containerRef}
      className='absolute top-0 left-0 bottom-0 w-[206px] h-[200px]'
    >
      <motion.div style={{boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)"}} className="absolute top-0 left-0 bottom-0 w-[210px] bg-black/20 backdrop-blur rounded-r-2xl" variants={sidebar} />
      <Navigation />
      <MenuToggle toggle={() => toggleOpen()} />
    </motion.nav>
  )
}

export default Menu