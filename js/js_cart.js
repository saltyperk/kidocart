// Kids Store - Cart Module

// Add item to cart
function addToCart(productId, quantity = 1, selectedSize = null, selectedColor = null) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login to add items to cart', 'warning');
    window.location.href = 'login.html';
    return false;
  }

  const products = getProducts();
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    showToast('Product not found', 'error');
    return false;
  }

  if (!product.availability || product.stock < 1) {
    showToast('Product is not available', 'error');
    return false;
  }

  let cart = getCart();
  const existingItem = cart.find(item => 
    item.productId === productId && 
    item.size === selectedSize && 
    item.color === selectedColor
  );

  if (existingItem) {
    if (existingItem.quantity + quantity > product.stock) {
      showToast('Not enough stock available', 'error');
      return false;
    }
    existingItem.quantity += quantity;
  } else {
    cart.push({
      productId,
      quantity,
      size: selectedSize,
      color: selectedColor,
      addedAt: new Date().toISOString()
    });
  }

  saveCart(cart);
  updateCartCount();
  showToast('Added to cart!', 'success');
  return true;
}

// Remove item from cart
function removeFromCart(productId, size = null, color = null) {
  let cart = getCart();
  cart = cart.filter(item => 
    !(item.productId === productId && item.size === size && item.color === color)
  );
  saveCart(cart);
  updateCartCount();
  showToast('Removed from cart', 'success');
}

// Update cart item quantity
function updateCartQuantity(productId, quantity, size = null, color = null) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  
  if (!product) return false;

  if (quantity > product.stock) {
    showToast('Not enough stock available', 'error');
    return false;
  }

  let cart = getCart();
  const item = cart.find(item => 
    item.productId === productId && item.size === size && item.color === color
  );
  
  if (item) {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
    } else {
      item.quantity = quantity;
      saveCart(cart);
      updateCartCount();
    }
    return true;
  }
  return false;
}

// Get cart totals
function getCartTotal() {
  const cart = getCart();
  const products = getProducts();
  let subtotal = 0;
  let itemCount = 0;

  cart.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      subtotal += product.price * item.quantity;
      itemCount += item.quantity;
    }
  });

  // Free shipping over $50
  const shipping = subtotal > 50 ? 0 : 9.99;
  
  // Tax rate 8%
  const tax = subtotal * 0.08;
  
  const total = subtotal + shipping + tax;

  return { 
    subtotal, 
    shipping, 
    tax, 
    total, 
    itemCount,
    freeShippingThreshold: 50,
    amountToFreeShipping: Math.max(0, 50 - subtotal)
  };
}

// Update cart count in header
function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountElements = document.querySelectorAll('.cart-count');
  cartCountElements.forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// Clear entire cart
function clearCart() {
  saveCart([]);
  updateCartCount();
}

// Get cart items with product details
function getCartWithProducts() {
  const cart = getCart();
  const products = getProducts();
  
  return cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      ...item,
      product
    };
  }).filter(item => item.product); // Filter out items where product no longer exists
}

// Check if product is in cart
function isInCart(productId, size = null, color = null) {
  const cart = getCart();
  return cart.some(item => 
    item.productId === productId && 
    item.size === size && 
    item.color === color
  );
}

// Get quantity of specific item in cart
function getCartItemQuantity(productId, size = null, color = null) {
  const cart = getCart();
  const item = cart.find(item => 
    item.productId === productId && 
    item.size === size && 
    item.color === color
  );
  return item ? item.quantity : 0;
}

// Validate cart items (check stock, availability)
function validateCart() {
  const cart = getCart();
  const products = getProducts();
  const issues = [];

  cart.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    
    if (!product) {
      issues.push({
        type: 'removed',
        productId: item.productId,
        message: 'Product no longer available'
      });
    } else if (!product.availability) {
      issues.push({
        type: 'unavailable',
        productId: item.productId,
        productName: product.name,
        message: `${product.name} is currently unavailable`
      });
    } else if (product.stock < item.quantity) {
      issues.push({
        type: 'stock',
        productId: item.productId,
        productName: product.name,
        available: product.stock,
        requested: item.quantity,
        message: `Only ${product.stock} of ${product.name} available`
      });
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

// Apply promo code (placeholder - can be expanded)
function applyPromoCode(code) {
  const validCodes = {
    'SAVE10': { type: 'percent', value: 10 },
    'SAVE20': { type: 'percent', value: 20 },
    'FREESHIP': { type: 'shipping', value: 0 },
    'KIDS15': { type: 'percent', value: 15 }
  };

  const promo = validCodes[code.toUpperCase()];
  if (promo) {
    return { success: true, promo };
  }
  return { success: false, message: 'Invalid promo code' };
}
