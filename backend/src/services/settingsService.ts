import { supabaseService } from '../db/supabase.ts';
import type { SystemSettings } from '../types/index.ts';
import { AuditService } from './auditService.ts';

const DEFAULT_SETTINGS: SystemSettings = {
  // Apostas & Limites
  minStake: 20,
  maxStake: 50000,
  maxDailyStakePerUser: 100000,
  maxPotentialWin: 1000000,
  maxPayoutPerEvent: 500000,

  // Taxas
  withdrawalFeePercentage: 5,
  withdrawalFeeActive: true,
  minWithdrawal: 20,
  maxWithdrawal: 100000,
  minDeposit: 20,
  maxDeposit: 250000,

  // Risco
  maxExposurePerMarket: 200000,
  maxExposurePerOutcome: 100000,
  riskMediumThresholdPct: 50,
  riskHighThresholdPct: 80,
  autoSuspendHighRisk: true,
  riskAlertsEnabled: true,

  // Mercados
  enabledMarkets: {
    '1X2': true,
    'CORRECT_SCORE': true,
  },

  // WhatsApp / Apoio
  whatsapp: {
    enabled: true,
    phone: '+258872344381',
    message: 'Olá, preciso de apoio.',
    buttonText: 'Apoio ZONABET',
    position: 'bottom-right',
  },

  // Interface & Branding
  platformName: 'ZONABET',
  announcementNotice:
    'Bem-vindo à ZONABET • Apostas em Futebol Moçambicano (Moçambola, Provinciais e Distritais) • Levantamentos rápidos via e-Mola',
  announcementActive: true,
  supportEmail: 'suporte@zonabet.co.mz',
  currencySymbol: 'MT',
  currencyCode: 'MZN',
};

class SettingsServiceClass {
  private settings: SystemSettings;
  private lastFetchTime: number = 0;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  public async getSettings(): Promise<SystemSettings> {
    const client = supabaseService.getClient();
    // Fetch from Supabase with basic 5 second cache to prevent spamming
    if (client && Date.now() - this.lastFetchTime > 5000) {
      try {
        const { data, error } = await client
          .from('system_settings')
          .select('config')
          .eq('id', 'default')
          .single();
        if (data && data.config) {
          this.settings = { ...this.settings, ...data.config };
          this.lastFetchTime = Date.now();
        }
      } catch (e) {
        console.error('Failed to fetch settings from Supabase:', e);
      }
    }
    return { ...this.settings };
  }

  public async getPublicSettings(): Promise<{
    withdrawalFeePercentage: number;
    withdrawalFeeActive: boolean;
    minWithdrawal: number;
    maxWithdrawal: number;
    minStake: number;
    maxStake: number;
    maxPotentialWin: number;
    whatsapp: SystemSettings['whatsapp'];
    platformName: string;
    announcementNotice: string;
    announcementActive: boolean;
    currencySymbol: string;
    currencyCode: string;
    enabledMarkets: SystemSettings['enabledMarkets'];
  }> {
    const s = await this.getSettings();
    return {
      withdrawalFeePercentage: s.withdrawalFeeActive ? s.withdrawalFeePercentage : 0,
      withdrawalFeeActive: s.withdrawalFeeActive,
      minWithdrawal: s.minWithdrawal,
      maxWithdrawal: s.maxWithdrawal,
      minStake: s.minStake,
      maxStake: s.maxStake,
      maxPotentialWin: s.maxPotentialWin,
      whatsapp: s.whatsapp,
      platformName: s.platformName,
      announcementNotice: s.announcementNotice,
      announcementActive: s.announcementActive,
      currencySymbol: s.currencySymbol,
      currencyCode: s.currencyCode,
      enabledMarkets: s.enabledMarkets,
    };
  }

  public async updateSettings(
    newValues: Partial<SystemSettings>,
    adminId: string,
    adminEmail: string,
    ip: string = '127.0.0.1'
  ): Promise<SystemSettings> {
    await this.getSettings(); // sync first
    
    const oldSettings = { ...this.settings };

    // Deep merge nested fields safely
    this.settings = {
      ...this.settings,
      ...newValues,
      whatsapp: {
        ...this.settings.whatsapp,
        ...(newValues.whatsapp || {}),
      },
      enabledMarkets: {
        ...this.settings.enabledMarkets,
        ...(newValues.enabledMarkets || {}),
      },
    };

    // Sanitize values
    if (this.settings.withdrawalFeePercentage < 0) this.settings.withdrawalFeePercentage = 0;
    if (this.settings.withdrawalFeePercentage > 100) this.settings.withdrawalFeePercentage = 100;
    if (this.settings.minStake < 1) this.settings.minStake = 1;
    if (this.settings.maxStake < this.settings.minStake) this.settings.maxStake = this.settings.minStake;

    // Log the change in the Audit Log
    AuditService.log(
      adminId,
      adminEmail,
      'UPDATE_SYSTEM_SETTINGS',
      'Configuration',
      'global-settings',
      oldSettings,
      this.settings,
      ip
    );
    
    const client = supabaseService.getClient();
    if (client) {
      await client.from('system_settings').upsert({ id: 'default', config: this.settings });
    }
    
    return { ...this.settings };
  }
}

export const settingsService = new SettingsServiceClass();
