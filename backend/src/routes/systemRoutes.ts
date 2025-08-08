import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";

import * as SystemController from "../controllers/SystemController";

const systemRoutes = express.Router();

systemRoutes.get("/check-updates", isAuth, isSuper, SystemController.checkUpdates);

export default systemRoutes;
