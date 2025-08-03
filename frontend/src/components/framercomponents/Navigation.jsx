import * as React from "react";
import { motion } from "framer-motion";
import { MenuItem } from "./MenuItem.jsx";

const variants = {
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
  closed: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

export const Navigation = () => (
  <motion.ul variants={variants} className="absolute h-full flex items-center w-full overflow-hidden">
      <MenuItem />
  </motion.ul>
);

const itemIds = [0, 1, 2, 3, 4];
