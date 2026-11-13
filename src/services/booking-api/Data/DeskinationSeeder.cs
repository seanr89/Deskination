using BookingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingApi.Data;

public static class DeskinationSeeder
{
    public static IReadOnlyList<User> InitialUsers { get; } =
    [
        new(
            Id: "usr-sarah",
            Name: "Sarah Chen",
            Email: "sarah.chen@acme-corp.internal",
            Role: Role.Employee,
            Department: "Frontend Engineering",
            JobTitle: "Senior Staff Engineer",
            AvatarColor: "bg-emerald-600"
        ),
        new(
            Id: "usr-marcus",
            Name: "Marcus Vance",
            Email: "marcus.vance@acme-corp.internal",
            Role: Role.Employee,
            Department: "Product Design",
            JobTitle: "Lead Product Designer",
            AvatarColor: "bg-indigo-600"
        ),
        new(
            Id: "usr-priya",
            Name: "Priya Patel",
            Email: "priya.patel@acme-corp.internal",
            Role: Role.Employee,
            Department: "Core Infrastructure",
            JobTitle: "Engineering Manager",
            AvatarColor: "bg-rose-600"
        ),
        new(
            Id: "usr-david",
            Name: "David Kim",
            Email: "david.kim@acme-corp.internal",
            Role: Role.Employee,
            Department: "Enterprise Sales",
            JobTitle: "Account Executive",
            AvatarColor: "bg-amber-600"
        ),
        new(
            Id: "usr-admin-elena",
            Name: "Elena Rostova",
            Email: "elena.rostova@acme-corp.internal",
            Role: Role.Admin,
            Department: "Workplace Operations",
            JobTitle: "Director of Workplace & Facilities",
            AvatarColor: "bg-blue-700"
        )
    ];

    public static IReadOnlyList<Location> InitialLocations { get; } =
    [
        new(
            Id: "loc-london",
            Name: "London HQ (St. Paul's)",
            City: "London",
            Country: "United Kingdom",
            Address: "10 Paternoster Square, London EC4M 7DX",
            Timezone: "Europe/London",
            AdvanceBookingDaysLimit: 30,
            OpeningHours: "07:30 - 20:00 (Mon - Fri)",
            Description: "Flagship office featuring agile working neighbourhoods, silent focus pods, and dual-monitor engineering benches overlooking St Paul's Cathedral.",
            Floors:
            [
                new(
                    Id: "flr-ldn-4",
                    LocationId: "loc-london",
                    Name: "Level 4 - Engineering & Design Wing",
                    Level: 4,
                    Zones:
                    [
                        new(
                            Id: "zn-ldn-focus",
                            FloorId: "flr-ldn-4",
                            Name: "North Pavilion: Silent Focus",
                            Code: "ZONE-A",
                            Description: "Dedicated whisper-quiet acoustic zone for deep programming and solitary focus."
                        ),
                        new(
                            Id: "zn-ldn-collab",
                            FloorId: "flr-ldn-4",
                            Name: "Central Hub: Agile Collaboration",
                            Code: "ZONE-B",
                            Description: "Dynamic team cluster zone next to whiteboards and breakout screens."
                        ),
                        new(
                            Id: "zn-ldn-window",
                            FloorId: "flr-ldn-4",
                            Name: "South Terrace: Cathedral View",
                            Code: "ZONE-C",
                            Description: "Natural light desks with panoramic floor-to-ceiling glass and dual 4K setups."
                        )
                    ],
                    Elements:
                    [
                        new(
                            Id: "elem-lift",
                            Name: "Elevator Core & Stairs",
                            Type: FloorElementType.Stairs,
                            X: 2,
                            Y: 40,
                            Width: 7,
                            Height: 20,
                            Label: "Lift Core"
                        ),
                        new(
                            Id: "elem-meeting-1",
                            Name: "Boardroom A (Glass Enclosed)",
                            Type: FloorElementType.Room,
                            X: 82,
                            Y: 8,
                            Width: 15,
                            Height: 26,
                            Label: "Conf Room A"
                        ),
                        new(
                            Id: "elem-coffee",
                            Name: "Coffee Bar & Kitchenette",
                            Type: FloorElementType.Kitchen,
                            X: 78,
                            Y: 42,
                            Width: 18,
                            Height: 18,
                            Label: "Coffee Point"
                        ),
                        new(
                            Id: "elem-restroom",
                            Name: "Restrooms & Showers",
                            Type: FloorElementType.Restroom,
                            X: 2,
                            Y: 75,
                            Width: 9,
                            Height: 18,
                            Label: "Restrooms"
                        )
                    ]
                ),
                new(
                    Id: "flr-ldn-3",
                    LocationId: "loc-london",
                    Name: "Level 3 - Product & Operations Hub",
                    Level: 3,
                    Zones:
                    [
                        new(
                            Id: "zn-ldn3-open",
                            FloorId: "flr-ldn-3",
                            Name: "Main Atrium Workspace",
                            Code: "ZONE-D",
                            Description: "Open plan seating with wide desks and acoustic ceiling baffles."
                        )
                    ],
                    Elements: []
                )
            ]
        ),
        new(
            Id: "loc-belfast",
            Name: "Belfast Hub (Titanic Quarter)",
            City: "Belfast",
            Country: "United Kingdom",
            Address: "1 Olympic Way, Titanic Quarter, Belfast BT3 9EP",
            Timezone: "Europe/London",
            AdvanceBookingDaysLimit: 21,
            OpeningHours: "08:00 - 19:30 (Mon - Fri)",
            Description: "Contemporary waterside workspace designed for cross-functional engineering and client collaborations.",
            Floors:
            [
                new(
                    Id: "flr-bfs-2",
                    LocationId: "loc-belfast",
                    Name: "Floor 2 - Harbour Loft & Client Suite",
                    Level: 2,
                    Zones:
                    [
                        new(
                            Id: "zn-bfs-east",
                            FloorId: "flr-bfs-2",
                            Name: "East Wing: Solutions & Delivery",
                            Code: "ZONE-BFS-A",
                            Description: "High energy open benching with call privacy booths."
                        ),
                        new(
                            Id: "zn-bfs-west",
                            FloorId: "flr-bfs-2",
                            Name: "West Wing: Quiet Engineering Lab",
                            Code: "ZONE-BFS-B",
                            Description: "Dual monitor workstations with ultra-wide curved screens."
                        )
                    ],
                    Elements:
                    [
                        new(
                            Id: "elem-bfs-client-rm",
                            Name: "Client Presentation Suite",
                            Type: FloorElementType.Room,
                            X: 75,
                            Y: 10,
                            Width: 20,
                            Height: 30,
                            Label: "Executive Demo Room"
                        )
                    ]
                )
            ]
        ),
        new(
            Id: "loc-dubai",
            Name: "Dubai Hub (DIFC)",
            City: "Dubai",
            Country: "United Arab Emirates",
            Address: "Gate Village 8, DIFC, Dubai, UAE",
            Timezone: "Asia/Dubai",
            AdvanceBookingDaysLimit: 30,
            OpeningHours: "08:00 - 20:00 (Sun - Thu)",
            Description: "Modern regional studio in DIFC with ergonomic sit-stand setups and acoustic focus nooks.",
            Floors:
            [
                new(
                    Id: "flr-dxb-1",
                    LocationId: "loc-dubai",
                    Name: "Level 1 - DIFC Studio",
                    Level: 1,
                    Zones:
                    [
                        new(
                            Id: "zn-dxb-atrium",
                            FloorId: "flr-dxb-1",
                            Name: "Atrium View Studio",
                            Code: "ZONE-DXB-A",
                            Description: "Bright atrium-facing studio with oak standing workstations."
                        )
                    ],
                    Elements: []
                )
            ]
        )
    ];

    public static IReadOnlyList<Desk> InitialDesks { get; } =
    [
        // London Floor 4 - Zone A (Focus)
        new(
            Id: "desk-ldn-401",
            Code: "LDN-401",
            Name: "Desk 401 - Focus Pod Alpha",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-focus",
            DeskType: DeskType.QuietBooth,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Single 32\" 4K Dell UltraSharp", "Acoustic Sound Barrier", "Electric Sit-Stand", "USB-C 90W PD"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(14, 22),
            Rotation: null,
            Notes: "Whisper-quiet corner with acoustic partitions on three sides."
        ),
        new(
            Id: "desk-ldn-402",
            Code: "LDN-402",
            Name: "Desk 402 - Focus Pod Beta",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-focus",
            DeskType: DeskType.Standing,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 27\" Dell IPS Displays", "Electric Sit-Stand Desk", "Logitech 4K Brio Webcam", "Herman Miller Embody"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(26, 22),
            Rotation: null,
            Notes: "Height-adjustable standing desk with preset memory buttons."
        ),
        new(
            Id: "desk-ldn-403",
            Code: "LDN-403",
            Name: "Desk 403 - Focus Pod Gamma",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-focus",
            DeskType: DeskType.DualScreen,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 27\" 4K BenQ Monitors", "CalDigit TS4 Thunderbolt Dock", "Mechanical Keyboard (Cherry Red)", "Ergonomic Mouse"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(38, 22),
            Rotation: null,
            Notes: "Calibrated displays ideal for frontend design and code review."
        ),
        new(
            Id: "desk-ldn-404",
            Code: "LDN-404",
            Name: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-focus",
            DeskType: DeskType.Ultrawide,
            AllocationType: DeskAllocationType.Designated,
            DesignatedUserId: "usr-sarah",
            DesignatedUserName: "Sarah Chen",
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["38\" Curved UltraWide LG Monitor", "Thunderbolt 4 Cable", "Wireless Charging Pad", "Ergonomic Footrest"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(50, 22),
            Rotation: null,
            Notes: "Designated workstation for Sarah Chen (Senior Staff Engineer)."
        ),
        new(
            Id: "desk-ldn-405",
            Code: "LDN-405",
            Name: "Desk 405 - Focus Pod Epsilon",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-focus",
            DeskType: DeskType.Standing,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Single 27\" Apple Studio Display", "Electric Sit-Stand", "USB-C Dock", "Acoustic Desk Screen"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(62, 22),
            Rotation: null,
            Notes: "Compact silent workstation with 5K Studio Display."
        ),
        new(
            Id: "desk-ldn-406",
            Code: "LDN-406",
            Name: "Desk 406 - Focus Pod Zeta",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-focus",
            DeskType: DeskType.Standard,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Single 27\" Dell Monitor", "USB-C Dongle", "Ergonomic Task Chair"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(74, 22),
            Rotation: null,
            Notes: "Standard quiet hot desk."
        ),

        // London Floor 4 - Zone B (Collaboration Hub)
        new(
            Id: "desk-ldn-410",
            Code: "LDN-410",
            Name: "Desk 410 - Agile Bench 1A",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-collab",
            DeskType: DeskType.Standard,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 24\" Dell Displays", "USB-C Universal Hub", "Whiteboard Adjacent"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(16, 52),
            Rotation: null,
            Notes: "Next to team mobile whiteboard for active pairing sessions."
        ),
        new(
            Id: "desk-ldn-411",
            Code: "LDN-411",
            Name: "Desk 411 - Agile Bench 1B",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-collab",
            DeskType: DeskType.Standard,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 24\" Dell Displays", "Universal Dock", "Jabra Speakerphone"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(28, 52),
            Rotation: null,
            Notes: "Facing Desk 410, ideal for sprint partners."
        ),
        new(
            Id: "desk-ldn-412",
            Code: "LDN-412",
            Name: "Desk 412 - Agile Bench 2A",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-collab",
            DeskType: DeskType.Standing,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["34\" Curved WQHD Display", "Electric Sit-Stand", "USB-C 100W PD"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(44, 52),
            Rotation: null,
            Notes: "Collaborative desk with height adjustment."
        ),
        new(
            Id: "desk-ldn-413",
            Code: "LDN-413",
            Name: "Desk 413 - Agile Bench 2B",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-collab",
            DeskType: DeskType.Standing,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["34\" Curved WQHD Display", "Electric Sit-Stand", "USB-C 100W PD"],
            Status: DeskStatus.Maintenance,
            Position: new DeskPosition(56, 52),
            Rotation: null,
            Notes: "Monitor arm clamp adjustment in progress by facilities."
        ),
        new(
            Id: "desk-ldn-414",
            Code: "LDN-414",
            Name: "Desk 414 - Agile Pod 3",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-collab",
            DeskType: DeskType.DualScreen,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 27\" 4K Dell Monitors", "Thunderbolt Hub", "4K Webcam"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(72, 52),
            Rotation: null,
            Notes: "Equipped for hybrid video pairing."
        ),

        // London Floor 4 - Zone C (Cathedral View / Terrace)
        new(
            Id: "desk-ldn-420",
            Code: "LDN-420",
            Name: "Desk 420 - Window Terrace South 1",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-window",
            DeskType: DeskType.WindowView,
            AllocationType: DeskAllocationType.RequiresApproval,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: true,
            Equipment: ["Dual 27\" 4K LG Displays", "Motorized Desk", "Cathedral Direct View", "Herman Miller Aeron"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(16, 80),
            Rotation: null,
            Notes: "South-facing Cathedral glass view. Requires manager approval to reserve."
        ),
        new(
            Id: "desk-ldn-421",
            Code: "LDN-421",
            Name: "Desk 421 - Window Terrace South 2",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-window",
            DeskType: DeskType.WindowView,
            AllocationType: DeskAllocationType.Unreserved,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 27\" 4K LG Displays", "Motorized Desk", "Cathedral Direct View", "Herman Miller Aeron"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(30, 80),
            Rotation: null,
            Notes: "Bright window seat with automated solar blinds."
        ),
        new(
            Id: "desk-ldn-422",
            Code: "LDN-422",
            Name: "Desk 422 - Window Terrace South 3",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-window",
            DeskType: DeskType.Ultrawide,
            AllocationType: DeskAllocationType.RequiresApproval,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: true,
            Equipment: ["40\" Curved 5K2K Display", "Electric Sit-Stand", "Anker 12-in-1 Dock"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(50, 80),
            Rotation: null,
            Notes: "Ultra-wide 5K2K display lab workstation. Manager approval required."
        ),
        new(
            Id: "desk-ldn-423",
            Code: "LDN-423",
            Name: "Desk 423 - Window Terrace South 4",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-window",
            DeskType: DeskType.WindowView,
            AllocationType: DeskAllocationType.Unreserved,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 27\" Dell Displays", "Height Adjustable", "Natural Oak Finish"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(68, 80),
            Rotation: null,
            Notes: "Spacious desk with extra surface space for notebooks & tablets."
        ),
        new(
            Id: "desk-ldn-424",
            Code: "LDN-424",
            Name: "Desk 424 - Executive Window Corner",
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-window",
            DeskType: DeskType.WindowView,
            AllocationType: DeskAllocationType.Designated,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: "Executive & Legal Leadership",
            RequiresApproval: null,
            Equipment: ["Apple Studio Display 5K", "Standing Desk", "Acoustic Planters Adjacent"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(84, 80),
            Rotation: null,
            Notes: "Designated corner workstation for Executive & Legal."
        ),

        // Belfast Floor 2 Desks
        new(
            Id: "desk-bfs-201",
            Code: "BFS-201",
            Name: "Desk 201 - Harbour View Standing 1",
            LocationId: "loc-belfast",
            FloorId: "flr-bfs-2",
            ZoneId: "zn-bfs-west",
            DeskType: DeskType.Standing,
            AllocationType: DeskAllocationType.Designated,
            DesignatedUserId: "usr-david",
            DesignatedUserName: "David Kim",
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 27\" Dell 4K", "Electric Sit-Stand", "USB-C Dock", "Ergonomic Task Chair"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(20, 30),
            Rotation: null,
            Notes: "Designated desk for David Kim (Enterprise Sales)."
        ),
        new(
            Id: "desk-bfs-202",
            Code: "BFS-202",
            Name: "Desk 202 - Harbour View Standing 2",
            LocationId: "loc-belfast",
            FloorId: "flr-bfs-2",
            ZoneId: "zn-bfs-west",
            DeskType: DeskType.Ultrawide,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["38\" Dell Curved IPS", "Thunderbolt Dock", "Wireless Qi Charger"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(40, 30),
            Rotation: null,
            Notes: "High-power workstation with single cable docking."
        ),
        new(
            Id: "desk-bfs-203",
            Code: "BFS-203",
            Name: "Desk 203 - Client Bay Alpha",
            LocationId: "loc-belfast",
            FloorId: "flr-bfs-2",
            ZoneId: "zn-bfs-east",
            DeskType: DeskType.Standard,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Single 27\" Dell Monitor", "Logitech HD Cam", "Acoustic Privacy Panels"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(65, 65),
            Rotation: null,
            Notes: "Close to client presentation conference room."
        ),
        new(
            Id: "desk-bfs-204",
            Code: "BFS-204",
            Name: "Desk 204 - Client Bay Beta",
            LocationId: "loc-belfast",
            FloorId: "flr-bfs-2",
            ZoneId: "zn-bfs-east",
            DeskType: DeskType.DualScreen,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 24\" Displays", "Multiport Dock", "Comfort Armrest Chair"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(80, 65),
            Rotation: null,
            Notes: "Open bench seating."
        ),

        // Dubai DIFC Desks
        new(
            Id: "desk-dxb-101",
            Code: "DXB-101",
            Name: "Desk 101 - Atrium Oak Bench",
            LocationId: "loc-dubai",
            FloorId: "flr-dxb-1",
            ZoneId: "zn-dxb-atrium",
            DeskType: DeskType.Standing,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Dual 27\" 4K LG Displays", "Solid Oak Electric Standing", "USB-C Dock", "Felt Acoustic Screen"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(25, 40),
            Rotation: null,
            Notes: "Bright atrium view."
        ),
        new(
            Id: "desk-dxb-102",
            Code: "DXB-102",
            Name: "Desk 102 - Atrium Oak Bench 2",
            LocationId: "loc-dubai",
            FloorId: "flr-dxb-1",
            ZoneId: "zn-dxb-atrium",
            DeskType: DeskType.Ultrawide,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["34\" Curved Samsung Odyssey", "USB-C Hub", "Ergonomic Stool"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(50, 40),
            Rotation: null,
            Notes: "Direct natural light in DIFC studio."
        ),
        new(
            Id: "desk-dxb-103",
            Code: "DXB-103",
            Name: "Desk 103 - Focus Alcove",
            LocationId: "loc-dubai",
            FloorId: "flr-dxb-1",
            ZoneId: "zn-dxb-atrium",
            DeskType: DeskType.QuietBooth,
            AllocationType: null,
            DesignatedUserId: null,
            DesignatedUserName: null,
            DesignatedDepartment: null,
            RequiresApproval: null,
            Equipment: ["Single 32\" 4K Display", "Acoustic Sound Baffle", "Keypad Lighting"],
            Status: DeskStatus.Active,
            Position: new DeskPosition(75, 40),
            Rotation: null,
            Notes: "Private alcove for focused software delivery."
        )
    ];

    public static IReadOnlyList<Booking> InitialBookings { get; } =
    [
        // Today's bookings (2026-10-25)
        new(
            Id: "bkg-today-1",
            DeskId: "desk-ldn-404",
            DeskCode: "LDN-404",
            DeskName: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-25",
            Slot: SlotType.FullDay,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-20T09:15:00.000Z",
            CheckInAt: "2026-10-25T08:42:00.000Z",
            Notes: "Working on frontend design system release"
        ),
        new(
            Id: "bkg-today-2",
            DeskId: "desk-ldn-402",
            DeskCode: "LDN-402",
            DeskName: "Desk 402 - Focus Pod Beta",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-marcus",
            UserName: "Marcus Vance",
            UserEmail: "marcus.vance@acme-corp.internal",
            UserDepartment: "Product Design",
            Date: "2026-10-25",
            Slot: SlotType.FullDay,
            Status: BookingStatus.Confirmed,
            CreatedAt: "2026-10-22T11:00:00.000Z",
            Notes: "Figma review & user prototype testing"
        ),
        new(
            Id: "bkg-today-3",
            DeskId: "desk-ldn-420",
            DeskCode: "LDN-420",
            DeskName: "Desk 420 - Window Terrace South 1",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-priya",
            UserName: "Priya Patel",
            UserEmail: "priya.patel@acme-corp.internal",
            UserDepartment: "Core Infrastructure",
            Date: "2026-10-25",
            Slot: SlotType.Morning,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-23T14:30:00.000Z",
            CheckInAt: "2026-10-25T08:50:00.000Z",
            Notes: "Morning infrastructure standup"
        ),
        new(
            Id: "bkg-today-4",
            DeskId: "desk-ldn-410",
            DeskCode: "LDN-410",
            DeskName: "Desk 410 - Agile Bench 1A",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-david",
            UserName: "David Kim",
            UserEmail: "david.kim@acme-corp.internal",
            UserDepartment: "Enterprise Sales",
            Date: "2026-10-25",
            Slot: SlotType.Afternoon,
            Status: BookingStatus.Confirmed,
            CreatedAt: "2026-10-24T16:00:00.000Z",
            Notes: "Afternoon client prep"
        ),

        // Tomorrow's bookings (2026-10-26)
        new(
            Id: "bkg-tom-1",
            DeskId: "desk-ldn-404",
            DeskCode: "LDN-404",
            DeskName: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-26",
            Slot: SlotType.FullDay,
            Status: BookingStatus.Confirmed,
            CreatedAt: "2026-10-21T10:00:00.000Z",
            Notes: "Sprint planning and component architecture"
        ),
        new(
            Id: "bkg-tom-2",
            DeskId: "desk-ldn-422",
            DeskCode: "LDN-422",
            DeskName: "Desk 422 - Window Terrace South 3",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-priya",
            UserName: "Priya Patel",
            UserEmail: "priya.patel@acme-corp.internal",
            UserDepartment: "Core Infrastructure",
            Date: "2026-10-26",
            Slot: SlotType.FullDay,
            Status: BookingStatus.Confirmed,
            CreatedAt: "2026-10-22T08:15:00.000Z"
        ),

        // Pending Approval Request (2026-10-27)
        new(
            Id: "bkg-pending-1",
            DeskId: "desk-ldn-420",
            DeskCode: "LDN-420",
            DeskName: "Desk 420 - Window Terrace South 1",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-marcus",
            UserName: "Marcus Vance",
            UserEmail: "marcus.vance@acme-corp.internal",
            UserDepartment: "Product Design",
            Date: "2026-10-27",
            Slot: SlotType.FullDay,
            Status: BookingStatus.PendingApproval,
            CreatedAt: "2026-10-24T14:30:00.000Z",
            ApprovalReason: "Client on-site design review and executive product prototype demonstration"
        ),

        // Later this week (2026-10-28)
        new(
            Id: "bkg-wed-1",
            DeskId: "desk-ldn-404",
            DeskCode: "LDN-404",
            DeskName: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-28",
            Slot: SlotType.Morning,
            Status: BookingStatus.Confirmed,
            CreatedAt: "2026-10-23T12:00:00.000Z"
        ),

        // Past Historical Bookings for Sarah Chen
        new(
            Id: "bkg-hist-1",
            DeskId: "desk-ldn-404",
            DeskCode: "LDN-404",
            DeskName: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-22",
            Slot: SlotType.FullDay,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-15T09:00:00.000Z"
        ),
        new(
            Id: "bkg-hist-2",
            DeskId: "desk-ldn-404",
            DeskCode: "LDN-404",
            DeskName: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-21",
            Slot: SlotType.FullDay,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-14T09:00:00.000Z"
        ),
        new(
            Id: "bkg-hist-3",
            DeskId: "desk-ldn-404",
            DeskCode: "LDN-404",
            DeskName: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-16",
            Slot: SlotType.FullDay,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-10T09:00:00.000Z"
        ),
        new(
            Id: "bkg-hist-4",
            DeskId: "desk-ldn-402",
            DeskCode: "LDN-402",
            DeskName: "Desk 402 - Focus Pod Beta",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-14",
            Slot: SlotType.Morning,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-09T09:00:00.000Z"
        ),
        new(
            Id: "bkg-hist-5",
            DeskId: "desk-ldn-420",
            DeskCode: "LDN-420",
            DeskName: "Desk 420 - Window Terrace South 1",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-08",
            Slot: SlotType.FullDay,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-02T09:00:00.000Z"
        ),
        new(
            Id: "bkg-hist-6",
            DeskId: "desk-ldn-404",
            DeskCode: "LDN-404",
            DeskName: "Desk 404 - Prime Focus Corner",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-07",
            Slot: SlotType.FullDay,
            Status: BookingStatus.CheckedIn,
            CreatedAt: "2026-10-01T09:00:00.000Z"
        ),
        new(
            Id: "bkg-hist-7-cancelled",
            DeskId: "desk-ldn-403",
            DeskCode: "LDN-403",
            DeskName: "Desk 403 - Focus Pod Gamma",
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: "usr-sarah",
            UserName: "Sarah Chen",
            UserEmail: "sarah.chen@acme-corp.internal",
            UserDepartment: "Frontend Engineering",
            Date: "2026-10-05",
            Slot: SlotType.Afternoon,
            Status: BookingStatus.Cancelled,
            CreatedAt: "2026-10-01T15:00:00.000Z",
            CancelledAt: "2026-10-04T18:20:00.000Z",
            Notes: "Cancelled due to remote customer emergency"
        )
    ];

    public static async Task EnsureSeededAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DeskinationDbContext>();
        await db.Database.EnsureCreatedAsync();

        if (!await db.Users.AnyAsync())
        {
            db.Users.AddRange(InitialUsers);
        }

        if (!await db.Locations.AnyAsync())
        {
            db.Locations.AddRange(InitialLocations);
        }

        if (!await db.Desks.AnyAsync())
        {
            db.Desks.AddRange(InitialDesks);
        }

        if (!await db.Bookings.AnyAsync())
        {
            db.Bookings.AddRange(InitialBookings);
        }

        await db.SaveChangesAsync();
    }

    public static async Task<WorkspaceSnapshotResponse> ResetToDefaultsAsync(DeskinationDbContext db)
    {
        db.Bookings.RemoveRange(await db.Bookings.ToListAsync());
        db.Desks.RemoveRange(await db.Desks.ToListAsync());
        db.Locations.RemoveRange(await db.Locations.ToListAsync());
        db.Users.RemoveRange(await db.Users.ToListAsync());
        await db.SaveChangesAsync();

        db.Users.AddRange(InitialUsers);
        db.Locations.AddRange(InitialLocations);
        db.Desks.AddRange(InitialDesks);
        db.Bookings.AddRange(InitialBookings);
        await db.SaveChangesAsync();

        return new WorkspaceSnapshotResponse(
            Users: InitialUsers,
            Locations: InitialLocations,
            Desks: InitialDesks,
            Bookings: InitialBookings
        );
    }
}
