export const PianoIcon = () => {
  return (
    <div className="piano-icon">
      <svg
        width="100"
        height="80"
        viewBox="0 0 100 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Piano body */}
        <rect
          x="10"
          y="20"
          width="70"
          height="45"
          fill="#333"
          stroke="#000"
          strokeWidth="2"
          rx="3"
        />
        
        {/* White keys */}
        <rect x="15" y="25" width="8" height="25" fill="white" stroke="#000" strokeWidth="1" />
        <rect x="24" y="25" width="8" height="25" fill="white" stroke="#000" strokeWidth="1" />
        <rect x="33" y="25" width="8" height="25" fill="white" stroke="#000" strokeWidth="1" />
        <rect x="42" y="25" width="8" height="25" fill="white" stroke="#000" strokeWidth="1" />
        <rect x="51" y="25" width="8" height="25" fill="white" stroke="#000" strokeWidth="1" />
        <rect x="60" y="25" width="8" height="25" fill="white" stroke="#000" strokeWidth="1" />
        <rect x="69" y="25" width="8" height="25" fill="white" stroke="#000" strokeWidth="1" />
        
        {/* Black keys */}
        <rect x="21" y="25" width="5" height="15" fill="#000" />
        <rect x="30" y="25" width="5" height="15" fill="#000" />
        <rect x="48" y="25" width="5" height="15" fill="#000" />
        <rect x="57" y="25" width="5" height="15" fill="#000" />
        <rect x="66" y="25" width="5" height="15" fill="#000" />
        
        {/* Piano player (simplified person) */}
        <circle cx="88" cy="45" r="8" fill="#666" stroke="#000" strokeWidth="1.5" />
        <line x1="88" y1="53" x2="88" y2="68" stroke="#666" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
};
