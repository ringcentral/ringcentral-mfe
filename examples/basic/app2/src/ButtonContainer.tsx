import React, { useState } from 'react';
// @ts-ignore
import styles from './styles.css';

const ButtonContainer = () => {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => setCount(count + 1)}
    >
      App 2 Button with count({count})
    </button>
  );
};

export default ButtonContainer;
