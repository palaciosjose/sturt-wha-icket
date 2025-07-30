import { QueryTypes } from "sequelize";
import sequelize from "../../database";

type Result = {
  id: number;
  currentSchedule: [];
  startTime: string;
  endTime: string;
  inActivity: boolean;
};

const VerifyCurrentSchedule = async (id: string | number): Promise<Result> => {
  const sql = `
    SELECT
      c.id,
      DAYNAME(CURRENT_DATE) as currentWeekday,
      JSON_UNQUOTE(JSON_EXTRACT(s.schedule, '$.startTime')) as startTime,
      JSON_UNQUOTE(JSON_EXTRACT(s.schedule, '$.endTime')) as endTime,
      (
        TIME(NOW()) >= TIME(JSON_UNQUOTE(JSON_EXTRACT(s.schedule, '$.startTime'))) AND
        TIME(NOW()) <= TIME(JSON_UNQUOTE(JSON_EXTRACT(s.schedule, '$.endTime')))
      ) as inActivity
    FROM Companies c
    CROSS JOIN JSON_TABLE(
      c.schedules,
      '$[*]' COLUMNS (
        schedule JSON PATH '$'
      )
    ) AS s
    WHERE JSON_UNQUOTE(JSON_EXTRACT(s.schedule, '$.weekdayEn')) = LOWER(DAYNAME(CURRENT_DATE))
      AND c.id = :id
      AND JSON_UNQUOTE(JSON_EXTRACT(s.schedule, '$.startTime')) != ''
      AND JSON_UNQUOTE(JSON_EXTRACT(s.schedule, '$.endTime')) != ''
    LIMIT 1;
  `;

  const result: Result = await sequelize.query(sql, {
    replacements: { id },
    type: QueryTypes.SELECT,
    plain: true
  });

  return result;
};

export default VerifyCurrentSchedule;
