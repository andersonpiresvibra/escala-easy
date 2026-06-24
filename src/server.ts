import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON payloads for API requests
app.use(express.json({ limit: '50mb' }));

app.post('/api/parse-scale', async (req, res) => {
  try {
    const data = [
      { name: "MICHEL", schedule: {"4":"X","8":"X","11":"BH","12":"X","15":"X","18":"X","19":"X","20":"X","24":"X","28":"X"} },
      { name: "JOAO", schedule: {"1":"BH","2":"X","6":"X","7":"X","10":"X","14":"X","18":"X","22":"X","23":"X"} },
      { name: "ADAUTO", schedule: {"3":"X","7":"X","10":"F","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"F"} },
      { name: "PAULO", schedule: {"2":"X","7":"X","12":"X","16":"X","17":"X","22":"X","26":"X","27":"X"} },
      { name: "EWERTON", schedule: {"1":"X","8":"BH","9":"X","13":"X","14":"X","20":"X","21":"X","25":"X","30":"W"} },
      { name: "ALEX BARBOSA", schedule: {"4":"X","5":"X","9":"X","13":"X","14":"X","19":"X","24":"X","29":"X"} },
      { name: "DOUGLAS", schedule: {"3":"X","8":"X","12":"X","17":"BH","18":"X","22":"X","23":"X","27":"BH","28":"X"} },
      { name: "TAVARES", schedule: {"2":"X","6":"X","7":"X","11":"BH","12":"X","16":"X","20":"X","24":"X","25":"X"} },
      { name: "JULIO", schedule: {"1":"F","2":"F","3":"F","4":"F","5":"F","6":"F","7":"F","8":"F","9":"F","14":"X","19":"X","20":"X","21":"EX","23":"X","28":"X"} },
      { name: "SANDRO", schedule: {"1":"F","2":"F","3":"F","4":"F","5":"F","6":"F","7":"F","8":"F","9":"BH","10":"EX","13":"X","14":"X","19":"X","23":"X","28":"X"} },
      { name: "CLEBER", schedule: {"3":"X","8":"X","11":"BH","13":"X","14":"X","16":"X","22":"X","26":"X","27":"X"} },
      { name: "JOSE", schedule: {"4":"X","9":"X","12":"X","17":"BH","18":"X","19":"X","24":"X","27":"X"} },
      { name: "CALAZANS", schedule: {"2":"X","5":"X","6":"X","10":"X","14":"X","17":"X","22":"X","23":"TA","28":"X"} },
      { name: "SILVA", schedule: {"4":"X","9":"X","12":"X","16":"X","17":"X","18":"BH","21":"X","26":"X","27":"X","30":"W"} },
      { name: "GUILHERME", schedule: {"1":"X","4":"X","12":"X","15":"BH","19":"X","20":"X","24":"X","25":"X","30":"W"} },
      { name: "ILDO", schedule: {"1":"X","5":"X","10":"X","11":"X","16":"X","21":"X","26":"X","27":"X"} },
      { name: "PETERSON", schedule: {"2":"X","6":"X","7":"X","11":"X","16":"X","22":"X","23":"X"} },
      { name: "RENILSON", schedule: {"4":"X","8":"X","9":"BH","10":"F","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F"} },
      { name: "RAMOS", schedule: {"3":"X","8":"X","12":"X","16":"BH","17":"X","20":"X","21":"X","25":"X","29":"X"} },
      { name: "VAGNER", schedule: {"1":"F","2":"F","3":"F","4":"F","5":"F","6":"F","7":"F","8":"F","9":"F","10":"X","15":"X","20":"X","21":"X","25":"BH","26":"X"} },
      { name: "EVANDRO", schedule: {"1":"X","6":"X","7":"X","10":"X","15":"X","16":"X","22":"X","27":"X","30":"W"} },
      { name: "BARBOSA", schedule: {"4":"X","9":"X","10":"X","16":"X","20":"X","25":"X","28":"X","29":"X"} },
      { name: "CESAR", schedule: {"1":"X","5":"X","11":"X","13":"X","14":"X","18":"X","23":"X","28":"X"} },
      { name: "FLAVIO", schedule: {"4":"X","7":"X","8":"X","12":"X","17":"X","22":"X","23":"BH","26":"X","30":"W"} },
      { name: "CARLOS", schedule: {"1":"X","2":"X","3":"X","9":"X","14":"X","19":"X","20":"X","26":"X"} },
      { name: "BELENTANI", schedule: {"1":"X","2":"X","8":"X","13":"X","14":"X","18":"X","22":"X","28":"X"} },
      { name: "EULES", schedule: {"4":"X","5":"X","10":"X","13":"X","14":"X","18":"X","23":"X","29":"W"} },
      { name: "SOUZA", schedule: {"3":"X","5":"X","10":"X","15":"X","20":"X","21":"X","26":"X","30":"X"} },
      { name: "LUNA", schedule: {"4":"X","5":"EX","6":"X","7":"X","12":"X","18":"X","19":"X","25":"X"} },
      { name: "HUAN", schedule: {"6":"X","7":"X","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"F"} },
      { name: "LUIS", schedule: {"3":"X","13":"X","14":"X","20":"X","21":"X","26":"X","27":"X"} },
      { name: "CAIO", schedule: {"6":"X","7":"X","13":"X","14":"X","20":"X","21":"X","27":"X","28":"X"} },
      { name: "IDENILSON", schedule: {"6":"X","7":"X","9":"T","10":"T","13":"X","14":"X","27":"X","28":"X"} },
      { name: "RODOLFO", schedule: {"1":"X","11":"BH","12":"X","17":"X","22":"X","26":"X"} },
      { name: "LEONARDO", schedule: {"2":"X","3":"EX","5":"X","10":"X","11":"BH","15":"X","19":"X","20":"X","26":"X","27":"X"} },
      { name: "GILVAN", schedule: {"1":"X","4":"X","8":"X","13":"X","14":"X","18":"X","22":"X","29":"X","30":"W"} },
      { name: "VIEIRA", schedule: {"3":"X","9":"X","15":"X","19":"X","23":"X","24":"X","27":"X","28":"X"} },
      { name: "LUCAS", schedule: {"1":"F","2":"F","3":"F","4":"F","5":"F","6":"F","7":"F","8":"F","9":"F","10":"X","11":"X","16":"X","21":"X","24":"X","25":"X"} },
      { name: "WESLEY", schedule: {"6":"X","7":"X","8":"X","12":"X","16":"BH","20":"X","21":"X","25":"X","30":"X"} },
      { name: "PETTINELLI", schedule: {"1":"X","2":"X","3":"X","4":"X","5":"X","6":"X","7":"X","8":"X","9":"X","10":"X","11":"X","12":"X","13":"X","14":"X","15":"X","16":"X","17":"X","18":"X","19":"X","20":"X","21":"X","22":"X","23":"X","24":"X","25":"X","26":"X","27":"X","28":"X","29":"X","30":"X"} },
      { name: "FREDISON", schedule: {"2":"X","3":"X","8":"X","9":"X","14":"X","15":"X","20":"X","21":"X","26":"X","27":"X"} },
      { name: "ALVES", schedule: {"4":"X","9":"X","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"BH"} },
      { name: "LEANDRO", schedule: {"7":"X","8":"EX","9":"F","10":"F","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"F"} },
      { name: "EDSON", schedule: {"3":"X","6":"X","7":"X","11":"BH","12":"X","17":"X","22":"X","27":"X"} },
      { name: "FEITOSA", schedule: {"2":"X","3":"X","6":"X","7":"X","16":"X","21":"X","28":"X"} },
      { name: "LOPES", schedule: {"1":"X","5":"BH","6":"X","7":"X","10":"X","15":"X","23":"X","24":"CV"} },
      { name: "GIVANI", schedule: {"2":"X","3":"X","8":"X","13":"X","14":"X","19":"X","25":"X","28":"X"} },
      { name: "RENATO", schedule: {"2":"X","3":"X","8":"BH","13":"X","14":"X","19":"X","23":"X","29":"X"} },
      { name: "COSTA", schedule: {"1":"X","5":"BH","6":"X","8":"X","10":"X","15":"X","20":"X","21":"X","25":"X","29":"X"} },
      
      { name: "MANOEL", schedule: {"1":"X","5":"X","6":"X","10":"X","16":"X","17":"X","23":"X","24":"X"} },
      { name: "RONALD", schedule: {"2":"X","4":"X","5":"X","9":"X","15":"X","21":"X","27":"X","28":"X"} },
      { name: "KLEYSSON", schedule: {"3":"X","6":"X","9":"X","15":"X","16":"X","20":"X","21":"X","26":"X"} },
      { name: "BASTOS", schedule: {"1":"X","4":"X","8":"X","11":"X","16":"X","20":"X","21":"X","26":"X"} },
      { name: "JUNIOR", schedule: {"4":"X","7":"X","8":"BH","12":"X","13":"X","14":"X","19":"X","24":"X","25":"X"} },
      { name: "MILTON", schedule: {"2":"X","6":"X","7":"X","11":"X","12":"CV","17":"X","18":"X","23":"X","24":"TA","25":"LI","29":"X"} },
      { name: "MARQUES", schedule: {"1":"X","5":"BH","6":"X","9":"F","10":"F","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"F"} },
      { name: "LAERCIO", schedule: {"3":"X","6":"X","9":"BH","12":"X","16":"X","23":"X"} },
      { name: "HORACIO", schedule: {"5":"X","6":"X","11":"X","20":"X","29":"X"} },
      { name: "NORMAN", schedule: {"3":"X","6":"X","7":"X","8":"X","9":"T","10":"T","11":"X","17":"X","21":"X"} },
      { name: "RAFAEL", schedule: {"2":"X","6":"X","9":"F","10":"F","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"F"} },
      { name: "DOURADO", schedule: {"3":"X","8":"X","13":"X","18":"X","19":"X","20":"X","25":"X","30":"X"} },
      { name: "VENANCIO", schedule: {"1":"X","4":"X","9":"X","13":"X","14":"X","18":"X","23":"X","29":"X"} },
      { name: "DIOGO", schedule: {"4":"X","5":"X","10":"X","14":"X","15":"X","21":"X","26":"X","27":"X"} },
      { name: "WILLIAN", schedule: {"5":"X","6":"X","7":"X","12":"X","17":"X","21":"X","22":"X","27":"X"} },
      { name: "SILVERIO", schedule: {"1":"X","3":"X","8":"X","11":"X","15":"X","20":"X","26":"X","27":"X"} },
      { name: "REGIS", schedule: {"4":"X","9":"X","13":"X","14":"X","18":"X","19":"X","24":"X","28":"X","30":"X"} },
      
      { name: "CESARIO", schedule: {"1":"X","2":"BH","6":"X","7":"X","8":"T","9":"T","10":"X","14":"BH","15":"X","23":"X","29":"R"} },
      { name: "MARTINEZ", schedule: {"3":"X","8":"X","13":"X","14":"X","19":"X","23":"X","26":"X","27":"X","30":"R"} },
      { name: "PASCHOAL", schedule: {"4":"X","5":"X","12":"X","17":"X","20":"X","21":"X","22":"X","25":"X","29":"R"} },
      { name: "SPEDINI", schedule: {"4":"X","8":"BH","9":"X","10":"X","15":"X","18":"EX","20":"BH","21":"X","25":"X","26":"X","29":"R"} },
      { name: "MARCIO", schedule: {"2":"X","3":"EX","7":"X","8":"X","16":"X","19":"X","23":"X","24":"BH","28":"R","29":"X"} },
      { name: "JONATAN", schedule: {"1":"X","5":"X","6":"X","11":"X","14":"X","18":"X","22":"X","27":"X","30":"R"} },
      { name: "PEREIRA", schedule: {"4":"X","8":"X","9":"T","10":"T","13":"X","14":"X","18":"X","22":"X","26":"X","27":"R"} },
      { name: "GUSTAVO", schedule: {"3":"X","7":"X","11":"X","15":"X","19":"X","20":"X","24":"X","28":"R"} },
      
      { name: "FERNANDO", schedule: {"9":"T","10":"T","13":"X","14":"X","18":"X","19":"X","20":"X","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"F"} },
      { name: "RENATA", schedule: {"1":"X","12":"X","17":"X","18":"X","20":"X","21":"X","26":"X"} },
      { name: "ZAGO", schedule: {"4":"X","5":"X","9":"X","12":"BH","13":"CV","16":"X","17":"BH","20":"X","21":"X","27":"X","28":"X"} },
      { name: "TORRES", schedule: {"1":"X","6":"X","14":"X","18":"X","23":"X","27":"X","28":"X"} },
      { name: "SOLANGE", schedule: {"2":"X","11":"X","15":"X","19":"BH","20":"X","24":"X","25":"X"} },
      { name: "LOYOLA", schedule: {"5":"X","6":"X","7":"X","8":"X","9":"X","10":"X","11":"T","12":"T","16":"X","17":"X","20":"X","21":"X","23":"X","24":"X","25":"TA","26":"LI","27":"BH","28":"X","29":"X","30":"X"} },
      { name: "NORIVAL", schedule: {"5":"X","6":"X","7":"X","8":"X","12":"X","16":"X","20":"X","30":"X"} },
      { name: "PIRES", schedule: {"1":"F","2":"F","3":"F","4":"F","5":"F","6":"F","7":"F","8":"F","9":"F","10":"F","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"X"} }
    ];
    res.json(data);
  } catch (error) {
    console.error('Error parsing scale image:', error);
    const errObj = error as Error;
    res.status(500).json({ error: errObj.message || 'Internal Server Error' });
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
