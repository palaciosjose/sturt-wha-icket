import express from "express";
import isAuth from "../middleware/isAuth";
import * as HubNotificaMeController from "../controllers/HubNotificaMeController";

const routes = express.Router();

// Ruta para listar HubNotificaMe (solo registros del usuario y empresa de la sesión)
routes.get("/list", isAuth, HubNotificaMeController.findList);

// Ruta para crear un nuevo HubNotificaMe
routes.post("/", isAuth, HubNotificaMeController.store);

// Ruta para actualizar un HubNotificaMe existente
routes.put("/:id", isAuth, HubNotificaMeController.update);

// Ruta para eliminar un HubNotificaMe
routes.delete("/:id", isAuth, HubNotificaMeController.remove);

// Ruta para reconectar/empujar actualización
routes.post("/:id/reconnect", isAuth, HubNotificaMeController.reconnect);

export default routes; 