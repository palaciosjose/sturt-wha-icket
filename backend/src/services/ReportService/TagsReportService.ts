import { QueryTypes } from "sequelize";
import sequelize from "../../database";
import { format, subDays } from "date-fns";

export interface TagsReportParams {
  days?: number;
  date_from?: string;
  date_to?: string;
}

export interface TagsReportData {
  labels: string[];
  data: number[];
  colors: string[];
  total: number;
}

export default async function TagsReportService(
  companyId: string | number,
  params: TagsReportParams
): Promise<TagsReportData> {
  // ✅ ESTABLECER FECHAS POR DEFECTO - Últimos 7 días
  let dateFrom: Date;
  let dateTo: Date = new Date();

  if (params.date_from && params.date_to) {
    dateFrom = new Date(params.date_from);
    dateTo = new Date(params.date_to);
  } else if (params.days) {
    dateFrom = subDays(new Date(), params.days);
  } else {
    // Por defecto: últimos 7 días
    dateFrom = subDays(new Date(), 7);
  }

  const query = `
    SELECT 
      t.name,
      t.color,
      COUNT(tt.ticketId) as ticketCount
    FROM Tags t
    LEFT JOIN TicketTags tt ON t.id = tt.tagId
    LEFT JOIN Tickets ticket ON tt.ticketId = ticket.id
    WHERE t.companyId = ? 
      AND (tt.createdAt IS NULL OR tt.createdAt BETWEEN ? AND ?)
    GROUP BY t.id, t.name, t.color
    ORDER BY ticketCount DESC, t.name ASC
  `;

  try {
    const results: any[] = await sequelize.query(query, {
      replacements: [
        companyId,
        format(dateFrom, 'yyyy-MM-dd 00:00:00'),
        format(dateTo, 'yyyy-MM-dd 23:59:59')
      ],
      type: QueryTypes.SELECT,
    });

    // ✅ PROCESAR RESULTADOS
    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];
    let total = 0;

    results.forEach((item: any) => {
      labels.push(item.name);
      data.push(parseInt(item.ticketCount) || 0);
      colors.push(item.color || '#A4CCCC'); // Color por defecto si no tiene
      total += parseInt(item.ticketCount) || 0;
    });

    return {
      labels,
      data,
      colors,
      total
    };

  } catch (error) {
    console.error('❌ Error en TagsReportService:', error);
    return {
      labels: [],
      data: [],
      colors: [],
      total: 0
    };
  }
}
