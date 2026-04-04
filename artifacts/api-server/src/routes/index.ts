import { Router, type IRouter } from "express";
import healthRouter from "./health";
import generateSongRouter from "./generate-song";
import generateAudioRouter from "./generate-audio";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(generateSongRouter);
router.use(generateAudioRouter);

export default router;
