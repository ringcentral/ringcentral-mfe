/* eslint-disable react/button-has-type */
import React, { useEffect, useState } from 'react';
import { transport } from './transport';

const Button = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const removeListener = transport.listen('count', async (n) => {
      console.log('count', n, 'from app1');
      setCount(count + 1);
      return n;
    });
    return () => removeListener!();
  }, [count]);
  return (
    <button
      onClick={() =>
        transport.emit('count1', 1).then((n) => {
          console.log('count1 ====>>', n, 'from app1');
        })
      }
    >
      App 3 Button with count({count})
    </button>
  );
};

export default Button;
