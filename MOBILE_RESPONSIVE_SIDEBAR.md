# Mobile Responsive Sidebar

## Overview

The sidebar is now fully responsive with a hamburger menu for mobile devices.

## Features

### Desktop (lg and above - 1024px+)

- Sidebar is always visible
- Fixed position on the left
- No hamburger menu needed

### Mobile (below 1024px)

- Sidebar is hidden by default
- Hamburger menu button in header
- Sidebar slides in from the left when opened
- Dark overlay behind sidebar
- Close button (X) in sidebar header
- Clicking overlay closes sidebar
- Clicking any nav link closes sidebar

## Implementation Details

### Components Modified

1. **AppLayout.tsx**
   - Added state management for sidebar open/close
   - Passes state to AppSidebar and AppHeader

2. **AppSidebar.tsx**
   - Added props: `isOpen` and `onClose`
   - Fixed positioning with slide animation
   - Dark overlay for mobile
   - Close button (X) for mobile
   - Auto-closes when nav link is clicked

3. **AppHeader.tsx**
   - Added hamburger menu button (visible only on mobile)
   - Added `onMenuClick` prop to trigger sidebar
   - Responsive layout adjustments
   - Some buttons hidden on small screens

## Responsive Breakpoints

- **Mobile**: < 1024px (sidebar hidden, hamburger visible)
- **Desktop**: ≥ 1024px (sidebar visible, hamburger hidden)

## User Experience

### Opening Sidebar (Mobile)

1. Click hamburger menu (☰) in header
2. Sidebar slides in from left
3. Dark overlay appears

### Closing Sidebar (Mobile)

1. Click X button in sidebar
2. Click any navigation link
3. Click dark overlay
4. Sidebar slides out to left

## CSS Classes Used

- `lg:hidden` - Hide on desktop
- `lg:static` - Static positioning on desktop
- `fixed` - Fixed positioning on mobile
- `translate-x-0` - Sidebar visible
- `-translate-x-full` - Sidebar hidden (off-screen)
- `transition-transform` - Smooth slide animation
- `z-40` / `z-50` - Layering (overlay and sidebar)

## Testing

Test on different screen sizes:

- Mobile: < 640px
- Tablet: 640px - 1023px
- Desktop: ≥ 1024px
