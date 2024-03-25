const swaggerAutogen = require('swagger-autogen')();

const doc = {
	info: {
		title: 'suno ai api',
		description: 'suno ai api'
	},
	host: 'localhost:8787'
};

const outputFile = './docs/swagger.json';
const routes = ['./src/api.ts'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc).then(r => {});
