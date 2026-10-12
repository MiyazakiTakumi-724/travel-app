function Icon({ size = 18, strokeWidth = 2, className, children }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function LinkIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </Icon>
  );
}

export function PencilIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </Icon>
  );
}

export function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Icon>
  );
}

export function ChevronDownIcon(props) {
  return (
    <Icon size={14} strokeWidth={2.4} {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function CloseIcon(props) {
  return (
    <Icon size={20} strokeWidth={2.2} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function CheckIcon(props) {
  return (
    <Icon size={16} strokeWidth={3} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function GoogleIcon({ size = 18 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.4 0-13.8 4.2-17 10.3z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.3 0-9.8-3.1-11.3-7.5l-6.5 5C9.9 39.6 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.6-2.6 4.8-4.9 6.3l6.3 5.3C40.3 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}
