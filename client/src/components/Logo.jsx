import React from 'react';

const Logo = () => {
  return (
    <div className="cbts-logo-container" aria-label="CBTS Logo">
      <div className="cbts-logo-glow" />
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cbts-logo-svg"
      >
        {/* Outer Circular Ring representing route track */}
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke="var(--primary-navy)"
          strokeWidth="3.5"
          strokeDasharray="4 2"
          opacity="0.8"
        />

        {/* Outer Solid Ring */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="var(--primary-navy)"
          strokeWidth="3"
        />

        {/* Background Shield */}
        <path
          d="M 50 15 C 68 15, 80 20, 80 35 C 80 65, 50 85, 50 85 C 50 85, 20 65, 20 35 C 20 20, 32 15, 50 15 Z"
          fill="rgba(255, 255, 255, 0.95)"
          stroke="var(--primary-navy)"
          strokeWidth="1.5"
        />

        {/* Stylized Route Connecting Path */}
        <path
          d="M 28 60 C 35 70, 65 70, 72 45"
          stroke="var(--primary-yellow)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Pulsing Locator Pin on the path */}
        <circle
          cx="72"
          cy="45"
          r="6"
          fill="var(--primary-yellow)"
          className="cbts-logo-ping-circle"
        />
        <circle
          cx="72"
          cy="45"
          r="2.5"
          fill="var(--primary-navy)"
        />

        {/* College Graduation Cap Symbol (representing College) */}
        <polygon
          points="50,22 62,26 50,30 38,26"
          fill="var(--primary-navy)"
        />
        <path
          d="M 44 28.5 L 44 32 C 44 34, 56 34, 56 32 L 56 28.5"
          fill="none"
          stroke="var(--primary-navy)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 56 26.5 L 60 31.5 L 60 33"
          fill="none"
          stroke="var(--primary-yellow)"
          strokeWidth="1"
        />

        {/* Clean, Premium Front-view College Bus */}
        {/* Mirror Details */}
        <rect x="31" y="47" width="2" height="5" rx="1" fill="var(--primary-navy)" />
        <rect x="67" y="47" width="2" height="5" rx="1" fill="var(--primary-navy)" />
        
        {/* Main Body */}
        <rect
          x="33"
          y="42"
          width="34"
          height="28"
          rx="5"
          fill="var(--primary-navy)"
        />
        
        {/* Yellow Bumper Line */}
        <rect
          x="33"
          y="62"
          width="34"
          height="3.5"
          fill="var(--primary-yellow)"
        />
        
        {/* Windshield */}
        <rect
          x="37"
          y="46"
          width="26"
          height="11"
          rx="2.5"
          fill="#FFFFFF"
        />
        
        {/* Windshield Division Line */}
        <line
          x1="50"
          y1="46"
          x2="50"
          y2="57"
          stroke="var(--primary-navy)"
          strokeWidth="1"
        />

        {/* Headlights (Glowing Yellow) */}
        <circle cx="39" cy="66" r="2.5" fill="var(--primary-yellow)" />
        <circle cx="61" cy="66" r="2.5" fill="var(--primary-yellow)" />
        
        {/* Grill Detail */}
        <line
          x1="45"
          y1="66"
          x2="55"
          y2="66"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Left and Right Tires */}
        <rect x="37" y="70" width="6" height="4" rx="1.5" fill="#1E293B" />
        <rect x="57" y="70" width="6" height="4" rx="1.5" fill="#1E293B" />
      </svg>
    </div>
  );
};

export default Logo;
