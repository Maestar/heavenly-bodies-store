const storeDomain = "heavenly-bodies-dev.myshopify.com";
const endpoint = `https://${storeDomain}/api/2026-10/graphql.json`;

async function storefrontRequest(query, variables = {}) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": "4ccc20464e13eda612bc89dd56c6fe3d"
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
        throw new Error(`Shopify request failed: ${response.status} ${await response.text()}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(JSON.stringify(result.errors));
    }

    return result.data;
}

export async function getProducts() {
    const query = /* GraphQL */ `
        query {
            products(first: 10) {
                nodes {
                    id
                    title
                    featuredImage {
                        url
                        altText
                    }
                    priceRange {
                        minVariantPrice {
                            amount
                            currencyCode
                        }
                    }
                    variants(first: 10) {
                        nodes {
                            id
                            title
                            availableForSale
                            price {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
    `;

    const data = await storefrontRequest(query);
    return data.products.nodes;
}

export async function createCart(variantId) {
    const mutation = /* GraphQL */ `
        mutation CreateCart($lines: [CartLineInput!]!) {
            cartCreate(input: { lines: $lines }) {
                cart {
                    id
                    totalQuantity
                    checkoutUrl
                    lines(first: 20) {
                        nodes {
                            id
                            quantity
                            merchandise {
                                ... on ProductVariant {
                                    title
                                    product {
                                        title
                                    }
                                }
                            }
                        }
                    }
                }
                userErrors {
                    message
                }
            }
        }
    `;

    const data = await storefrontRequest(mutation, {
        lines: [{ merchandiseId: variantId, quantity: 1 }]
    });

    if (data.cartCreate.userErrors.length) {
        throw new Error(JSON.stringify(data.cartCreate.userErrors));
    }

    if (!data.cartCreate.cart) {
        throw new Error("Shopify did not return a cart");
    }

    return data.cartCreate.cart;
}

export async function addCartLine(cartId, variantId) {
    const mutation = /* GraphQL */ `
        mutation AddCartLine($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
                cart {
                    id
                    totalQuantity
                    checkoutUrl
                    lines(first: 20) {
                        nodes {
                            id
                            quantity
                            merchandise {
                                ... on ProductVariant {
                                    title
                                    product {
                                        title
                                    }
                                }
                            }
                        }
                    }
                }
                userErrors {
                    message
                }
                warnings {
                    message
                }
            }
        }
    `;

    const data = await storefrontRequest(mutation, { cartId, lines: [{ merchandiseId: variantId, quantity: 1 }] });

    const result = data.cartLinesAdd;

    if (result.userErrors.length) {
        throw new Error(JSON.stringify(result.userErrors));
    }
    if (result.warnings.length) {
        console.warn("Shopify cart warnings:", result.warnings);
    }
    if (!result.cart) {
        throw new Error("Shopify did not return a cart.");
    }

    return result.cart;
}

export async function removeCartLine(cartId, lineId) {
    const mutation = /* GraphQL */ `
        mutation RemoveCartLine($cartId: ID!, $lineIds: [ID!]!) {
            cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart {
                    id
                    totalQuantity
                    checkoutUrl
                    lines(first: 20) {
                        nodes {
                            id
                            quantity
                            merchandise {
                                ... on ProductVariant {
                                    title
                                    product {
                                        title
                                    }
                                }
                            }
                        }
                    }
                }
                userErrors {
                    message
                }
                warnings {
                    message
                }
            }
        }
    `;

    const data = await storefrontRequest(mutation, { cartId, lineIds: [lineId] });

    const result = data.cartLinesRemove;

    if (result.userErrors.length) {
        throw new Error(JSON.stringify(result.userErrors));
    }
    if (result.warnings.length) {
        console.warn("Shopify cart warnings:", result.warnings);
    }
    if (!result.cart) {
        throw new Error("Shopify did not return a cart.");
    }
    return result.cart;
}

export async function getCart(cartId) {
    const query = /* GraphQL */ `
        query GetCart($cartId: ID!) {
            cart(id: $cartId) {
                id
                totalQuantity
                checkoutUrl
                lines(first: 20) {
                    nodes {
                        id
                        quantity
                        merchandise {
                            ... on ProductVariant {
                                title
                                product {
                                    title
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const data = await storefrontRequest(query, { cartId });
    return data.cart;
}
