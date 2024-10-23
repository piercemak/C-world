'use client'
import * as React from "react";
import { motion } from "framer-motion";
import { useState } from "react";


export const Input = () => {
  const color2 = "rgb(107 114 128 / var(--tw-text-opacity))"
  
  return (
    <div>
        <motion.input
        className="outline-none flex items-center text-center bg-gray-200 rounded-full shadow-sm font-semibold text-gray-500 placeholder-gray-400 text-sm p-2"
        initial={false}
        placeholder="Enter your email"
        animate={{
            boxShadow: `0 0 0 2px ${color2}, 0 0 0 4px rgba(0, 0, 0, 0)`
        }}
        whileFocus={{
            boxShadow: `0 0 0 4px ${color2}, 0 0 0 50px rgba(0, 0, 0, 0)`,
            transition: {
            boxShadow: {
                duration: 0.3,
                from: `0 0 0 2px ${color2}, 0 0 0 4px rgba(0, 0, 0, 0)`
            }
            }
        }}
        />
        <style jsx>{`
            input::placeholder {
            color: #6b7280; /* Custom placeholder color */
            font-size: 14px; /* Custom font size */
            font-weight: 500; /* Custom font weight */
            }
        `}
        </style>
    </div>
  );
};

const TextBox = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="relative justify-start items-center w-full flex">
      
      <div>
        <Input key={count} />
      </div>
    </div>
  );
};

export default TextBox;
