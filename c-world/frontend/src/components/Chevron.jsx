import { motion } from "framer-motion";

const Path = props => (
  <motion.path
    fill="transparent"
    strokeWidth="2"
    stroke="currentColor"
    strokeLinecap="round"
    {...props}
  />
);

const Chevron = ({ isOpen }) => {
  return (
    <motion.svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      initial={false}
      animate={isOpen ? "open" : "closed"}
    >
      <Path
        variants={{
          closed: { d: "M 6 9 L 12 15 L 18 9" },  // ▼ down chevron
          open: { d: "M 6 15 L 12 9 L 18 15" },   // ▲ up chevron
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};

export default Chevron;
