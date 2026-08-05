import React from 'react';

const CampusIllustration = () => {
  return (
    <div className="cbts-illustration-container" aria-label="CBTS Line-Art Illustration">
      <svg
        viewBox="0 0 800 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cbts-illustration-svg"
      >
        {/* Sky / Background Elements */}
        {/* Floating Cloud 1 */}
        <path
          d="M 110 35 A 8 8 0 0 1 126 35 A 14 14 0 0 1 150 42 A 8 8 0 0 1 146 54 L 110 54 Z"
          fill="rgba(11, 61, 145, 0.02)"
          stroke="rgba(11, 61, 145, 0.1)"
          strokeWidth="1.5"
          className="ill-cloud ill-cloud-1"
        />

        {/* Floating Cloud 2 */}
        <path
          d="M 570 25 A 10 10 0 0 1 590 25 A 16 16 0 0 1 618 33 A 10 10 0 0 1 613 47 L 570 47 Z"
          fill="rgba(11, 61, 145, 0.02)"
          stroke="rgba(11, 61, 145, 0.1)"
          strokeWidth="1.5"
          className="ill-cloud ill-cloud-2"
        />

        {/* -------------------- COLLEGE CAMPUS SECTION (Left) -------------------- */}
        
        {/* Tree Left */}
        <rect x="28" y="145" width="4" height="30" fill="var(--text-dark-muted)" />
        <circle
          cx="30"
          cy="135"
          r="14"
          fill="rgba(255, 193, 7, 0.08)"
          stroke="var(--primary-yellow)"
          strokeWidth="1.5"
        />
        <circle
          cx="30"
          cy="135"
          r="10"
          stroke="var(--primary-yellow)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Building 1: Clock Tower */}
        <g className="ill-building-1">
          {/* Main Base */}
          <rect
            x="50"
            y="80"
            width="65"
            height="95"
            fill="#FFFFFF"
            stroke="var(--primary-navy)"
            strokeWidth="2"
          />
          {/* Windows Matrix */}
          <rect x="60" y="92" width="10" height="14" rx="1" fill="rgba(11, 61, 145, 0.05)" stroke="var(--primary-navy)" strokeWidth="1.5" className="ill-window" />
          <rect x="85" y="92" width="10" height="14" rx="1" fill="rgba(11, 61, 145, 0.05)" stroke="var(--primary-navy)" strokeWidth="1.5" className="ill-window" />
          
          <rect x="60" y="118" width="10" height="14" rx="1" fill="rgba(11, 61, 145, 0.05)" stroke="var(--primary-navy)" strokeWidth="1.5" className="ill-window" />
          <rect x="85" y="118" width="10" height="14" rx="1" fill="rgba(11, 61, 145, 0.05)" stroke="var(--primary-navy)" strokeWidth="1.5" className="ill-window" />
          
          <rect x="60" y="144" width="10" height="14" rx="1" fill="rgba(11, 61, 145, 0.05)" stroke="var(--primary-navy)" strokeWidth="1.5" className="ill-window" />
          <rect x="85" y="144" width="10" height="14" rx="1" fill="rgba(11, 61, 145, 0.05)" stroke="var(--primary-navy)" strokeWidth="1.5" className="ill-window" />
          
          {/* Clock Tower Center Ext */}
          <rect
            x="67"
            y="30"
            width="31"
            height="50"
            fill="#FFFFFF"
            stroke="var(--primary-navy)"
            strokeWidth="2"
          />
          {/* Clock Face */}
          <circle
            cx="82.5"
            cy="48"
            r="8"
            stroke="var(--primary-navy)"
            strokeWidth="1.5"
            fill="#FFFFFF"
          />
          <line x1="82.5" y1="48" x2="82.5" y2="43" stroke="var(--primary-navy)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="82.5" y1="48" x2="86.5" y2="48" stroke="var(--primary-navy)" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Roof Spire */}
          <polygon
            points="67,30 82.5,12 98,30"
            fill="var(--primary-navy)"
            stroke="var(--primary-navy)"
            strokeWidth="1.5"
          />
          {/* Small Top Flag */}
          <line x1="82.5" y1="12" x2="82.5" y2="6" stroke="var(--primary-yellow)" strokeWidth="1.5" />
          <polygon points="82.5,6 89,9 82.5,12" fill="var(--primary-yellow)" />
        </g>

        {/* Building 2: Academic Pillars Block */}
        <g className="ill-building-2">
          {/* Base structure */}
          <rect
            x="135"
            y="95"
            width="110"
            height="80"
            fill="#FFFFFF"
            stroke="var(--primary-navy)"
            strokeWidth="2"
          />
          {/* Portico Top Triangle */}
          <polygon
            points="130,95 190,72 250,95"
            fill="var(--primary-yellow)"
            stroke="var(--primary-navy)"
            strokeWidth="2"
          />
          {/* Internal shield emblem in triangle */}
          <circle cx="190" cy="85" r="4" fill="var(--primary-navy)" />

          {/* Pillars */}
          <line x1="152" y1="95" x2="152" y2="175" stroke="var(--primary-navy)" strokeWidth="2.5" />
          <line x1="177" y1="95" x2="177" y2="175" stroke="var(--primary-navy)" strokeWidth="2.5" />
          <line x1="203" y1="95" x2="203" y2="175" stroke="var(--primary-navy)" strokeWidth="2.5" />
          <line x1="228" y1="95" x2="228" y2="175" stroke="var(--primary-navy)" strokeWidth="2.5" />

          {/* Building Door */}
          <path
            d="M 180 175 L 180 150 C 180 145, 200 145, 200 150 L 200 175"
            fill="rgba(11, 61, 145, 0.08)"
            stroke="var(--primary-navy)"
            strokeWidth="1.5"
          />
        </g>

        {/* Building 3: Modern Science/Lab Block */}
        <g className="ill-building-3">
          <rect
            x="265"
            y="70"
            width="80"
            height="105"
            fill="#FFFFFF"
            stroke="var(--primary-navy)"
            strokeWidth="2"
            rx="4"
          />
          {/* Modern Grid Windows */}
          <rect
            x="275"
            y="80"
            width="60"
            height="85"
            fill="rgba(11, 61, 145, 0.03)"
            stroke="var(--primary-navy)"
            strokeWidth="1.5"
            rx="2"
          />
          <line x1="275" y1="101" x2="335" y2="101" stroke="var(--primary-navy)" strokeWidth="1" />
          <line x1="275" y1="122" x2="335" y2="122" stroke="var(--primary-navy)" strokeWidth="1" />
          <line x1="275" y1="143" x2="335" y2="143" stroke="var(--primary-navy)" strokeWidth="1" />
          <line x1="295" y1="80" x2="295" y2="165" stroke="var(--primary-navy)" strokeWidth="1" />
          <line x1="315" y1="80" x2="315" y2="165" stroke="var(--primary-navy)" strokeWidth="1" />
        </g>

        {/* Tree Center */}
        <rect x="368" y="140" width="4" height="35" fill="var(--text-dark-muted)" />
        <polygon
          points="370,110 350,145 390,145"
          fill="rgba(11, 61, 145, 0.05)"
          stroke="var(--primary-navy)"
          strokeWidth="1.5"
        />
        <polygon
          points="370,120 355,145 385,145"
          fill="none"
          stroke="var(--primary-navy)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* -------------------- THE ROAD (Bottom Edge) -------------------- */}
        
        {/* Solid Ground Line */}
        <line x1="0" y1="175" x2="800" y2="175" stroke="var(--primary-navy)" strokeWidth="3" />
        {/* Secondary road border */}
        <line x1="0" y1="198" x2="800" y2="198" stroke="var(--primary-navy)" strokeWidth="1.5" />
        {/* Moving Dashed Road Centerlines */}
        <line
          x1="0"
          y1="187"
          x2="800"
          y2="187"
          stroke="var(--primary-yellow)"
          strokeWidth="2"
          className="ill-road-dashed"
        />

        {/* -------------------- COLLEGE BUS (Center-Right) -------------------- */}
        <g className="ill-bus">
          {/* Shadows */}
          <ellipse cx="490" cy="176" rx="60" ry="4" fill="rgba(11, 61, 145, 0.15)" />

          {/* Side Mirror Left */}
          <path d="M 414 130 C 411 130, 411 136, 414 136 Z" fill="var(--primary-navy)" />
          
          {/* Main Bus Body */}
          <rect
            x="416"
            y="108"
            width="132"
            height="52"
            rx="8"
            fill="#FFFFFF"
            stroke="var(--primary-navy)"
            strokeWidth="3.5"
          />

          {/* Yellow Branding Stripe */}
          <rect
            x="418"
            y="134"
            width="128"
            height="8"
            fill="var(--primary-yellow)"
            stroke="var(--primary-navy)"
            strokeWidth="1"
          />

          {/* Navy Base Bottom Accent */}
          <path
            d="M 418 143 L 546 143 L 546 156 C 546 158, 542 160, 542 160 L 422 160 C 422 160, 418 158, 418 156 Z"
            fill="var(--primary-navy)"
          />

          {/* Windows Outline */}
          {/* Driver Window (Slightly Angled Front) */}
          <path
            d="M 522 114 L 540 114 C 542 114, 543 116, 543 119 L 541 129 C 541 130, 540 131, 539 131 L 522 131 Z"
            fill="rgba(11, 61, 145, 0.08)"
            stroke="var(--primary-navy)"
            strokeWidth="1.75"
          />
          {/* Passenger Windows */}
          <rect x="498" y="114" width="18" height="17" rx="2.5" fill="rgba(11, 61, 145, 0.08)" stroke="var(--primary-navy)" strokeWidth="1.75" />
          <rect x="474" y="114" width="18" height="17" rx="2.5" fill="rgba(11, 61, 145, 0.08)" stroke="var(--primary-navy)" strokeWidth="1.75" />
          <rect x="450" y="114" width="18" height="17" rx="2.5" fill="rgba(11, 61, 145, 0.08)" stroke="var(--primary-navy)" strokeWidth="1.75" />
          <rect x="424" y="114" width="20" height="17" rx="2.5" fill="rgba(11, 61, 145, 0.08)" stroke="var(--primary-navy)" strokeWidth="1.75" />

          {/* Headlight Front */}
          <circle cx="546" cy="141" r="3.5" fill="var(--primary-yellow)" />
          {/* Taillight Back */}
          <circle cx="417" cy="141" r="3" fill="#EF4444" />

          {/* Text Graphic (CBTS Logo) on Bus Side */}
          <text
            x="482"
            y="152"
            fontFamily="var(--font-sans)"
            fontSize="9"
            fontWeight="800"
            fill="var(--primary-yellow)"
            letterSpacing="1"
            textAnchor="middle"
          >
            CBTS EXPRESS
          </text>

          {/* Front Bumper Guard */}
          <rect x="546" y="153" width="4" height="5" rx="1" fill="var(--primary-navy)" />

          {/* Rear Wheel & Rim */}
          <circle cx="446" cy="166" r="14" fill="#FFFFFF" stroke="var(--primary-navy)" strokeWidth="3" />
          <circle cx="446" cy="166" r="8" fill="var(--primary-navy)" />
          <circle cx="446" cy="166" r="3" fill="var(--primary-yellow)" className="ill-bus-wheel" />

          {/* Front Wheel & Rim */}
          <circle cx="516" cy="166" r="14" fill="#FFFFFF" stroke="var(--primary-navy)" strokeWidth="3" />
          <circle cx="516" cy="166" r="8" fill="var(--primary-navy)" />
          <circle cx="516" cy="166" r="3" fill="var(--primary-yellow)" className="ill-bus-wheel" />
        </g>

        {/* -------------------- BUS STOP SECTION (Right) -------------------- */}
        
        {/* Bus Stop Shelter */}
        <g className="ill-bus-stop">
          {/* Station Glass Back Panel */}
          <rect
            x="640"
            y="114"
            width="65"
            height="61"
            fill="rgba(255, 193, 7, 0.04)"
            stroke="var(--primary-navy)"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />

          {/* Bench seat inside shelter */}
          <rect
            x="646"
            y="146"
            width="53"
            height="4"
            rx="1"
            fill="var(--primary-navy)"
          />
          <line x1="656" y1="150" x2="656" y2="175" stroke="var(--primary-navy)" strokeWidth="1.5" />
          <line x1="689" y1="150" x2="689" y2="175" stroke="var(--primary-navy)" strokeWidth="1.5" />

          {/* Main Pillars */}
          <line x1="640" y1="114" x2="640" y2="175" stroke="var(--primary-navy)" strokeWidth="2.5" />
          <line x1="705" y1="114" x2="705" y2="175" stroke="var(--primary-navy)" strokeWidth="2.5" />

          {/* Shelter Roof */}
          <polygon
            points="632,114 713,114 721,104 640,104"
            fill="var(--primary-navy)"
            stroke="var(--primary-navy)"
            strokeWidth="1"
          />
          <rect x="632" y="112" width="81" height="2" fill="var(--primary-yellow)" />

          {/* Bus Stop Standalone Sign */}
          {/* Sign Post */}
          <line x1="615" y1="95" x2="615" y2="175" stroke="var(--primary-navy)" strokeWidth="2" />
          {/* Sign Board (Circle) */}
          <circle
            cx="615"
            cy="95"
            r="12"
            fill="var(--primary-yellow)"
            stroke="var(--primary-navy)"
            strokeWidth="2.25"
          />
          {/* Mini graphic symbol inside Sign Board */}
          <rect x="609" y="90" width="12" height="7" rx="1.5" fill="var(--primary-navy)" />
          <circle cx="612" cy="99" r="1.5" fill="var(--primary-yellow)" />
          <circle cx="618" cy="99" r="1.5" fill="var(--primary-yellow)" />
        </g>
      </svg>
    </div>
  );
};

export default CampusIllustration;
