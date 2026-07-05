import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import boutiqueRouter from "./boutique";
import saasRouter from "./saas";
import setupRouter from "./setup";
import aiRouter from "./ai";
import cronRouter from "./cron";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(boutiqueRouter);
router.use(saasRouter);
router.use(setupRouter);
router.use(aiRouter);
router.use(cronRouter);

export default router;
