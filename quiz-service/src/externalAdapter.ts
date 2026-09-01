import { QuizQuestion, ExternalProviderConfig, StudentScoreWebhookPayload } from './types.js';

export class ExternalAdapter {
  private config: ExternalProviderConfig;

  constructor(config: ExternalProviderConfig = {}) {
    this.config = {
      apiUrl: process.env.EXTERNAL_QUIZ_API_URL || config.apiUrl,
      apiKey: process.env.EXTERNAL_QUIZ_API_KEY || config.apiKey,
      fetchOnDemand: process.env.EXTERNAL_FETCH_ON_DEMAND === 'true' || config.fetchOnDemand || false,
      webhookUrl: process.env.STUDENT_SCORE_WEBHOOK_URL || config.webhookUrl,
      timeoutMs: config.timeoutMs || 4000
    };
  }

  public updateConfig(newConfig: Partial<ExternalProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ExternalProviderConfig {
    return {
      apiUrl: this.config.apiUrl,
      hasApiKey: !!this.config.apiKey,
      fetchOnDemand: this.config.fetchOnDemand,
      webhookUrl: this.config.webhookUrl,
      timeoutMs: this.config.timeoutMs
    } as any;
  }

  /**
   * ดึงโจทย์แบบสด (On-Demand) จาก External LMS / API ของอาจารย์
   */
  public async fetchFromExternalApi(category?: string, difficulty?: string): Promise<QuizQuestion | null> {
    if (!this.config.apiUrl) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs || 3000);

    try {
      const url = new URL(this.config.apiUrl);
      if (category && category !== 'ALL') url.searchParams.append('category', category);
      if (difficulty && difficulty !== 'ALL') url.searchParams.append('difficulty', difficulty);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'TankQuizBattle-Adapter/1.0'
      };

      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const res = await fetch(url.toString(), {
        headers,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[ExternalAdapter] External API error HTTP ${res.status}`);
        return null;
      }

      const data: any = await res.json();
      const rawQuestion = Array.isArray(data) ? data[0] : (data.question || data);

      if (!rawQuestion || !rawQuestion.questionTh || !Array.isArray(rawQuestion.options)) {
        return null;
      }

      return {
        id: rawQuestion.id ? `ext-${rawQuestion.id}` : `ext-${Date.now()}`,
        category: (rawQuestion.category || category || 'EXTERNAL').toUpperCase(),
        categoryTh: rawQuestion.categoryTh || 'ระบบอาจารย์ภายนอก',
        questionTh: rawQuestion.questionTh,
        questionEn: rawQuestion.questionEn,
        options: rawQuestion.options.slice(0, 4),
        correctIndex: typeof rawQuestion.correctIndex === 'number' ? rawQuestion.correctIndex : 0,
        explanationTh: rawQuestion.explanationTh || 'ตอบถูกต้อง!',
        timeLimitSeconds: rawQuestion.timeLimitSeconds || (difficulty === 'HARD' ? 7 : difficulty === 'EASY' ? 2 : 5),
        rewardAmmo: rawQuestion.rewardAmmo || 3,
        bonusPoints: rawQuestion.bonusPoints || 100,
        difficulty: rawQuestion.difficulty || (difficulty as any) || 'MEDIUM',
        source: 'EXTERNAL',
        externalId: String(rawQuestion.id || '')
      };
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[ExternalAdapter] Failed to fetch external question: ${err.message}`);
      return null;
    }
  }

  /**
   * ส่งผลการตอบคำถามของนักเรียนกลับไปยัง Webhook หรือ LMS ของอาจารย์
   */
  public async reportScoreToWebhook(payload: StudentScoreWebhookPayload): Promise<boolean> {
    if (!this.config.webhookUrl) return false;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'TankQuizBattle-Webhook/1.0'
      };

      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      const res = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      return res.ok;
    } catch (err: any) {
      console.warn(`[ExternalAdapter] Webhook report failed: ${err.message}`);
      return false;
    }
  }
}
