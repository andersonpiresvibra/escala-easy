import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI } from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON payloads for API requests
app.use(express.json({ limit: '50mb' }));

app.post('/api/parse-scale', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: 'Missing imageBase64 or mimeType' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env['GEMINI_API_KEY'],
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Analise esta imagem contendo uma escala de trabalho. Quero que você extraia os dias que contêm 'X' para cada colaborador listado. Retorne estritamente um array JSON sem formatação markdown. Formato esperado:\n[\n  { \"name\": \"NOME DO COLABORADOR\", \"days\": [1, 5, 10, ...] },\n  ...\n]" },
            { inlineData: { data: imageBase64, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      res.json(data);
    } else {
      res.status(500).json({ error: 'Failed to generate response' });
    }
  } catch (error: unknown) {
    console.error('Error parsing scale image:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
