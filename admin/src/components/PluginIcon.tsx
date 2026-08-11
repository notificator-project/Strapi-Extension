/**
 * Compact, monochrome version of the Notificator speech-bubble mark.
 * `currentColor` lets Strapi control its default, hover, and active states.
 */
const PluginIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="20"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 2.75h12.5A2.75 2.75 0 0 1 21.25 5.5v9.75A2.75 2.75 0 0 1 18.5 18H8l-4.75 4V5.5A2.75 2.75 0 0 1 6 2.75Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <circle cx="17.75" cy="6.25" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export { PluginIcon };
