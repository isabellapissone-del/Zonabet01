import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

export class AIService {
  private static ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  static async analyzeMatchesFromImage(base64Image: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no servidor.');
    }

    // Extract mimeType if data URL
    let mimeType = "image/png";
    const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    // Remove data URL prefix
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const prompt = `
      Analise esta imagem que contém um calendário ou lista de partidas de futebol.
      Extraia todas as partidas identificáveis no formato JSON.
      
      Para cada partida, identifique:
      - competição (ex: Moçambola, Campeonato Provincial de Sofala, etc.)
      - data (formato YYYY-MM-DD)
      - hora (formato HH:MM)
      - equipa da casa (homeTeam)
      - equipa visitante (awayTeam)
      - estádio (stadium) - opcional
      - rodada ou jornada (round) - opcional
      
      Regras importantes:
      1. Se uma informação não for clara, deixe o campo como null ou string vazia. Não invente dados.
      2. Tente normalizar os nomes das equipas para o formato mais comum.
      3. Se houver várias partidas, retorne todas em uma lista.
    `;

    const maxRetries = 3;
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: { parts: [imagePart, { text: prompt }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matches: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      competition: { type: Type.STRING },
                      date: { type: Type.STRING },
                      time: { type: Type.STRING },
                      homeTeam: { type: Type.STRING },
                      awayTeam: { type: Type.STRING },
                      stadium: { type: Type.STRING },
                      round: { type: Type.STRING },
                    },
                    required: ["competition", "homeTeam", "awayTeam"]
                  }
                }
              }
            }
          }
        });

        const text = response.text;
        if (!text) return { matches: [] };
        
        return JSON.parse(text);
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${i + 1} failed:`, error.message);
        
        // If it's a 503 or 429, wait and retry
        if (error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('high demand')) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential-ish backoff
          continue;
        }
        
        throw new Error(`Erro na análise da IA: ${error.message}`);
      }
    }

    throw new Error(`O servidor da IA está temporariamente sobrecarregado após ${maxRetries} tentativas. Por favor, tente novamente em alguns instantes.`);
  }
}
