import { useState } from 'react';

const Button = () => {
  const [count, setCount] = useState(0);

  return (
    <div
      style={{
        border: '2px solid royalblue',
        borderRadius: 8,
        padding: '12px 16px',
        display: 'inline-block',
      }}
    >
      <p style={{ margin: '0 0 8px' }}>
        Remote — built with <strong>{__BUNDLER__}</strong>
      </p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </div>
  );
};

export default Button;
