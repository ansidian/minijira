export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <span className="footer-label">Made with</span>
          <a
            href="https://react.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <svg
              className="footer-icon"
              viewBox="-11.5 -10.23174 23 20.46348"
              fill="none"
            >
              <circle cx="0" cy="0" r="2.05" fill="#61dafb" />
              <g stroke="#61dafb" strokeWidth="1" fill="none">
                <ellipse rx="11" ry="4.2" />
                <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                <ellipse rx="11" ry="4.2" transform="rotate(120)" />
              </g>
            </svg>
            React
          </a>
          <span className="footer-text">+</span>
          <a
            href="https://vitejs.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <svg className="footer-icon" viewBox="0 0 410 404" fill="none">
              <path
                d="M399.641 59.5246L215.643 388.545C211.844 395.338 202.084 395.378 198.228 388.618L10.5817 59.5563C6.38087 52.1896 12.6802 43.2665 21.0281 44.7586L205.223 77.6824C206.398 77.8924 207.601 77.8904 208.776 77.6763L389.119 44.8058C397.439 43.2894 403.768 52.1434 399.641 59.5246Z"
                fill="url(#paint0_linear)"
              />
              <path
                d="M292.965 1.5744L156.801 28.2552C154.563 28.6937 152.906 30.5903 152.771 32.8664L144.395 174.33C144.198 177.662 147.258 180.248 150.51 179.498L188.42 170.749C191.967 169.931 195.172 173.055 194.443 176.622L183.18 231.775C182.422 235.487 185.907 238.661 189.532 237.56L212.947 230.446C216.577 229.344 220.065 232.527 219.297 236.242L201.398 322.875C200.278 328.294 207.486 331.249 210.492 326.603L212.5 323.5L323.454 102.072C325.312 98.3645 322.108 94.137 318.036 94.9228L279.014 102.454C275.347 103.161 272.227 99.746 273.262 96.1583L298.731 7.86689C299.767 4.27314 296.636 0.855181 292.965 1.5744Z"
                fill="url(#paint1_linear)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear"
                  x1="6.00017"
                  y1="32.9999"
                  x2="235"
                  y2="344"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#41D1FF" />
                  <stop offset="1" stopColor="#BD34FE" />
                </linearGradient>
                <linearGradient
                  id="paint1_linear"
                  x1="194.651"
                  y1="8.81818"
                  x2="236.076"
                  y2="292.989"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#FFEA83" />
                  <stop offset="0.0833333" stopColor="#FFDD35" />
                  <stop offset="1" stopColor="#FFA800" />
                </linearGradient>
              </defs>
            </svg>
            Vite
          </a>
          <span className="footer-text">+</span>
          <a
            href="https://mantine.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <svg
              className="footer-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 163 163"
            >
              <path
                fill="#339AF0"
                d="M162.162 81.5c0-45.011-36.301-81.5-81.08-81.5C36.301 0 0 36.489 0 81.5 0 126.51 36.301 163 81.081 163s81.081-36.49 81.081-81.5z"
              />
              <path
                fill="#fff"
                d="M65.983 43.049a6.234 6.234 0 00-.336 6.884 6.14 6.14 0 001.618 1.786c9.444 7.036 14.866 17.794 14.866 29.52 0 11.726-5.422 22.484-14.866 29.52a6.145 6.145 0 00-1.616 1.786 6.21 6.21 0 00-.694 4.693 6.21 6.21 0 001.028 2.186 6.151 6.151 0 006.457 2.319 6.154 6.154 0 002.177-1.035 50.083 50.083 0 007.947-7.39h17.493c3.406 0 6.174-2.772 6.174-6.194s-2.762-6.194-6.174-6.194h-9.655a49.165 49.165 0 004.071-19.69 49.167 49.167 0 00-4.07-19.692h9.66c3.406 0 6.173-2.771 6.173-6.194 0-3.422-2.762-6.193-6.173-6.193H82.574a50.112 50.112 0 00-7.952-7.397 6.15 6.15 0 00-4.578-1.153 6.189 6.189 0 00-4.055 2.438h-.006z"
              />
              <path
                fill="#fff"
                fillRule="evenodd"
                d="M56.236 79.391a9.342 9.342 0 01.632-3.608 9.262 9.262 0 011.967-3.077 9.143 9.143 0 012.994-2.063 9.06 9.06 0 017.103 0 9.145 9.145 0 012.995 2.063 9.262 9.262 0 011.967 3.077 9.339 9.339 0 01-2.125 10.003 9.094 9.094 0 01-6.388 2.63 9.094 9.094 0 01-6.39-2.63 9.3 9.3 0 01-2.755-6.395z"
                clipRule="evenodd"
              />
            </svg>
            Mantine
          </a>
          <span className="footer-text">•</span>
          <a
            href="https://github.com/ansidian"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <svg
              className="footer-icon"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            ansidian
          </a>
        </div>
      </div>
    </footer>
  );
}
