/**
 * CartManager - Utility for managing shopping cart using localStorage
 * Handles add, remove, update quantity, clear operations
 */

class CartManager {
    constructor(storageKey = 'glyphere_cart') {
        this.storageKey = storageKey;
    }

    /**
     * Get all cart items
     */
    getCart() {
        try {
            const cart = localStorage.getItem(this.storageKey);
            return cart ? JSON.parse(cart) : [];
        } catch (e) {
            console.error('Error reading cart:', e);
            return [];
        }
    }

    /**
     * Add item to cart
     * @param {Object} item - { id, name, price }
     */
    addToCart(item) {
        const cart = this.getCart();
        const existingItem = cart.find(i => i.id === item.id);

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cart.push({
                ...item,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
        }

        this.saveCart(cart);
        this.notifyListeners();
        return cart;
    }

    /**
     * Remove item from cart
     * @param {string} itemId
     */
    removeFromCart(itemId) {
        let cart = this.getCart();
        cart = cart.filter(item => item.id !== itemId);
        this.saveCart(cart);
        this.notifyListeners();
        return cart;
    }

    /**
     * Update item quantity
     * @param {string} itemId
     * @param {number} quantity
     */
    updateQuantity(itemId, quantity) {
        const cart = this.getCart();
        const item = cart.find(i => i.id === itemId);

        if (item) {
            if (quantity <= 0) {
                return this.removeFromCart(itemId);
            }
            item.quantity = quantity;
            this.saveCart(cart);
            this.notifyListeners();
        }

        return cart;
    }

    /**
     * Get cart total
     */
    getTotal() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    }

    /**
     * Get total item count
     */
    getItemCount() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }

    /**
     * Clear entire cart
     */
    clearCart() {
        this.saveCart([]);
        this.notifyListeners();
    }

    /**
     * Save cart to localStorage
     */
    saveCart(cart) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(cart));
        } catch (e) {
            console.error('Error saving cart:', e);
        }
    }

    /**
     * Subscribe to cart changes
     */
    subscribe(callback) {
        if (!window.__cartListeners) {
            window.__cartListeners = [];
        }
        window.__cartListeners.push(callback);
        return () => {
            window.__cartListeners = window.__cartListeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners of cart changes
     */
    notifyListeners() {
        if (window.__cartListeners) {
            window.__cartListeners.forEach(callback => callback(this.getCart()));
        }
    }
}

// Export as global if not in module environment
if (typeof module === 'undefined' || !module.exports) {
    window.CartManager = CartManager;
}
