import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";

import * as SystemController from "../controllers/SystemController";

const systemRoutes = express.Router();

systemRoutes.get("/check-updates", isAuth, isSuper, SystemController.checkUpdates);
systemRoutes.post("/perform-update", isAuth, isSuper, SystemController.performUpdate);
systemRoutes.post("/perform-full-update", isAuth, isSuper, SystemController.performFullUpdate);

export default systemRoutes;
