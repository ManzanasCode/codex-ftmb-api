import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Call Detector Service',
      version: '1.0.0',
      description: 'Microservice to detect and extract XHR/fetch API calls from webpages.',
    },
    tags: [
      {
        name: 'Detection',
        description: 'API call detection endpoints',
      },
      {
        name: 'Health',
        description: 'Service health endpoints',
      },
    ],
    components: {
      schemas: {
        DetectRequest: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/page',
            },
            filters: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['matchOdds', 'nextmatch', 'matchDetails'],
              description:
                'Optional terms used to filter detected request URLs. Empty array returns all detected records.',
            },
          },
        },
        ApiCall: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              example: 'https://example.com/api/users',
            },
            method: {
              type: 'string',
              example: 'GET',
            },
            status: {
              type: 'integer',
              example: 200,
            },
            size: {
              type: 'integer',
              example: 12345,
            },
            timestamp: {
              type: 'integer',
              example: 171234567,
            },
            data: {
              nullable: true,
              oneOf: [{ type: 'object' }, { type: 'array' }, { type: 'string' }, { type: 'number' }, { type: 'boolean' }],
              example: { users: [{ id: 1, name: 'Jane' }] },
            },
          },
        },
        DetectResponse: {
          type: 'object',
          properties: {
            matchId: {
              type: 'string',
              nullable: true,
              example: '4803340',
            },
            teamIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['10233', '9885'],
            },
            totalRecords: {
              type: 'integer',
              example: 3,
            },
            records: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ApiCall',
              },
            },
          },
        },
      },
    },
  },
  apis: [
    path.resolve(process.cwd(), 'src/routes/*.ts'),
    path.resolve(process.cwd(), 'dist/routes/*.js'),
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
