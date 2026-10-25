import { User, Location, Desk, Booking } from '../types/deskBooking';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@acme-corp.internal',
    role: 'employee',
    department: 'Frontend Engineering',
    jobTitle: 'Senior Staff Engineer',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'usr-marcus',
    name: 'Marcus Vance',
    email: 'marcus.vance@acme-corp.internal',
    role: 'employee',
    department: 'Product Design',
    jobTitle: 'Lead Product Designer',
    avatarColor: 'bg-indigo-600',
  },
  {
    id: 'usr-priya',
    name: 'Priya Patel',
    email: 'priya.patel@acme-corp.internal',
    role: 'employee',
    department: 'Core Infrastructure',
    jobTitle: 'Engineering Manager',
    avatarColor: 'bg-rose-600',
  },
  {
    id: 'usr-david',
    name: 'David Kim',
    email: 'david.kim@acme-corp.internal',
    role: 'employee',
    department: 'Enterprise Sales',
    jobTitle: 'Account Executive',
    avatarColor: 'bg-amber-600',
  },
  {
    id: 'usr-admin-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@acme-corp.internal',
    role: 'admin',
    department: 'Workplace Operations',
    jobTitle: 'Director of Workplace & Facilities',
    avatarColor: 'bg-blue-700',
  },
];

export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 'loc-london',
    name: 'London HQ (St. Paul\'s)',
    city: 'London',
    country: 'United Kingdom',
    address: '10 Paternoster Square, London EC4M 7DX',
    timezone: 'Europe/London',
    advanceBookingDaysLimit: 30,
    openingHours: '07:30 - 20:00 (Mon - Fri)',
    description: 'Flagship office featuring agile working neighbourhoods, silent focus pods, and dual-monitor engineering benches overlooking St Paul\'s Cathedral.',
    floors: [
      {
        id: 'flr-ldn-4',
        locationId: 'loc-london',
        name: 'Level 4 - Engineering & Design Wing',
        level: 4,
        zones: [
          {
            id: 'zn-ldn-focus',
            floorId: 'flr-ldn-4',
            name: 'North Pavilion: Silent Focus',
            code: 'ZONE-A',
            description: 'Dedicated whisper-quiet acoustic zone for deep programming and solitary focus.'
          },
          {
            id: 'zn-ldn-collab',
            floorId: 'flr-ldn-4',
            name: 'Central Hub: Agile Collaboration',
            code: 'ZONE-B',
            description: 'Dynamic team cluster zone next to whiteboards and breakout screens.'
          },
          {
            id: 'zn-ldn-window',
            floorId: 'flr-ldn-4',
            name: 'South Terrace: Cathedral View',
            code: 'ZONE-C',
            description: 'Natural light desks with panoramic floor-to-ceiling glass and dual 4K setups.'
          }
        ],
        elements: [
          {
            id: 'elem-lift',
            name: 'Elevator Core & Stairs',
            type: 'stairs',
            x: 2,
            y: 40,
            width: 7,
            height: 20,
            label: 'Lift Core'
          },
          {
            id: 'elem-meeting-1',
            name: 'Boardroom A (Glass Enclosed)',
            type: 'room',
            x: 82,
            y: 8,
            width: 15,
            height: 26,
            label: 'Conf Room A'
          },
          {
            id: 'elem-coffee',
            name: 'Coffee Bar & Kitchenette',
            type: 'kitchen',
            x: 78,
            y: 42,
            width: 18,
            height: 18,
            label: 'Coffee Point'
          },
          {
            id: 'elem-restroom',
            name: 'Restrooms & Showers',
            type: 'restroom',
            x: 2,
            y: 75,
            width: 9,
            height: 18,
            label: 'Restrooms'
          }
        ]
      },
      {
        id: 'flr-ldn-3',
        locationId: 'loc-london',
        name: 'Level 3 - Product & Operations Hub',
        level: 3,
        zones: [
          {
            id: 'zn-ldn3-open',
            floorId: 'flr-ldn-3',
            name: 'Main Atrium Workspace',
            code: 'ZONE-D',
            description: 'Open plan seating with wide desks and acoustic ceiling baffles.'
          }
        ],
        elements: []
      }
    ]
  },
  {
    id: 'loc-ny',
    name: 'New York Hub (Hudson Yards)',
    city: 'New York',
    country: 'United States',
    address: '55 Hudson Yards, Floor 22, New York, NY 10001',
    timezone: 'America/New_York',
    advanceBookingDaysLimit: 21,
    openingHours: '08:00 - 19:30 (Mon - Fri)',
    description: 'Contemporary high-rise loft designed for cross-functional sales and technical client demonstrations.',
    floors: [
      {
        id: 'flr-ny-22',
        locationId: 'loc-ny',
        name: 'Floor 22 - Open Loft & Client Suite',
        level: 22,
        zones: [
          {
            id: 'zn-ny-east',
            floorId: 'flr-ny-22',
            name: 'East Wing: Sales & Solutions',
            code: 'ZONE-NY-A',
            description: 'High energy open benching with call privacy booths.'
          },
          {
            id: 'zn-ny-west',
            floorId: 'flr-ny-22',
            name: 'West Wing: Quiet Engineering Lab',
            code: 'ZONE-NY-B',
            description: 'Dual monitor workstations with ultra-wide curved screens.'
          }
        ],
        elements: [
          {
            id: 'elem-ny-client-rm',
            name: 'Client Presentation Suite',
            type: 'room',
            x: 75,
            y: 10,
            width: 20,
            height: 30,
            label: 'Executive Demo Room'
          }
        ]
      }
    ]
  },
  {
    id: 'loc-berlin',
    name: 'Berlin Tech Studio (Mitte)',
    city: 'Berlin',
    country: 'Germany',
    address: 'Torstraße 120, 10119 Berlin',
    timezone: 'Europe/Berlin',
    advanceBookingDaysLimit: 30,
    openingHours: '08:00 - 20:00 (Mon - Fri)',
    description: 'Industrial tech studio in vibrant Mitte with ergonomic sit-stand setups and acoustic felt focus nooks.',
    floors: [
      {
        id: 'flr-ber-1',
        locationId: 'loc-berlin',
        name: 'Ground Floor & Garden Studio',
        level: 1,
        zones: [
          {
            id: 'zn-ber-courtyard',
            floorId: 'flr-ber-1',
            name: 'Courtyard View Studio',
            code: 'ZONE-BER-A',
            description: 'Direct view onto green courtyard with oak standing workstations.'
          }
        ],
        elements: []
      }
    ]
  }
];

export const INITIAL_DESKS: Desk[] = [
  // London Floor 4 - Zone A (Focus)
  {
    id: 'desk-ldn-401',
    code: 'LDN-401',
    name: 'Desk 401 - Focus Pod Alpha',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-focus',
    deskType: 'quiet_booth',
    equipment: ['Single 32" 4K Dell UltraSharp', 'Acoustic Sound Barrier', 'Electric Sit-Stand', 'USB-C 90W PD'],
    status: 'active',
    position: { x: 14, y: 22 },
    notes: 'Whisper-quiet corner with acoustic partitions on three sides.'
  },
  {
    id: 'desk-ldn-402',
    code: 'LDN-402',
    name: 'Desk 402 - Focus Pod Beta',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-focus',
    deskType: 'standing',
    equipment: ['Dual 27" Dell IPS Displays', 'Electric Sit-Stand Desk', 'Logitech 4K Brio Webcam', 'Herman Miller Embody'],
    status: 'active',
    position: { x: 26, y: 22 },
    notes: 'Height-adjustable standing desk with preset memory buttons.'
  },
  {
    id: 'desk-ldn-403',
    code: 'LDN-403',
    name: 'Desk 403 - Focus Pod Gamma',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-focus',
    deskType: 'dual_screen',
    equipment: ['Dual 27" 4K BenQ Monitors', 'CalDigit TS4 Thunderbolt Dock', 'Mechanical Keyboard (Cherry Red)', 'Ergonomic Mouse'],
    status: 'active',
    position: { x: 38, y: 22 },
    notes: 'Calibrated displays ideal for frontend design and code review.'
  },
  {
    id: 'desk-ldn-404',
    code: 'LDN-404',
    name: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-focus',
    deskType: 'ultrawide',
    allocationType: 'designated',
    designatedUserId: 'usr-sarah',
    designatedUserName: 'Sarah Chen',
    equipment: ['38" Curved UltraWide LG Monitor', 'Thunderbolt 4 Cable', 'Wireless Charging Pad', 'Ergonomic Footrest'],
    status: 'active',
    position: { x: 50, y: 22 },
    notes: 'Designated workstation for Sarah Chen (Senior Staff Engineer).'
  },
  {
    id: 'desk-ldn-405',
    code: 'LDN-405',
    name: 'Desk 405 - Focus Pod Epsilon',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-focus',
    deskType: 'standing',
    equipment: ['Single 27" Apple Studio Display', 'Electric Sit-Stand', 'USB-C Dock', 'Acoustic Desk Screen'],
    status: 'active',
    position: { x: 62, y: 22 },
    notes: 'Compact silent workstation with 5K Studio Display.'
  },
  {
    id: 'desk-ldn-406',
    code: 'LDN-406',
    name: 'Desk 406 - Focus Pod Zeta',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-focus',
    deskType: 'standard',
    equipment: ['Single 27" Dell Monitor', 'USB-C Dongle', 'Ergonomic Task Chair'],
    status: 'active',
    position: { x: 74, y: 22 },
    notes: 'Standard quiet hot desk.'
  },

  // London Floor 4 - Zone B (Collaboration Hub)
  {
    id: 'desk-ldn-410',
    code: 'LDN-410',
    name: 'Desk 410 - Agile Bench 1A',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-collab',
    deskType: 'standard',
    equipment: ['Dual 24" Dell Displays', 'USB-C Universal Hub', 'Whiteboard Adjacent'],
    status: 'active',
    position: { x: 16, y: 52 },
    notes: 'Next to team mobile whiteboard for active pairing sessions.'
  },
  {
    id: 'desk-ldn-411',
    code: 'LDN-411',
    name: 'Desk 411 - Agile Bench 1B',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-collab',
    deskType: 'standard',
    equipment: ['Dual 24" Dell Displays', 'Universal Dock', 'Jabra Speakerphone'],
    status: 'active',
    position: { x: 28, y: 52 },
    notes: 'Facing Desk 410, ideal for sprint partners.'
  },
  {
    id: 'desk-ldn-412',
    code: 'LDN-412',
    name: 'Desk 412 - Agile Bench 2A',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-collab',
    deskType: 'standing',
    equipment: ['34" Curved WQHD Display', 'Electric Sit-Stand', 'USB-C 100W PD'],
    status: 'active',
    position: { x: 44, y: 52 },
    notes: 'Collaborative desk with height adjustment.'
  },
  {
    id: 'desk-ldn-413',
    code: 'LDN-413',
    name: 'Desk 413 - Agile Bench 2B',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-collab',
    deskType: 'standing',
    equipment: ['34" Curved WQHD Display', 'Electric Sit-Stand', 'USB-C 100W PD'],
    status: 'maintenance',
    position: { x: 56, y: 52 },
    notes: 'Monitor arm clamp adjustment in progress by facilities.'
  },
  {
    id: 'desk-ldn-414',
    code: 'LDN-414',
    name: 'Desk 414 - Agile Pod 3',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-collab',
    deskType: 'dual_screen',
    equipment: ['Dual 27" 4K Dell Monitors', 'Thunderbolt Hub', '4K Webcam'],
    status: 'active',
    position: { x: 72, y: 52 },
    notes: 'Equipped for hybrid video pairing.'
  },

  // London Floor 4 - Zone C (Cathedral View / Terrace)
  {
    id: 'desk-ldn-420',
    code: 'LDN-420',
    name: 'Desk 420 - Window Terrace South 1',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-window',
    deskType: 'window_view',
    allocationType: 'requires_approval',
    requiresApproval: true,
    equipment: ['Dual 27" 4K LG Displays', 'Motorized Desk', 'Cathedral Direct View', 'Herman Miller Aeron'],
    status: 'active',
    position: { x: 16, y: 80 },
    notes: 'South-facing Cathedral glass view. Requires manager approval to reserve.'
  },
  {
    id: 'desk-ldn-421',
    code: 'LDN-421',
    name: 'Desk 421 - Window Terrace South 2',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-window',
    deskType: 'window_view',
    allocationType: 'unreserved',
    equipment: ['Dual 27" 4K LG Displays', 'Motorized Desk', 'Cathedral Direct View', 'Herman Miller Aeron'],
    status: 'active',
    position: { x: 30, y: 80 },
    notes: 'Bright window seat with automated solar blinds.'
  },
  {
    id: 'desk-ldn-422',
    code: 'LDN-422',
    name: 'Desk 422 - Window Terrace South 3',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-window',
    deskType: 'ultrawide',
    allocationType: 'requires_approval',
    requiresApproval: true,
    equipment: ['40" Curved 5K2K Display', 'Electric Sit-Stand', 'Anker 12-in-1 Dock'],
    status: 'active',
    position: { x: 50, y: 80 },
    notes: 'Ultra-wide 5K2K display lab workstation. Manager approval required.'
  },
  {
    id: 'desk-ldn-423',
    code: 'LDN-423',
    name: 'Desk 423 - Window Terrace South 4',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-window',
    deskType: 'window_view',
    allocationType: 'unreserved',
    equipment: ['Dual 27" Dell Displays', 'Height Adjustable', 'Natural Oak Finish'],
    status: 'active',
    position: { x: 68, y: 80 },
    notes: 'Spacious desk with extra surface space for notebooks & tablets.'
  },
  {
    id: 'desk-ldn-424',
    code: 'LDN-424',
    name: 'Desk 424 - Executive Window Corner',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-ldn-window',
    deskType: 'window_view',
    allocationType: 'designated',
    designatedDepartment: 'Executive & Legal Leadership',
    equipment: ['Apple Studio Display 5K', 'Standing Desk', 'Acoustic Planters Adjacent'],
    status: 'active',
    position: { x: 84, y: 80 },
    notes: 'Designated corner workstation for Executive & Legal.'
  },

  // New York Floor 22 Desks
  {
    id: 'desk-ny-2201',
    code: 'NY-2201',
    name: 'Desk 2201 - Hudson View Standing 1',
    locationId: 'loc-ny',
    floorId: 'flr-ny-22',
    zoneId: 'zn-ny-west',
    deskType: 'standing',
    allocationType: 'designated',
    designatedUserId: 'usr-david',
    designatedUserName: 'David Kim',
    equipment: ['Dual 27" Dell 4K', 'Electric Sit-Stand', 'USB-C Dock', 'Ergonomic Task Chair'],
    status: 'active',
    position: { x: 20, y: 30 },
    notes: 'Designated desk for David Kim (Enterprise Sales).'
  },
  {
    id: 'desk-ny-2202',
    code: 'NY-2202',
    name: 'Desk 2202 - Hudson View Standing 2',
    locationId: 'loc-ny',
    floorId: 'flr-ny-22',
    zoneId: 'zn-ny-west',
    deskType: 'ultrawide',
    equipment: ['38" Dell Curved IPS', 'Thunderbolt Dock', 'Wireless Qi Charger'],
    status: 'active',
    position: { x: 40, y: 30 },
    notes: 'High-power workstation with single cable docking.'
  },
  {
    id: 'desk-ny-2203',
    code: 'NY-2203',
    name: 'Desk 2203 - Client Bay Alpha',
    locationId: 'loc-ny',
    floorId: 'flr-ny-22',
    zoneId: 'zn-ny-east',
    deskType: 'standard',
    equipment: ['Single 27" Dell Monitor', 'Logitech HD Cam', 'Acoustic Privacy Panels'],
    status: 'active',
    position: { x: 65, y: 65 },
    notes: 'Close to client presentation conference room.'
  },
  {
    id: 'desk-ny-2204',
    code: 'NY-2204',
    name: 'Desk 2204 - Client Bay Beta',
    locationId: 'loc-ny',
    floorId: 'flr-ny-22',
    zoneId: 'zn-ny-east',
    deskType: 'dual_screen',
    equipment: ['Dual 24" Displays', 'Multiport Dock', 'Comfort Armrest Chair'],
    status: 'active',
    position: { x: 80, y: 65 },
    notes: 'Open bench seating.'
  },

  // Berlin Mitte Desks
  {
    id: 'desk-ber-101',
    code: 'BER-101',
    name: 'Desk 101 - Courtyard Oak Bench',
    locationId: 'loc-berlin',
    floorId: 'flr-ber-1',
    zoneId: 'zn-ber-courtyard',
    deskType: 'standing',
    equipment: ['Dual 27" 4K LG Displays', 'Solid Oak Electric Standing', 'USB-C Dock', 'Felt Acoustic Screen'],
    status: 'active',
    position: { x: 25, y: 40 },
    notes: 'Peaceful garden courtyard view.'
  },
  {
    id: 'desk-ber-102',
    code: 'BER-102',
    name: 'Desk 102 - Courtyard Oak Bench 2',
    locationId: 'loc-berlin',
    floorId: 'flr-ber-1',
    zoneId: 'zn-ber-courtyard',
    deskType: 'ultrawide',
    equipment: ['34" Curved Samsung Odyssey', 'USB-C Hub', 'Ergonomic Stool'],
    status: 'active',
    position: { x: 50, y: 40 },
    notes: 'Direct natural light, facing greenery.'
  },
  {
    id: 'desk-ber-103',
    code: 'BER-103',
    name: 'Desk 103 - Focus Alcove',
    locationId: 'loc-berlin',
    floorId: 'flr-ber-1',
    zoneId: 'zn-ber-courtyard',
    deskType: 'quiet_booth',
    equipment: ['Single 32" 4K Display', 'Acoustic Sound Baffle', 'Keypad Lighting'],
    status: 'active',
    position: { x: 75, y: 40 },
    notes: 'Private alcove for focused software delivery.'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  // Today's bookings (2026-10-25)
  {
    id: 'bkg-today-1',
    deskId: 'desk-ldn-404',
    deskCode: 'LDN-404',
    deskName: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-25',
    slot: 'full_day',
    status: 'checked_in',
    createdAt: '2026-10-20T09:15:00.000Z',
    checkInAt: '2026-10-25T08:42:00.000Z',
    notes: 'Working on frontend design system release'
  },
  {
    id: 'bkg-today-2',
    deskId: 'desk-ldn-402',
    deskCode: 'LDN-402',
    deskName: 'Desk 402 - Focus Pod Beta',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-marcus',
    userName: 'Marcus Vance',
    userEmail: 'marcus.vance@acme-corp.internal',
    userDepartment: 'Product Design',
    date: '2026-10-25',
    slot: 'full_day',
    status: 'confirmed',
    createdAt: '2026-10-22T11:00:00.000Z',
    notes: 'Figma review & user prototype testing'
  },
  {
    id: 'bkg-today-3',
    deskId: 'desk-ldn-420',
    deskCode: 'LDN-420',
    deskName: 'Desk 420 - Window Terrace South 1',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-priya',
    userName: 'Priya Patel',
    userEmail: 'priya.patel@acme-corp.internal',
    userDepartment: 'Core Infrastructure',
    date: '2026-10-25',
    slot: 'morning',
    status: 'checked_in',
    createdAt: '2026-10-23T14:30:00.000Z',
    checkInAt: '2026-10-25T08:50:00.000Z',
    notes: 'Morning infrastructure standup'
  },
  {
    id: 'bkg-today-4',
    deskId: 'desk-ldn-410',
    deskCode: 'LDN-410',
    deskName: 'Desk 410 - Agile Bench 1A',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-david',
    userName: 'David Kim',
    userEmail: 'david.kim@acme-corp.internal',
    userDepartment: 'Enterprise Sales',
    date: '2026-10-25',
    slot: 'afternoon',
    status: 'confirmed',
    createdAt: '2026-10-24T16:00:00.000Z',
    notes: 'Afternoon client prep'
  },

  // Tomorrow's bookings (2026-10-26)
  {
    id: 'bkg-tom-1',
    deskId: 'desk-ldn-404',
    deskCode: 'LDN-404',
    deskName: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-26',
    slot: 'full_day',
    status: 'confirmed',
    createdAt: '2026-10-21T10:00:00.000Z',
    notes: 'Sprint planning and component architecture'
  },
  {
    id: 'bkg-tom-2',
    deskId: 'desk-ldn-422',
    deskCode: 'LDN-422',
    deskName: 'Desk 422 - Window Terrace South 3',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-priya',
    userName: 'Priya Patel',
    userEmail: 'priya.patel@acme-corp.internal',
    userDepartment: 'Core Infrastructure',
    date: '2026-10-26',
    slot: 'full_day',
    status: 'confirmed',
    createdAt: '2026-10-22T08:15:00.000Z'
  },

  // Pending Approval Request (2026-10-27)
  {
    id: 'bkg-pending-1',
    deskId: 'desk-ldn-420',
    deskCode: 'LDN-420',
    deskName: 'Desk 420 - Window Terrace South 1',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-marcus',
    userName: 'Marcus Vance',
    userEmail: 'marcus.vance@acme-corp.internal',
    userDepartment: 'Product Design',
    date: '2026-10-27',
    slot: 'full_day',
    status: 'pending_approval',
    createdAt: '2026-10-24T14:30:00.000Z',
    approvalReason: 'Client on-site design review and executive product prototype demonstration'
  },

  // Later this week (2026-10-28)
  {
    id: 'bkg-wed-1',
    deskId: 'desk-ldn-404',
    deskCode: 'LDN-404',
    deskName: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-28',
    slot: 'morning',
    status: 'confirmed',
    createdAt: '2026-10-23T12:00:00.000Z'
  },

  // Past Historical Bookings for Sarah Chen to establish personal stats
  {
    id: 'bkg-hist-1',
    deskId: 'desk-ldn-404',
    deskCode: 'LDN-404',
    deskName: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-22',
    slot: 'full_day',
    status: 'checked_in',
    createdAt: '2026-10-15T09:00:00.000Z'
  },
  {
    id: 'bkg-hist-2',
    deskId: 'desk-ldn-404',
    deskCode: 'LDN-404',
    deskName: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-21',
    slot: 'full_day',
    status: 'checked_in',
    createdAt: '2026-10-14T09:00:00.000Z'
  },
  {
    id: 'bkg-hist-3',
    deskId: 'desk-ldn-404',
    deskCode: 'LDN-404',
    deskName: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-16',
    slot: 'full_day',
    status: 'checked_in',
    createdAt: '2026-10-10T09:00:00.000Z'
  },
  {
    id: 'bkg-hist-4',
    deskId: 'desk-ldn-402',
    deskCode: 'LDN-402',
    deskName: 'Desk 402 - Focus Pod Beta',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-14',
    slot: 'morning',
    status: 'checked_in',
    createdAt: '2026-10-09T09:00:00.000Z'
  },
  {
    id: 'bkg-hist-5',
    deskId: 'desk-ldn-420',
    deskCode: 'LDN-420',
    deskName: 'Desk 420 - Window Terrace South 1',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-08',
    slot: 'full_day',
    status: 'checked_in',
    createdAt: '2026-10-02T09:00:00.000Z'
  },
  {
    id: 'bkg-hist-6',
    deskId: 'desk-ldn-404',
    deskCode: 'LDN-404',
    deskName: 'Desk 404 - Prime Focus Corner',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-07',
    slot: 'full_day',
    status: 'checked_in',
    createdAt: '2026-10-01T09:00:00.000Z'
  },
  {
    id: 'bkg-hist-7-cancelled',
    deskId: 'desk-ldn-403',
    deskCode: 'LDN-403',
    deskName: 'Desk 403 - Focus Pod Gamma',
    locationId: 'loc-london',
    locationName: 'London HQ (St. Paul\'s)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering & Design Wing',
    userId: 'usr-sarah',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Frontend Engineering',
    date: '2026-10-05',
    slot: 'afternoon',
    status: 'cancelled',
    createdAt: '2026-10-01T15:00:00.000Z',
    cancelledAt: '2026-10-04T18:20:00.000Z',
    notes: 'Cancelled due to remote customer emergency'
  }
];
