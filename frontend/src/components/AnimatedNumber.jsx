import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const AnimatedNumber = ({ value }) => {
  const previous = useRef(value);
  const motionValue = useMotionValue(value);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.4,
      ease: 'easeOut',
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, motionValue]);

  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  return (
    <motion.span className="mr-4 text-white font-bold">
      {rounded}
    </motion.span>
  );
};

export default AnimatedNumber;
