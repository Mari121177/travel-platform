import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Response } from 'express';
import { Model, Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { FlightBookingStatus } from './enums/flight-booking-status.enum';
import {
  FlightBooking,
  FlightBookingDocument,
} from './schemas/flight-booking.schema';

@Injectable()
export class ETicketService {
  constructor(
    @InjectModel(FlightBooking.name)
    private readonly bookingModel: Model<FlightBookingDocument>,
  ) {}

  /** FLT-23: streams the e-ticket PDF. Owner only, Confirmed bookings only. Nothing is saved on disk. */
  async stream(userId: string, bookingId: string, res: Response) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Booking not found');
    }
    const b = await this.bookingModel.findOne({
      _id: new Types.ObjectId(bookingId),
      userId: new Types.ObjectId(userId),
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== FlightBookingStatus.Confirmed) {
      throw new ConflictException(
        'The e-ticket is available only for Confirmed bookings',
      );
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="e-ticket-${b.reference}.pdf"`,
    );
    doc.pipe(res);

    doc.fontSize(22).text('E-Ticket', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Booking reference: ${b.reference}`);
    doc.text(`Status: ${b.status}`);
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Airline: ${b.airlineName ?? '-'}`);
    doc.text(`Flight: ${b.flightNumber ?? '-'}`);
    doc.text(`From: ${b.origin ?? '-'}   To: ${b.destination ?? '-'}`);
    doc.text(`Departure (UTC): ${b.departureTime?.toISOString() ?? '-'}`);
    doc.text(`Arrival (UTC): ${b.arrivalTime?.toISOString() ?? '-'}`);
    doc.text(`Cabin: ${b.cabinClass}`);
    doc.moveDown();

    doc.fontSize(14).text('Passengers');
    doc.fontSize(12);
    b.passengers.forEach((p, i) => {
      const masked = `***${p.passportNumber.slice(-3)}`;
      doc.text(
        `${i + 1}. ${p.fullName} | ID ${masked} | extra bags: ${p.extraBags.length}`,
      );
    });
    doc.moveDown();

    doc.text(`Baggage fee: ${b.baggageFee}`);
    doc.fontSize(14).text(`Total paid: ${b.totalPrice}`);

    doc.end();
  }
}