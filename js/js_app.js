// Kids Store - Main Application Logic

// Toast Notification System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Cart Functions
function addToCart(productId, quantity = 1, selectedSize = null, selectedColor = null) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login to add items to cart', 'warning');
    window.location.href = 'login.html';
    return;
  }

  const products = getProducts();
  const product = products.find(p => p.id === productId);
  
  if (!product || !product.availability || product.stock < 1) {
    showToast('Product is not available', 'error');
    return;
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
      return;
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
}

function removeFromCart(productId, size = null, color = null) {
  let cart = getCart();
  cart = cart.filter(item => 
    !(item.productId === productId && item.size === size && item.color === color)
  );
  saveCart(cart);
  updateCartCount();
  showToast('Removed from cart', 'success');
}

function updateCartQuantity(productId, quantity, size = null, color = null) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  
  if (quantity > product.stock) {
    showToast('Not enough stock available', 'error');
    return;
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
  }
}

function getCartTotal() {
  const cart = getCart();
  const products = getProducts();
  let subtotal = 0;

  cart.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      subtotal += product.price * item.quantity;
    }
  });

  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return { subtotal, shipping, tax, total };
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountElements = document.querySelectorAll('.cart-count');
  cartCountElements.forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// Wishlist Functions
function toggleWishlist(productId) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login to use wishlist', 'warning');
    window.location.href = 'login.html';
    return;
  }

  let wishlist = getWishlist();
  const index = wishlist.indexOf(productId);

  if (index > -1) {
    wishlist.splice(index, 1);
    showToast('Removed from wishlist', 'success');
  } else {
    wishlist.push(productId);
    showToast('Added to wishlist!', 'success');
  }

  saveWishlist(wishlist);
  updateWishlistCount();
  return wishlist.includes(productId);
}

function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

function updateWishlistCount() {
  const wishlist = getWishlist();
  const wishlistCountElements = document.querySelectorAll('.wishlist-count');
  wishlistCountElements.forEach(el => {
    el.textContent = wishlist.length;
    el.style.display = wishlist.length > 0 ? 'flex' : 'none';
  });
}

// Product Functions
function getProductById(id) {
  return getProducts().find(p => p.id === parseInt(id));
}

function filterProducts(filters) {
  let products = getProducts();

  if (filters.category && filters.category !== 'all') {
    products = products.filter(p => p.category === filters.category);
  }

  if (filters.ageGroup && filters.ageGroup !== 'all') {
    products = products.filter(p => p.ageGroup === filters.ageGroup);
  }

  if (filters.brand && filters.brand !== 'all') {
    products = products.filter(p => p.brand === filters.brand);
  }

  if (filters.minPrice) {
    products = products.filter(p => p.price >= parseFloat(filters.minPrice));
  }

  if (filters.maxPrice) {
    products = products.filter(p => p.price <= parseFloat(filters.maxPrice));
  }

  if (filters.rating) {
    products = products.filter(p => p.rating >= parseFloat(filters.rating));
  }

  if (filters.availability) {
    products = products.filter(p => p.availability === true && p.stock > 0);
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm) ||
      p.brand.toLowerCase().includes(searchTerm)
    );
  }

  // Sorting
  if (filters.sort) {
    switch (filters.sort) {
      case 'price-low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        products.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'popular':
        products.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }
  }

  return products;
}

function renderProductCard(product) {
  const ageGroup = AGE_GROUPS.find(ag => ag.id === product.ageGroup);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const inWishlist = isInWishlist(product.id);

  return `
    <div class="product-card" data-id="${product.id}">
      ${product.badge ? `<span class="product-badge badge-${product.badge}">${product.badge.toUpperCase()}</span>` : ''}
      <button class="product-wishlist ${inWishlist ? 'active' : ''}" onclick="handleWishlistClick(event, ${product.id})">
        <i class="fa${inWishlist ? 's' : 'r'} fa-heart"></i>
      </button>
      <div class="product-image" onclick="window.location.href='product-detail.html?id=${product.id}'">
        <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
      </div>
      <div class="product-info">
        <span class="age-badge">${ageGroup ? ageGroup.label : 'All Ages'}</span>
        <p class="product-category">${product.category}</p>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">
          <span class="stars">${renderStars(product.rating)}</span>
          <span class="rating-count">(${product.reviewCount})</span>
        </div>
        <div class="product-price">
          <span class="current-price">$${product.price.toFixed(2)}</span>
          ${product.originalPrice ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>` : ''}
          ${discount > 0 ? `<span class="discount">-${discount}%</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" onclick="handleAddToCart(${product.id})" ${!product.availability || product.stock < 1 ? 'disabled' : ''}>
            <i class="fas fa-shopping-cart"></i> ${product.availability && product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars += '<i class="fas fa-star"></i>';
    } else if (i - 0.5 <= rating) {
      stars += '<i class="fas fa-star-half-alt"></i>';
    } else {
      stars += '<i class="far fa-star"></i>';
    }
  }
  return stars;
}

function handleWishlistClick(event, productId) {
  event.stopPropagation();
  const isNowInWishlist = toggleWishlist(productId);
  const btn = event.currentTarget;
  btn.classList.toggle('active', isNowInWishlist);
  btn.innerHTML = `<i class="fa${isNowInWishlist ? 's' : 'r'} fa-heart"></i>`;
}

function handleAddToCart(productId) {
  addToCart(productId);
}

// Auth Functions
function registerUser(userData) {
  const users = getUsers();
  
  if (users.find(u => u.email === userData.email)) {
    return { success: false, message: 'Email already registered' };
  }

  const newUser = {
    id: Date.now(),
    ...userData,
    addresses: [],
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  
  return { success: true, user: newUser };
}

function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    setCurrentUser(user);
    return { success: true, user };
  }
  
  return { success: false, message: 'Invalid email or password' };
}

function logoutUser() {
  setCurrentUser(null);
  saveCart([]);
  saveWishlist([]);
  window.location.href = 'index.html';
}

function updateUserProfile(updates) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex > -1) {
    users[userIndex] = { ...users[userIndex], ...updates };
    saveUsers(users);
    setCurrentUser(users[userIndex]);
    return true;
  }
  
  return false;
}

// Order Functions
function createOrder(orderData) {
  const user = getCurrentUser();
  if (!user) return null;

  const cart = getCart();
  const products = getProducts();
  const totals = getCartTotal();

  const orderItems = cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      image: product.images[0]
    };
  });

  const order = {
    id: 'ORD-' + Date.now(),
    userId: user.id,
    items: orderItems,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    tax: totals.tax,
    total: totals.total,
    shippingAddress: orderData.shippingAddress,
    paymentMethod: orderData.paymentMethod,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  // Update product stock
  cart.forEach(item => {
    const productIndex = products.findIndex(p => p.id === item.productId);
    if (productIndex > -1) {
      products[productIndex].stock -= item.quantity;
      if (products[productIndex].stock <= 0) {
        products[productIndex].availability = false;
      }
    }
  });
  saveProducts(products);

  // Save order
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);

  // Clear cart
  saveCart([]);
  updateCartCount();

  return order;
}

function getUserOrders() {
  const user = getCurrentUser();
  if (!user) return [];
  
  return getOrders().filter(o => o.userId === user.id);
}

// Header Update
function updateHeader() {
  const user = getCurrentUser();
  const userAction = document.getElementById('user-action');
  
  if (userAction) {
    if (user) {
      userAction.innerHTML = `
        <a href="account.html" class="header-action">
          <i class="fas fa-user"></i>
          <span>${user.name.split(' ')[0]}</span>
        </a>
      `;
    } else {
      userAction.innerHTML = `
        <a href="login.html" class="header-action">
          <i class="fas fa-user"></i>
          <span>Login</span>
        </a>
      `;
    }
  }

  updateCartCount();
  updateWishlistCount();
}

// Search functionality
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  
  if (searchInput && searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
      }
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = `products.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }
}

// Mobile Menu
function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navList = document.querySelector('.nav-list');
  
  if (menuBtn && navList) {
    menuBtn.addEventListener('click', () => {
      navList.classList.toggle('active');
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateHeader();
  initSearch();
  initMobileMenu();
});
