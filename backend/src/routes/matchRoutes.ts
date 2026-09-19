import { Router } from 'express';
import { MatchController } from '../controllers/matchController.ts';

const router = Router();

router.get('/', MatchController.listMatches);
router.get('/competitions', MatchController.getCompetitions);
router.get('/teams', MatchController.getTeams);
router.get('/:id', MatchController.getMatch);

export default router;
