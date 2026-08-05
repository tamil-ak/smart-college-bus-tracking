import React from 'react';

/**
 * Reusable RoleCard for selecting register paths
 * @param {Object} props
 * @param {string} props.role - Identifies role option ('student', 'parent', 'management')
 * @param {string} props.title - Card header text
 * @param {string} props.description - Card detail content
 * @param {function} props.onContinue - Trigger callback on continue click
 */
const RoleCard = ({ role, title, description, onContinue }) => {
  
  // Custom high-fidelity inline SVGs for each role type
  const renderIcon = () => {
    switch (role) {
      case 'student':
        return (
          <svg
            viewBox="0 0 64 64"
            fill="none"
            className="cbts-role-icon-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Student Graduation Cap */}
            <polygon
              points="32,12 56,20 32,28 8,20"
              fill="rgba(255, 193, 7, 0.15)"
              stroke="var(--primary-navy)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M 20,24 L 20,38 C 20,44 44,44 44,38 L 44,24"
              stroke="var(--primary-navy)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Tassel */}
            <path
              d="M 46,23 L 46,33 C 46,36 43,37 43,37"
              stroke="var(--primary-yellow)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Book outline at bottom */}
            <path
              d="M 18,48 C 24,46 32,48 32,48 C 32,48 40,46 46,48 M 18,52 L 46,52"
              stroke="var(--primary-navy)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
      case 'parent':
        return (
          <svg
            viewBox="0 0 64 64"
            fill="none"
            className="cbts-role-icon-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft background location tracking rings */}
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="rgba(255, 193, 7, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle
              cx="32"
              cy="32"
              r="20"
              stroke="var(--primary-yellow)"
              strokeWidth="1.5"
              opacity="0.7"
            />

            {/* Parent Figure */}
            <circle cx="25" cy="22" r="5" fill="rgba(11, 61, 145, 0.1)" stroke="var(--primary-navy)" strokeWidth="2.5" />
            <path
              d="M 14,46 C 14,35 36,35 36,46"
              stroke="var(--primary-navy)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Child Figure */}
            <circle cx="41" cy="30" r="4" fill="rgba(255, 193, 7, 0.2)" stroke="var(--primary-navy)" strokeWidth="2" />
            <path
              d="M 32,52 C 32,43 50,43 50,52"
              stroke="var(--primary-navy)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Secure heart node */}
            <path
              d="M 32,15 C 32,15 31,12 29,12 C 27,12 26,14 26,16 C 26,19 32,22 32,22 C 32,22 38,19 38,16 C 38,14 37,12 35,12 C 33,12 32,15 32,15 Z"
              fill="var(--primary-yellow)"
              stroke="var(--primary-navy)"
              strokeWidth="1.25"
            />
          </svg>
        );
      case 'management':
        return (
          <svg
            viewBox="0 0 64 64"
            fill="none"
            className="cbts-role-icon-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Campus Clock/Admin Gate facade */}
            {/* Pediment Roof */}
            <polygon
              points="32,8 54,20 10,20"
              fill="rgba(255, 193, 7, 0.15)"
              stroke="var(--primary-navy)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Building Frame */}
            <rect
              x="14"
              y="20"
              width="36"
              height="34"
              rx="2"
              stroke="var(--primary-navy)"
              strokeWidth="2.5"
              fill="#FFFFFF"
            />
            {/* Pillars */}
            <line x1="22" y1="20" x2="22" y2="54" stroke="var(--primary-navy)" strokeWidth="2.5" />
            <line x1="42" y1="20" x2="42" y2="54" stroke="var(--primary-navy)" strokeWidth="2.5" />

            {/* Administrative Center Badge */}
            <circle
              cx="32"
              cy="34"
              r="7"
              fill="var(--primary-yellow)"
              stroke="var(--primary-navy)"
              strokeWidth="1.5"
            />
            <path
              d="M 32,31 L 32,34 L 34,34"
              stroke="var(--primary-navy)"
              strokeWidth="1.25"
              strokeLinecap="round"
            />

            {/* Steps base */}
            <line x1="8" y1="54" x2="56" y2="54" stroke="var(--primary-navy)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`cbts-role-card role-${role}`} onClick={onContinue}>
      <div className="cbts-role-card-inner">
        <div className="cbts-role-icon-container">
          <div className="cbts-role-icon-bg" />
          {renderIcon()}
        </div>
        <h3 className="cbts-role-card-title">{title}</h3>
        <p className="cbts-role-card-description">{description}</p>
        <button className="cbts-role-btn-continue" type="button" onClick={(e) => {
          e.stopPropagation(); // Avoid double bubble triggers
          onContinue();
        }}>
          Continue
          <span className="btn-arrow">&rarr;</span>
        </button>
      </div>
    </div>
  );
};

export default RoleCard;
