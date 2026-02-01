import * as React from "react";

const AppLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="32"
    viewBox="-2 -2 26 36"
    overflow="visible"
    {...props}
  >
    <g
      id="Page-1"
      fill="none"
      fillRule="evenodd"
      stroke="none"
      strokeLinecap="round"
      strokeWidth="1"
    >
      <g id="Frame" transform="translate(-12.96 -7.121)">
        <g id="Group" transform="translate(11.682 7.036)">
          <g id="Path" stroke="var(--foreground)" strokeLinecap="round" strokeWidth="2">
            <path
              strokeLinejoin="round"
              d="m5.313 1.568 16 5.88a3 3 0 0 1 1.965 2.815V21.61a3 3 0 0 1-1.929 2.802l-16 6.117a3 3 0 0 1-4.07-2.803V4.384a3 3 0 0 1 4.034-2.816"
            ></path>
            <path d="M5.834 6.62v18.605"></path>
          </g>
        </g>
      </g>
    </g>
  </svg>
);

export default AppLogo;
