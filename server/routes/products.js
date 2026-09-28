const express = require('express');
const { getProductByHandle } = require('../shopify');

const router = express.Router();
const handlePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

router.get('/:handle', async (request, response) => {
  const { handle } = request.params;

  if (!handlePattern.test(handle)) {
    return response.status(400).json({
      success: false,
      error: 'Invalid product handle',
    });
  }

  try {
    const product = await getProductByHandle(handle);

    if (!product) {
      return response.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    return response.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Product API error:', error.message);

    if (error.code === 'SHOPIFY_CONFIG') {
      return response.status(503).json({
        success: false,
        error: 'Shopify API credentials are not configured',
      });
    }

    return response.status(500).json({
      success: false,
      error: 'Unable to retrieve product',
    });
  }
});

module.exports = router;