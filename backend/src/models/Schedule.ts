import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";
import Contact from "./Contact";
import Ticket from "./Ticket";
import User from "./User";
import Whatsapp from "./Whatsapp";

@Table
class Schedule extends Model<Schedule> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  body: string;

  @Column
  sendAt: Date;

  @Column
  sentAt: Date;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @Column(DataType.STRING)
  status: string; // "PENDENTE", "ENVIADO", "CANCELADO", "VENCIDO"

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @Column
  mediaPath: string;

  @Column
  mediaName: string;

  // Campos para sistema de recordatorios múltiples
  @Column(DataType.STRING)
  reminderType: string; // "immediate", "reminder", "start"

  @Column(DataType.STRING)
  parentScheduleId: string; // ID del agendamiento principal

  @Column(DataType.BOOLEAN)
  isReminderSystem: boolean; // Indica si es parte del sistema de recordatorios

  @Column(DataType.STRING)
  reminderStatus: string; // "pending", "sent", "error"

  @Column(DataType.STRING)
  intervalUnit: string; // "days", "weeks", "months"

  @Column(DataType.INTEGER)
  intervalValue: number; // Interval value for recurrence

  @Column(DataType.INTEGER)
  repeatCount: number; // Number of times to repeat
}

export default Schedule;
