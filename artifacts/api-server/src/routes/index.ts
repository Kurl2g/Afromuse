import { Router, type IRouter } from "express";
import healthRouter from "./health";
import generateSongRouter from "./generate-song";
import generateAudioRouter from "./generate-audio";
import authRouter from "./auth";
import adminRouter from "./admin";
import projectsRouter from "./projects";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(generateSongRouter);
router.use(generateAudioRouter);
router.use(adminRouter);
router.use(projectsRouter);

export default router;
