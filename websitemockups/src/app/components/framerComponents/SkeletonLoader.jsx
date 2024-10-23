"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function App() {
  const [imageLoading, setImageLoading] = useState(true);
  const [pulsing, setPulsing] = useState(true);

  const imageLoaded = () => {
    setImageLoading(false);
    setTimeout(() => setPulsing(false), 600);
  };

  const pulseKeyframes = {
    opacity: [1, 0.3, 1],
  };

  return (
    <div className="App">
      <motion.div
        animate={pulsing ? pulseKeyframes : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={`${pulsing ? "pulse" : ""} rounded-md overflow-hidden m-auto `}
        style={{ width: "600px", background: "#ccc" }}
      >
        <motion.img
          initial={{ height: "16rem", opacity: 0 }}
          animate={{
            height: imageLoading ? "16rem" : "auto",
            opacity: imageLoading ? 0 : 1
          }}
          transition={
            ({ height: { delay: 0, duration: 0.4 } },
            { opacity: { delay: 0.5, duration: 0.4 } })
          }
          onLoad={imageLoaded}
          width="100%"
        />
      </motion.div>
    </div>
  );
}
