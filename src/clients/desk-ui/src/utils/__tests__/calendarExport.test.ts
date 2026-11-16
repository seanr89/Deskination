import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadCalendarEvent } from '../calendarExport';
import type { Booking, SlotType } from '../../types/deskBooking';

function createBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'bkg-101',
    deskId: 'desk-ldn-401',
    deskCode: 'LDN-401',
    deskName: 'Desk 401 - Focus Pod',
    locationId: 'loc-london',
    locationName: 'London HQ',
    floorId: 'flr-ldn-4',
    floorName: 'Floor 4',
    userId: 'usr-1',
    userName: 'Sarah Chen',
    userEmail: 'sarah.chen@acme-corp.internal',
    userDepartment: 'Platform Engineering',
    date: '2026-11-15',
    slot: 'morning',
    status: 'confirmed',
    createdAt: '2026-11-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('calendarExport', () => {
  const mockUrl = 'blob:deskination-test-ics';
  let capturedBlob: Blob | null = null;
  let mockLink: {
    href: string;
    setAttribute: ReturnType<typeof vi.fn>;
    click: ReturnType<typeof vi.fn>;
  };
  let mockDocument: {
    createElement: ReturnType<typeof vi.fn>;
    body: {
      appendChild: ReturnType<typeof vi.fn>;
      removeChild: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    capturedBlob = null;
    mockLink = {
      href: '',
      setAttribute: vi.fn(),
      click: vi.fn(),
    };
    mockDocument = {
      createElement: vi.fn(() => mockLink),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:20:30.000Z'));

    vi.stubGlobal('document', mockDocument);
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj as Blob;
      return mockUrl;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates a valid .ics calendar blob and triggers download and cleanup', async () => {
    const booking = createBooking({ slot: 'morning', date: '2026-11-15' });

    downloadCalendarEvent(booking);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(capturedBlob).toBeInstanceOf(Blob);
    expect(capturedBlob?.type).toBe('text/calendar;charset=utf-8');

    expect(mockDocument.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe(mockUrl);
    expect(mockLink.setAttribute).toHaveBeenCalledWith(
      'download',
      'deskination-LDN-401-2026-11-15.ics'
    );
    expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
    expect(mockLink.click).toHaveBeenCalledTimes(1);
    expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

    const icsText = await capturedBlob!.text();
    expect(icsText).toContain('\r\n');
    expect(icsText).not.toMatch(/[^\r]\n/);

    const lines = icsText.split('\r\n');
    expect(lines).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Deskination Workplace//Desk Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:booking-bkg-101@deskination.internal',
      'DTSTAMP:20261115T102030Z',
      'DTSTART:20261115T083000',
      'DTEND:20261115T130000',
      'SUMMARY:Office Desk Booking: LDN-401 (London HQ)',
      'DESCRIPTION:Deskination Reservation\\nLocation: London HQ - Floor 4\\nDesk: Desk 401 - Focus Pod (LDN-401)\\nSlot: MORNING\\nReserved for: Sarah Chen (Platform Engineering)',
      'LOCATION:London HQ, Floor 4',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ]);
  });

  it.each<{
    slot: SlotType;
    expectedStart: string;
    expectedEnd: string;
    expectedSlotLabel: string;
  }>([
    {
      slot: 'morning',
      expectedStart: '20261115T083000',
      expectedEnd: '20261115T130000',
      expectedSlotLabel: 'MORNING',
    },
    {
      slot: 'afternoon',
      expectedStart: '20261115T133000',
      expectedEnd: '20261115T180000',
      expectedSlotLabel: 'AFTERNOON',
    },
    {
      slot: 'full_day',
      expectedStart: '20261115T083000',
      expectedEnd: '20261115T180000',
      expectedSlotLabel: 'FULL DAY',
    },
  ])(
    'encodes $slot slot time window ($expectedStart - $expectedEnd) into DTSTART/DTEND',
    async ({ slot, expectedStart, expectedEnd, expectedSlotLabel }) => {
      const booking = createBooking({ date: '2026-11-15', slot });

      downloadCalendarEvent(booking);

      expect(capturedBlob).not.toBeNull();
      const icsText = await capturedBlob!.text();
      const lines = icsText.split('\r\n');

      expect(lines).toContain(`DTSTART:${expectedStart}`);
      expect(lines).toContain(`DTEND:${expectedEnd}`);
      expect(lines).toContain(
        `DESCRIPTION:Deskination Reservation\\nLocation: London HQ - Floor 4\\nDesk: Desk 401 - Focus Pod (LDN-401)\\nSlot: ${expectedSlotLabel}\\nReserved for: Sarah Chen (Platform Engineering)`
      );
    }
  );
});
