import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ItinerariesService } from './itineraries.service';

@Injectable()
export class ItineraryPdfService {
  constructor(private readonly itineraries: ItinerariesService) {}

  // ITN-28: owner-only PDF export. Nothing is stored on disk.
  async stream(user: AuthUser, itineraryId: string, res: Response) {
    const itinerary = await this.itineraries.getOwnedOrFail(itineraryId, user);
    const view = await this.itineraries.buildView(itinerary);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="itinerary-${itineraryId}.pdf"`,
    );
    doc.pipe(res);

    doc.fontSize(22).text(String(view.title), { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Start date: ${String(view.startDate).slice(0, 10)}`);
    doc.text(`Countries: ${(view.countries ?? []).join(', ')}`);
    doc.text(`Visibility: ${view.visibility}`);
    doc.moveDown();

    const totals: Record<string, number> = {};
    const add = (amount: number | null | undefined, currency: string | null | undefined) => {
      if (amount == null || !currency) return;
      totals[currency] = (totals[currency] ?? 0) + amount;
    };

    for (const day of view.days) {
      doc.fontSize(14).text(`Day ${day.dayNumber} — ${day.date} — ${day.cityName ?? day.cityId}`);
      if (day.notes) doc.fontSize(10).text(`Notes: ${day.notes}`);
      doc.fontSize(10);
      for (const activity of day.activities) {
        doc.text(
          `• ${activity.time ? `${activity.time} ` : ''}${activity.name}` +
            (activity.cost != null ? ` — ${activity.cost} ${activity.currency ?? ''}` : ''),
        );
        add(activity.cost, activity.currency);
      }
      for (const budget of day.budgetEntries) {
        doc.text(`• Budget ${budget.category}: ${budget.amount} ${budget.currency}`);
        add(budget.amount, budget.currency);
      }
      for (const transport of day.transportCosts) {
        doc.text(
          `• ${transport.mode} ${transport.fromCityId} → ${transport.toCityId}: ` +
            `${transport.amount} ${transport.currency}`,
        );
        add(transport.amount, transport.currency);
      }
      doc.moveDown(0.4);
    }

    doc.moveDown();
    doc.fontSize(14).text('Budget totals');
    doc.fontSize(11);
    const entries = Object.entries(totals);
    if (!entries.length) doc.text('No costs recorded.');
    for (const [currency, amount] of entries) {
      doc.text(`${currency}: ${Math.round(amount * 100) / 100}`);
    }

    doc.end();
  }
}
