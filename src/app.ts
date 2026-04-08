import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logging.middleware';
import routes from './routes';

const app = express();

const getInlineOpenApiScript = (): string => {
  const serialized = JSON.stringify(swaggerSpec)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `<script id="openapi-inline-spec" type="application/json">${serialized}</script>`;
};

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'API Call Detector Service' });
});

app.get('/openapi.json', (_req, res) => {
  res.status(200).json(swaggerSpec);
});

app.use('/docs', swaggerUi.serveFiles(swaggerSpec));
app.get('/docs', (_req, res) => {
  const html = swaggerUi.generateHTML(swaggerSpec, {
    explorer: true,
  });

  const htmlWithInlineSpec = html.replace('</body>', `${getInlineOpenApiScript()}</body>`);
  res.status(200).send(htmlWithInlineSpec);
});

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
