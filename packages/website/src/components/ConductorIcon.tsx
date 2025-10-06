export const ConductorIcon = () => {
  return (
    <div className="conductor-icon">
      <svg
        width="80"
        height="100"
        viewBox="0 0 80 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head */}
        <circle
          cx="40"
          cy="25"
          r="15"
          fill="#333"
          stroke="#000"
          strokeWidth="2"
        />
        
        {/* Body */}
        <rect
          x="28"
          y="40"
          width="24"
          height="35"
          fill="#333"
          stroke="#000"
          strokeWidth="2"
          rx="3"
        />
        
        {/* Baton arm (right) */}
        <line
          x1="52"
          y1="50"
          x2="70"
          y2="35"
          stroke="#333"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Baton */}
        <line
          x1="70"
          y1="35"
          x2="75"
          y2="25"
          stroke="#8B4513"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Music note */}
        <g transform="translate(5, 10)">
          <circle cx="12" cy="20" r="5" fill="#FFD700" />
          <line x1="17" y1="20" x2="17" y2="5" stroke="#FFD700" strokeWidth="2" />
          <path d="M 17 5 Q 22 5, 22 10" fill="none" stroke="#FFD700" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};
