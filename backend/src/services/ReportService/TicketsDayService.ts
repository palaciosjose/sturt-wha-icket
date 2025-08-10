import sequelize from "../../database/index";
import { QueryTypes } from "sequelize";

interface Return {
  data: {};
  count: number;
}

interface Request {
  initialDate: string;
  finalDate: string;
  companyId: number;
}

interface DataReturn {
  total: number;
  data?: number;
  horario?: string;
}

export const TicketsDayService = async ({ initialDate, finalDate, companyId }: Request): Promise<Return> => {

  let sql = '';
  let count = 0;

  if (initialDate && initialDate.trim() === finalDate && finalDate.trim()) {
    sql = `
    SELECT
      COUNT(*) AS total,
      HOUR(tick.createdAt) AS horario
      --DATE_FORMAT(DATE(tick.createdAt), '%d/%m/%Y') as horario
    FROM
      TicketTraking tick
    WHERE
      tick.companyId = ${companyId}
      and DATE(tick.createdAt) >= '${initialDate} 00:00:00'
      AND DATE(tick.createdAt) <= '${finalDate} 23:59:59'
    GROUP BY
      HOUR(tick.createdAt)
      --DATE_FORMAT(DATE(tick.createdAt), '%d/%m/%Y')
    ORDER BY
      horario asc;
    `
  } else {
    sql = `
    SELECT
    COUNT(*) AS total,
    DATE_FORMAT(DATE(tick.createdAt), '%d/%m/%Y') as data
  FROM
    TicketTraking tick
  WHERE
    tick.companyId = ${companyId}
    and DATE(tick.createdAt) >= '${initialDate}'
    AND DATE(tick.createdAt) <= '${finalDate}'
  GROUP BY
    DATE_FORMAT(DATE(tick.createdAt), '%d/%m/%Y')
  ORDER BY
    data asc;
  `
  }

  const data: DataReturn[] = await sequelize.query(sql, { type: QueryTypes.SELECT });

  data.forEach((register) => {
    count += Number(register.total);
  })

  return { data, count };

}
