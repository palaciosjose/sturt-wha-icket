import { Request, Response } from "express";
import ImportContactsService from "../services/WbotServices/ImportContactsService";
import CountContactsService from "../services/WbotServices/CountContactsService";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  await ImportContactsService(companyId);

  return res.status(200).json({ message: "contacts imported" });
};

export const count = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const contactCount = await CountContactsService(companyId);

  return res.status(200).json({ count: contactCount });
};
