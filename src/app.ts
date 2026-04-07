import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logging.middleware';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
