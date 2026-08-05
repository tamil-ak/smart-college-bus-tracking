import React from 'react';

/**
 * Reusable Feature Badge for CBTS landing page
 * @param {Object} props
 * @param {string} props.label - The text label of the badge (e.g. 'Safe')
 */
const FeatureBadge = ({ label }) => {
  return (
    <div className="cbts-badge" title={`Verified ${label}`}>
      <span className="cbts-badge-icon">
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          stroke="currentColor"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span>{label}</span>
    </div>
  );
};

export default FeatureBadge;
