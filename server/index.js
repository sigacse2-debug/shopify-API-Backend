require('dotenv').config();

const express = require('express');
const productRoutes = require('./routes/products');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/health', (request, response) => {
  response.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

app.use('/api/products', productRoutes);

app.use((request, response) => {
  response.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use((error, request, response, next) => {
  console.error('Server error:', error.message);
  response.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

module.exports = app;
