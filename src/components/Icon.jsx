// Thin wrapper for Google Material Symbols Outlined with dynamic 3D hover animations
export default function Icon({ name, filled = false, size = 24, className = '' }) {
  const cls = filled ? 'material-symbols-filled' : 'material-symbols-outlined'

  // Map distinct 3D hover animations to specific icon names
  let animClass = ''
  switch (name) {
    // 3D Flip Y (Horizon spin)
    case 'dashboard':
    case 'help':
    case 'info':
    case 'verified':
    case 'shield_lock':
    case 'person':
      animClass = 'icon-3d-flip-y'
      break

    // 3D Flip X (Vert flip)
    case 'military_tech':
    case 'grade':
    case 'badge':
    case 'terminal':
      animClass = 'icon-3d-flip-x'
      break

    // 3D Rotation (Spin)
    case 'settings':
    case 'timer':
    case 'sync':
    case 'refresh':
    case 'speed':
      animClass = 'icon-3d-spin'
      break

    // 3D Float up & Tilt
    case 'menu_book':
    case 'school':
    case 'group':
    case 'groups':
    case 'mail':
    case 'calendar_month':
      animClass = 'icon-3d-float'
      break

    // 3D Wobble / Shake
    case 'sports_esports':
    case 'campaign':
    case 'payments':
    case 'account_balance_wallet':
    case 'logout':
      animClass = 'icon-3d-wobble'
      break

    // 3D Pop / Zoom Pulse
    case 'checklist':
    case 'map':
    case 'search':
    case 'notifications':
    case 'add':
    case 'delete':
      animClass = 'icon-3d-pop'
      break

    default:
      animClass = 'icon-3d-pop' // Default 3D pop effect
  }

  return (
    <span
      className={`${cls} ${animClass} ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
