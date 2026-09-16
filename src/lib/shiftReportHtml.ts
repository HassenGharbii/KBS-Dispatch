import { REFERENCE_LIST } from '../constants/referenceList';
import { formatDateTime, formatDuration } from './shiftReportFormatting';
import type { ShiftReportViewProps } from '../components/ShiftReportView';

// escape untrusted text (agent-entered comments, names) before interpolating
// into HTML — expo-print renders this string in a WebView-based context.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildShiftReportHtml(props: ShiftReportViewProps): string {
  const { agentName, siteName, startAt, endAt, events } = props;

  const eventsHtml = events.length
    ? events
        .map((event) => {
          const category = REFERENCE_LIST.find((c) => c.code === event.categoryCode);
          const itemLabels = event.itemCodes
            .map((code) => category?.items.find((i) => i.code === code)?.label ?? code)
            .join(', ');
          const photosHtml = event.photoUris
            .map((uri) => `<img src="${escapeHtml(uri)}" class="photo" />`)
            .join('');
          return `
            <div class="event">
              <div class="event-time">${escapeHtml(formatDateTime(event.occurredAt))}</div>
              <div class="event-category">${escapeHtml(category?.label ?? event.categoryCode)}</div>
              <div class="event-items">${escapeHtml(itemLabels)}</div>
              ${event.comment ? `<div class="event-comment">${escapeHtml(event.comment)}</div>` : ''}
              ${photosHtml ? `<div class="photo-row">${photosHtml}</div>` : ''}
            </div>
          `;
        })
        .join('')
    : '<p class="empty">Aucun événement enregistré.</p>';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          .header { background: #f3f4f6; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; }
          .header p { margin: 4px 0; font-size: 14px; }
          h2 { font-size: 16px; margin: 20px 0 10px; }
          .empty { color: #6b7280; font-style: italic; }
          .event { border-left: 3px solid #1d4ed8; padding-left: 10px; margin-bottom: 14px; }
          .event-time { font-size: 12px; color: #6b7280; }
          .event-category { font-size: 14px; font-weight: 700; }
          .event-items { font-size: 13px; color: #374151; }
          .event-comment { font-size: 13px; color: #4b5563; font-style: italic; }
          .photo-row { margin-top: 6px; }
          .photo { width: 140px; height: 140px; object-fit: cover; border-radius: 6px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <h1>Compte rendu de service</h1>
        <div class="header">
          <p>Agent : ${escapeHtml(agentName)}</p>
          <p>Site : ${escapeHtml(siteName)}</p>
          <p>Début : ${escapeHtml(formatDateTime(startAt))}</p>
          <p>Fin : ${escapeHtml(endAt ? formatDateTime(endAt) : 'en cours')}</p>
          <p>Durée : ${escapeHtml(formatDuration(startAt, endAt))}</p>
        </div>
        <h2>Événements (${events.length})</h2>
        ${eventsHtml}
      </body>
    </html>
  `;
}
