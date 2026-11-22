import { LitElement, html } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { getProducts, createCart, addCartLine, getCart, removeCartLine } from "./services/shopify.js";
class StoreApp extends LitElement {
    static properties = {
        products: { state: true },
        loading: { state: true },
        error: { state: true },
        cart: { state: true },
        cartBusy: { state: true },
        cartError: { state: true },
        cartRestoreFailed: { state: true }
    };

    constructor() {
        super();
        this.products = [];
        this.loading = true;
        this.error = "";
        this.cart = null;
        this.cartBusy = true;
        this.cartError = "";
        this.cartRestoreFailed = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadProducts();
        this.restoreCart();
    }

    async loadProducts() {
        try {
            this.products = await getProducts();
        } catch (error) {
            console.log(error);
            this.error = "unable to load products";
        } finally {
            this.loading = false;
        }
    }

    async addToCart(variantId) {
        this.cartBusy = true;
        this.cartError = "";

        try {
            this.cart = this.cart ? await addCartLine(this.cart.id, variantId) : await createCart(variantId);
        } catch (error) {
            console.error(error);
            this.cartError = "Unable to add this item to the cart";
        } finally {
            this.cartBusy = false;
        }

        try {
            localStorage.setItem("cartId", this.cart.id);
        } catch (error) {
            console.error(error);
            this.cartError = "Item added, but the cart could not be save for later.";
        }
    }

    async removeFromCart(lineId) {
        this.cartBusy = true;
        this.cartError = "";

        try {
            this.cart = await removeCartLine(this.cart.id, lineId);
        } catch (error) {
            console.error(error);
            this.cartError = "Unable to remove this item.";
        } finally {
            this.cartBusy = false;
        }
    }

    async restoreCart() {
        this.cartBusy = true;
        this.cartError = "";

        try {
            const cartId = localStorage.getItem("cartId");

            if (cartId) {
                const cart = await getCart(cartId);

                if (cart) {
                    this.cart = cart;
                } else {
                    localStorage.removeItem("cartId");
                    this.cartError = "your previous cart is no longer available";
                }
            }

            this.cartRestoreFailed = false;
        } catch (error) {
            console.error(error);
            this.cartRestoreFailed = true;
            this.cartError = "Unable to restore your cart. please retry.";
        } finally {
            this.cartBusy = false;
        }
    }

    render() {
        return html`<h1>Welcome to Heavenly Bodies</h1>
            ${this.cartError ? html`<p>${this.cartError}</p>` : ""} ${this.cartRestoreFailed ? html`<button ?disabled=${this.cartBusy} @click=${() => this.restoreCart()}>Retry loading cart</button>` : ""}
            ${this.cart
                ? html`<p>Cart items: ${this.cart.totalQuantity}</p>
                      <ul>
                          ${this.cart.lines.nodes.map(
                              (line) => html`
                                  <li>
                                      ${line.merchandise.product.title} ${line.merchandise.title !== "Default Title" ? html`— ${line.merchandise.title}` : ""} — Quantity: ${line.quantity}
                                      <button ?disabled=${this.cartBusy} @click=${() => this.removeFromCart(line.id)}>Remove</button>
                                  </li>
                              `
                          )}
                      </ul>
                      <a href=${this.cart.checkoutUrl}>Checkout</a>`
                : ""}
            ${this.loading ? html`<p>Loading products...</p>` : ""} ${this.error ? html`<p>${this.error}</p>` : ""}
            <ul>
                ${this.products.map(
                    (product) =>
                        html` <li>
                            ${product.featuredImage ? html` <img src=${product.featuredImage.url} alt=${product.featuredImage.altText ?? product.title} width="200" /> ` : ""}
                            <h2>${product.title}</h2>
                            <p>From ${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode}</p>
                            <ul>
                                ${product.variants.nodes.map((variant) => html` <li>${variant.title}: ${variant.price.amount} ${variant.price.currencyCode} ${variant.availableForSale ? html`<button ?disabled=${!variant.availableForSale || this.cartBusy || this.cartRestoreFailed} @click=${() => this.addToCart(variant.id)}>Add to cart</button>` : "(Sold out)"}</li> `)}
                            </ul>
                        </li>`
                )}
            </ul> `;
    }
}

customElements.define("store-app", StoreApp);
