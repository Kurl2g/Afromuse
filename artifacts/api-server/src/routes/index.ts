import { Router, type IRouter } from "express";
import healthRouter from "./health";
import generateSongRouter from "./generate-song";

const router: IRouter = Router();

router.use(healthRouter);
router.use(generateSongRouter);

export default router;
