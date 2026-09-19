import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// In production, if JWT_SECRET is not explicitly provided, generate a secure random secret or fallback with a warning so the container doesn't crash on startup
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is not set. Generating a session fallback secret for this instance.');
    jwtSecret = process.env.FALLBACK_JWT_SECRET || crypto.randomBytes(32).toString('hex');
  } else {
    jwtSecret = 'dev_secret_only_for_local_development_do_not_use_in_prod';
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret,
  jwtExpiresIn: '7d',
  limits: {
    minimumStake: parseFloat(process.env.MINIMUM_STAKE || '20'),
    maximumStake: parseFloat(process.env.MAXIMUM_STAKE || '50000'),
    maximumPotentialWin: parseFloat(process.env.MAXIMUM_POTENTIAL_WIN || '1000000'),
  },
  currency: 'MZN',
  isTestMode: !isProduction, // In-memory/test only when not production unless configured
};
