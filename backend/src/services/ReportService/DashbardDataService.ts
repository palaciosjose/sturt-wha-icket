/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
import { QueryTypes } from "sequelize";
import * as _ from "lodash";
import sequelize from "../../database";


export interface DashboardData {
  counters: any;
  attendants: any[];
}

export interface Params {
  days?: number;
  date_from?: string;
  date_to?: string;
}

export default async function DashboardDataService(
  companyId: string | number,
  params: Params
): Promise<DashboardData> {
  // ✅ MEJORAR MANEJO DE PARÁMETROS - Si no hay parámetros, usar últimos 7 días por defecto
  if (!params || Object.keys(params).length === 0) {
    params = {
      days: 7,
    };
  }

  const query = `
    SELECT 
      JSON_OBJECT('counters', JSON_OBJECT(
        'avgSupportTime', COALESCE((SELECT AVG(supportTime) FROM (
          SELECT 
            COALESCE((
              (DATEDIFF(COALESCE(tt.ratingAt, tt.finishedAt), tt.startedAt) * 24 * 60) +
              (HOUR(TIMEDIFF(COALESCE(tt.ratingAt, tt.finishedAt), tt.startedAt)) * 60) +
              (MINUTE(TIMEDIFF(COALESCE(tt.ratingAt, tt.finishedAt), tt.startedAt)))
            ), 0) as supportTime
          FROM TicketTraking tt
          WHERE tt.companyId = ? AND tt.finishedAt IS NOT NULL
        ) t WHERE t.supportTime > 0), 0),
        'avgWaitTime', COALESCE((SELECT AVG(waitTime) FROM (
          SELECT 
            COALESCE((
              (DATEDIFF(tt.startedAt, tt.queuedAt) * 24 * 60) +
              (HOUR(TIMEDIFF(tt.startedAt, tt.queuedAt)) * 60) +
              (MINUTE(TIMEDIFF(tt.startedAt, tt.queuedAt)))
            ), 0) as waitTime
          FROM TicketTraking tt
          WHERE tt.companyId = ? AND tt.queuedAt IS NOT NULL AND tt.startedAt IS NOT NULL
        ) t WHERE t.waitTime > 0), 0),
        'supportHappening', (SELECT COUNT(*) FROM Tickets WHERE status = 'open' AND companyId = ?),
        'supportPending', (SELECT COUNT(*) FROM Tickets WHERE status = 'pending' AND companyId = ?),
        'supportFinished', (SELECT COUNT(*) FROM TicketTraking WHERE finishedAt IS NOT NULL AND companyId = ?),
        'leads', (SELECT COUNT(DISTINCT ct.id) FROM TicketTraking tt 
                 LEFT JOIN Tickets t ON t.id = tt.ticketId 
                 LEFT JOIN Contacts ct ON ct.id = t.contactId 
                 WHERE tt.companyId = ? AND ct.id IS NOT NULL),
        'totalCompanies', (SELECT COUNT(*) FROM Companies),
        'totalWhatsappSessions', (SELECT COUNT(*) FROM Whatsapps WHERE session != '')
      )) as counters,
      JSON_ARRAYAGG(JSON_OBJECT(
        'id', u.id,
        'name', u.name,
        'avgSupportTime', COALESCE(att.avgSupportTime, 0),
        'tickets', COALESCE(att.tickets, 0),
        'rating', COALESCE(att.rating, 0),
        'online', u.online
      )) as attendants
    FROM Users u
    LEFT JOIN (
      SELECT 
        u1.id,
        AVG(COALESCE((
          (DATEDIFF(COALESCE(tt.ratingAt, tt.finishedAt), tt.startedAt) * 24 * 60) +
          (HOUR(TIMEDIFF(COALESCE(tt.ratingAt, tt.finishedAt), tt.startedAt)) * 60) +
          (MINUTE(TIMEDIFF(COALESCE(tt.ratingAt, tt.finishedAt), tt.startedAt)))
        ), 0)) as avgSupportTime,
        COUNT(tt.id) as tickets,
        COALESCE(AVG(ur.rate), 0) as rating
      FROM Users u1
      LEFT JOIN TicketTraking tt ON tt.userId = u1.id AND tt.companyId = ?
      LEFT JOIN UserRatings ur ON ur.userId = tt.userId AND DATE(ur.createdAt) = DATE(tt.finishedAt)
      GROUP BY u1.id
    ) att ON att.id = u.id
    WHERE u.companyId = ?
    GROUP BY u.id, u.name, u.online, att.avgSupportTime, att.tickets, att.rating
  `;

  // Construir parámetros para la nueva consulta simplificada
  const replacements: any[] = [
    companyId, // avgSupportTime
    companyId, // avgWaitTime  
    companyId, // supportHappening
    companyId, // supportPending
    companyId, // supportFinished
    companyId, // leads
    companyId, // att.avgSupportTime
    companyId  // WHERE u.companyId
  ];

  const finalQuery = query;

  const responseData: any = await sequelize.query(finalQuery, {
    replacements,
    type: QueryTypes.SELECT,
    plain: true
  });

  // ✅ CORREGIR ESTRUCTURA JSON - Parsear correctamente los datos
  let counters: any = {};
  let attendants: any[] = [];

  if (responseData && responseData.counters) {
    try {
      // Si counters es un string JSON, parsearlo
      if (typeof responseData.counters === 'string') {
        counters = JSON.parse(responseData.counters);
      } else {
        counters = responseData.counters;
      }
      
      // Si hay un counters anidado, usar el interno
      if (counters && counters.counters) {
        counters = counters.counters;
      }
    } catch (error) {
      console.error('Error parsing counters:', error);
      counters = {};
    }
  }

  if (responseData && responseData.attendants) {
    try {
      // Si attendants es un string JSON, parsearlo
      if (typeof responseData.attendants === 'string') {
        attendants = JSON.parse(responseData.attendants);
      } else {
        attendants = responseData.attendants;
      }
    } catch (error) {
      console.error('Error parsing attendants:', error);
      attendants = [];
    }
  }

  return {
    counters,
    attendants
  };
}