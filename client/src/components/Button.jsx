import React from 'react';

/**
 * Premium CBTS Button Component
 * @param {Object} props
 * @param {string} props.variant - 'primary' or 'secondary'
 * @param {function} props.onClick - Click handler
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {React.ReactNode} props.children - Button label/content
 */
const Button = ({ variant = 'primary', onClick, type = 'button', children }) => {
  const btnClass = `cbts-btn cbts-btn-${variant}`;

  return (
    <button
      type={type}
      className={btnClass}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
