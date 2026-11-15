import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DailyOccupancyReportModal } from '../DailyOccupancyReportModal';
import type { Booking, Desk, Location } from '../../types/deskBooking';

const londonLocation: Location = {
  id: 'loc-london',
  name: 'London HQ (Bishopsgate)',
  city: 'London',
  country: 'United Kingdom',
  address: '100 Bishopsgate',
  timezone: 'Europe/London',
  advanceBookingDaysLimit: 30,
  openingHours: '08:00 - 19:00',
  description: 'Primary UK office',
  floors: [],
};

const belfastLocation: Location = {
  id: 'loc-belfast',
  name: 'Belfast Hub (Titanic Quarter)',
  city: 'Belfast',
  country: 'United Kingdom',
  address: '1 Olympic Way',
  timezone: 'Europe/London',
  advanceBookingDaysLimit: 21,
  openingHours: '08:00 - 19:30',
  description: 'NI engineering hub',
  floors: [],
};

const desks: Desk[] = [
  {
    id: 'd-1',
    code: 'LDN-401',
    name: 'Desk 401',
    locationId: 'loc-london',
    floorId: 'flr-4',
    zoneId: 'zn-1',
    deskType: 'standing',
    equipment: ['Dual 4K'],
    status: 'active',
    position: { x: 20, y: 20 },
  },
  {
    id: 'd-2',
    code: 'BFS-201',
    name: 'Desk 201',
    locationId: 'loc-belfast',
    floorId: 'flr-2',
    zoneId: 'zn-2',
    deskType: 'standard',
    equipment: ['Monitor'],
    status: 'active',
    position: { x: 40, y: 20 },
  },
];

const bookings: Booking[] = [
  {
    id: 'b-1',
    deskId: 'd-1',
    deskCode: 'LDN-401',
    deskName: 'Desk 401',
    locationId: 'loc-london',
    locationName: londonLocation.name,
    floorId: 'flr-4',
    floorName: 'Level 4',
    userId: 'usr-1',
    userName: 'Alex Morgan',
    userEmail: 'alex@deskination.io',
    userDepartment: 'Engineering',
    date: '2026-11-15',
    slot: 'full_day',
    status: 'checked_in',
    createdAt: '2026-11-10T09:00:00.000Z',
  },
  {
    id: 'b-2',
    deskId: 'd-1',
    deskCode: 'LDN-401',
    deskName: 'Desk 401',
    locationId: 'loc-london',
    locationName: londonLocation.name,
    floorId: 'flr-4',
    floorName: 'Level 4',
    userId: 'usr-2',
    userName: 'Jordan Lee',
    userEmail: 'jordan@deskination.io',
    userDepartment: 'Design',
    date: '2026-11-16',
    slot: 'morning',
    status: 'cancelled',
    createdAt: '2026-11-11T09:00:00.000Z',
  },
];

describe('DailyOccupancyReportModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <DailyOccupancyReportModal
        isOpen={false}
        onClose={vi.fn()}
        locations={[londonLocation, belfastLocation]}
        desks={desks}
        bookings={bookings}
      />
    );

    expect(html).toBe('');
  });

  it('renders modal header, location filters, date range inputs & presets, CSV format cards, preview metrics, and download button when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <DailyOccupancyReportModal
        isOpen={true}
        onClose={vi.fn()}
        locations={[londonLocation, belfastLocation]}
        desks={desks}
        bookings={bookings}
        initialLocationId="loc-london"
      />
    );

    expect(html).toContain('Export Daily Desk Occupancy &amp; Attendance Report');

    // Location filter buttons
    expect(html).toContain('All Offices');
    expect(html).toContain('2 total desks');
    expect(html).toContain('London HQ');
    expect(html).toContain('Belfast Hub');

    // Date range inputs and presets
    expect(html).toContain('value="2026-11-01"');
    expect(html).toContain('value="2026-11-30"');
    expect(html).toContain('This Month');
    expect(html).toContain('Past 7 Days');
    expect(html).toContain('Next 14 Days');

    // CSV format cards
    expect(html).toContain('Daily Occupancy Summary');
    expect(html).toContain('Individual Attendance Log');

    // Live preview metrics & sample data rows
    expect(html).toContain('Report Metrics Preview (30 Days Analyzed)');
    expect(html).toContain('Avg Occupancy');
    expect(html).toContain('Desk Bookings');
    expect(html).toContain('Unique Staff');
    expect(html).toContain('Cancellations');
    expect(html).toContain('Sample Data Rows');

    // Download button
    expect(html).toContain('Download CSV Report (30 records)');
  });
});
