import { Booking } from '../types/deskBooking';

export function downloadCalendarEvent(booking: Booking) {
  // Convert date and slot into start and end times
  // 2026-10-25 format
  const dateClean = booking.date.replace(/-/g, '');
  
  let startHour = '083000';
  let endHour = '180000';

  if (booking.slot === 'morning') {
    startHour = '083000';
    endHour = '130000';
  } else if (booking.slot === 'afternoon') {
    startHour = '133000';
    endHour = '180000';
  }

  const dtStart = `${dateClean}T${startHour}`;
  const dtEnd = `${dateClean}T${endHour}`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const summary = `Office Desk Booking: ${booking.deskCode} (${booking.locationName})`;
  const description = `FlexDesk Reservation\\nLocation: ${booking.locationName} - ${booking.floorName}\\nDesk: ${booking.deskName} (${booking.deskCode})\\nSlot: ${booking.slot.replace('_', ' ').toUpperCase()}\\nReserved for: ${booking.userName} (${booking.userDepartment})`;
  const location = `${booking.locationName}, ${booking.floorName}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlexDesk Workplace//Desk Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:booking-${booking.id}@flexdesk.internal`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `flexdesk-${booking.deskCode}-${booking.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
