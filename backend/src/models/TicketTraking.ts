import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement
} from "sequelize-typescript";

import Company from "./Company";
import User from "./User";
import Ticket from "./Ticket";
import Whatsapp from "./Whatsapp";

@Table({
  tableName: "TicketTraking"
})
class TicketTraking extends Model<TicketTraking> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Whatsapp)
  @Column({ allowNull: true })
  whatsappId: number | null; // ✅ Permitir null para NotificaMe

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => User)
  @Column({ allowNull: true })
  userId: number | null; // ✅ Permitir null para consistencia

  @Column
  rated: boolean;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  startedAt: Date;

  @Column
  queuedAt: Date;

  @Column
  finishedAt: Date;

  @Column
  ratingAt: Date;

  @Column
  chatbotAt: Date;
}

export default TicketTraking;
