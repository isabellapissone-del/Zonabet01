import { z } from 'zod';
import { config } from '../config/index.ts';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome completo deve ter pelo menos 2 caracteres'),
  phone: z.string().min(8, 'Número de celular inválido (ex: 841234567 ou +258 84 123 4567)'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação da palavra-passe necessária'),
  referralCode: z.string().optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, 'Palavra-passe é obrigatória'),
}).refine((data) => !!(data.identifier || data.email || data.phone), {
  message: 'Número de celular ou email é obrigatório',
  path: ['identifier'],
});

export const createMatchSchema = z.object({
  competitionId: z.string().min(1, 'Competição é obrigatória'),
  homeTeam: z.string().min(1, 'Equipa da casa é obrigatória'),
  awayTeam: z.string().min(1, 'Equipa visitante é obrigatória'),
  kickoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  kickoffTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:mm)'),
  description: z.string().optional(),
  odds: z.object({
    home: z.number().gt(1, 'Odd deve ser maior que 1.00'),
    draw: z.number().gt(1, 'Odd deve ser maior que 1.00'),
    away: z.number().gt(1, 'Odd deve ser maior que 1.00'),
  }),
});

export const updateOddsSchema = z.object({
  odds: z.object({
    home: z.number().gt(1, 'Odd deve ser maior que 1.00'),
    draw: z.number().gt(1, 'Odd deve ser maior que 1.00'),
    away: z.number().gt(1, 'Odd deve ser maior que 1.00'),
  }),
});

export const updateMatchStatusSchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'SUSPENDED', 'CLOSED', 'CANCELLED']),
  reason: z.string().optional(),
});

export const betItemSchema = z.object({
  matchId: z.string().min(1, 'ID do jogo obrigatório'),
  marketId: z.string().min(1, 'ID do mercado obrigatório'),
  selectionId: z.string().min(1, 'ID da seleção obrigatório'),
});

export const placeBetSchema = z.object({
  items: z.array(betItemSchema).min(1, 'Pelo menos uma seleção é necessária'),
  stake: z.number()
    .gte(config.limits.minimumStake, `A aposta mínima é de ${config.limits.minimumStake} MT (${config.limits.minimumStake} MZN)`)
    .lte(config.limits.maximumStake, `A aposta máxima é de ${config.limits.maximumStake} MZN`),
  idempotencyKey: z.string().optional(),
});

export const matchResultSchema = z.object({
  homeScore: z.number().int().min(0, 'Golos não podem ser negativos'),
  awayScore: z.number().int().min(0, 'Golos não podem ser negativos'),
});

export const balanceAdjustmentSchema = z.object({
  userId: z.string().min(1, 'ID do utilizador é obrigatório'),
  amount: z.number().refine((val) => val !== 0, 'Valor de ajuste não pode ser zero'),
  reason: z.string().min(5, 'Motivo de auditoria é obrigatório (mínimo 5 caracteres)'),
});
