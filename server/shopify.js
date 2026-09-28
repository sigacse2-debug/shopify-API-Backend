const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';

const productQuery = `
  query GetProductByHandle($search: String!) {
    products(first: 1, query: $search) {
      nodes {
        id
        title
        handle
        description
        vendor
        productType
        metafield(namespace: "custom", key: "material") {
          namespace
          key
          value
          type
        }
      }
    }
  }
`;

function getShopifyConfig() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION;

  if (
    !storeDomain ||
    storeDomain === 'your-store.myshopify.com' ||
    !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(storeDomain) ||
    !accessToken
  ) {
    const error = new Error('Shopify credentials are not configured');
    error.code = 'SHOPIFY_CONFIG';
    throw error;
  }

  if (!/^\d{4}-\d{2}$/.test(apiVersion)) {
    const error = new Error('SHOPIFY_API_VERSION must use YYYY-MM format');
    error.code = 'SHOPIFY_CONFIG';
    throw error;
  }

  return { storeDomain, accessToken, apiVersion };
}

async function shopifyGraphQL(query, variables = {}) {
  const { storeDomain, accessToken, apiVersion } = getShopifyConfig();
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  let response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error('Unable to connect to Shopify');
  }

  if (!response.ok) {
    throw new Error(`Shopify API returned HTTP ${response.status}`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Invalid response received from Shopify');
  }

  if (result.errors?.length) {
    console.error('Shopify GraphQL errors:', result.errors);
    throw new Error('Shopify GraphQL request failed');
  }

  if (!result.data) {
    throw new Error('Shopify returned no product data');
  }

  return result.data;
}

async function getProductByHandle(handle) {
  const data = await shopifyGraphQL(productQuery, {
    search: `handle:${handle}`,
  });

  return data.products.nodes[0] || null;
}

module.exports = {
  getProductByHandle,
  shopifyGraphQL,
};