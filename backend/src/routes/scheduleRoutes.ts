import express from "express";
import isAuth from "../middleware/isAuth";

import * as ScheduleController from "../controllers/ScheduleController";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const scheduleRoutes = express.Router();

scheduleRoutes.get("/schedules", isAuth, ScheduleController.index);

scheduleRoutes.post("/schedules", isAuth, upload.array("files"), ScheduleController.store);

scheduleRoutes.put("/schedules/:scheduleId", isAuth, upload.array("files"), ScheduleController.update);

scheduleRoutes.get("/schedules/:scheduleId", isAuth, ScheduleController.show);

scheduleRoutes.delete("/schedules/:scheduleId", isAuth, ScheduleController.remove);

scheduleRoutes.post("/schedules/:id/media-upload", isAuth, upload.array("file"), ScheduleController.mediaUpload);

scheduleRoutes.delete("/schedules/:id/media-upload", isAuth, ScheduleController.deleteMedia);

scheduleRoutes.post("/schedules/:scheduleId/cancel-reminder", isAuth, ScheduleController.cancelReminderSystem);
scheduleRoutes.post("/schedules/:scheduleId/cancel", isAuth, ScheduleController.cancelSchedule);

export default scheduleRoutes;
