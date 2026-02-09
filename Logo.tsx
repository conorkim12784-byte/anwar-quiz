
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative ${className} animate-float`}>
      {/* هالة ضوئية خلف الشعار */}
      <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
      
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_10px_15px_rgba(142,109,49,0.5)]"
      >
        {/* النجمة الثمانية (الخلفية) */}
        <path
          d="M100 5L125 75H195L135 115L160 185L100 145L40 185L65 115L5 75H75L100 5Z"
          fill="url(#goldGradient)"
          stroke="#8e6d31"
          strokeWidth="2"
        />
        
        {/* الفانوس المركزي */}
        <g transform="translate(75, 60) scale(0.5)">
          <path
            d="M50 0L85 30V120L50 150L15 120V30L50 0Z"
            fill="#1a1a1a"
            stroke="#c5a059"
            strokeWidth="4"
          />
          {/* نور الفانوس الداخلي */}
          <path
            d="M30 40H70V110H30V40Z"
            fill="url(#lightGradient)"
            className="animate-pulse"
          >
            <animate
              attributeName="fill-opacity"
              values="0.6;1;0.6"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
          {/* زخارف الفانوس */}
          <line x1="30" y1="60" x2="70" y2="60" stroke="#c5a059" strokeWidth="2" />
          <line x1="30" y1="90" x2="70" y2="90" stroke="#c5a059" strokeWidth="2" />
          <line x1="50" y1="40" x2="50" y2="110" stroke="#c5a059" strokeWidth="2" />
        </g>

        {/* التدرجات الللونية */}
        <defs>
          <linearGradient id="goldGradient" x1="5" y1="5" x2="195" y2="195" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fcf6e5" />
            <stop offset="0.5" stopColor="#c5a059" />
            <stop offset="1" stopColor="#8e6d31" />
          </linearGradient>
          <radialGradient id="lightGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 75) rotate(90) scale(45 25)">
            <stop stopColor="#fff9e6" />
            <stop offset="1" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;
