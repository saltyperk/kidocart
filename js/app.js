// kido cart - Main Application Logic with MongoDB & INR Currency
// ============ CONFIGURATION ============
const IS_ADMIN_PAGE = window.location.pathname.includes('/admin/');
// ============ TOAST NOTIFICATION SYSTEM ============
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
// ============ PRODUCT FUNCTIONS (MongoDB) ============
async function getProducts(filters = {}) {
  try {
    const params = new URLSearchParams(filters).toString();
    const url = params ? `/api/products?${params}` : '/api/products';
    
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Get products error:', error);
  }
  return [];
}
async function getProductById(id) {
  try {
    const response = await fetch(`/api/products?id=${id}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Get product error:', error);
  }
  return null;
}
async function filterProducts(filters) {
  return await getProducts(filters);
}
// ============ CART FUNCTIONS (MongoDB) ============
async function addToCart(productId, quantity = 1, selectedSize = null, selectedColor = null) {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) {
      showToast('Please login to add items to cart', 'warning');
      window.location.href = 'login.html';
      return;
    }
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        quantity,
        size: selectedSize,
        color: selectedColor
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add to cart');
    }
    const cart = await response.json();
    updateCartCount(cart.items ? cart.items.length : 0);
    showToast('Added to cart!', 'success');
    return cart;
  } catch (error) {
    console.error('Add to cart error:', error);
    showToast(error.message || 'Failed to add to cart', 'error');
  }
}
async function removeFromCart(productId, size = null, color = null) {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) return;
    const params = new URLSearchParams({ productId });
    if (size) params.append('size', size);
    if (color) params.append('color', color);
    const response = await fetch(`/api/cart?${params}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      await loadCart();
      showToast('Removed from cart', 'success');
    }
  } catch (error) {
    console.error('Remove from cart error:', error);
    showToast('Failed to remove from cart', 'error');
  }
}
async function updateCartQuantity(productId, quantity, size = null, color = null) {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) return;
    const response = await fetch('/api/cart', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        quantity,
        size,
        color
      })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Update cart error:', error);
    showToast('Failed to update cart', 'error');
  }
}
async function loadCart() {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) return { items: [] };
    const response = await fetch('/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      const cart = await response.json();
      updateCartCount(cart.items ? cart.items.length : 0);
      return cart;
    }
  } catch (error) {
    console.error('Load cart error:', error);
  }
  return { items: [] };
}
async function getCart() {
  const cart = await loadCart();
  return cart.items || [];
}
async function clearCart() {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) return;
    await fetch('/api/cart?clear=true', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    updateCartCount(0);
  } catch (error) {
    console.error('Clear cart error:', error);
  }
}
async function getCartTotal() {
  const cart = await loadCart();
  const items = cart.items || [];
  
  let subtotal = 0;
  let itemCount = 0;
  items.forEach(item => {
    if (item.productId) {
      const price = item.productId.price || 0;
      subtotal += price * item.quantity;
      itemCount += item.quantity;
    }
  });
  // Free shipping over ₹499
  const shipping = subtotal > 499 ? 0 : 49;
  
  // Tax (GST 18% in India)
  const tax = subtotal * 0.18;
  
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total, itemCount };
}
// ============ WISHLIST FUNCTIONS (MongoDB) ============
async function toggleWishlist(productId) {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) {
      showToast('Please login to use wishlist', 'warning');
      window.location.href = 'login.html';
      return false;
    }
    const response = await fetch('/api/wishlist?toggle=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId })
    });
    if (response.ok) {
      const result = await response.json();
      await updateWishlistCount();
      showToast(result.added ? 'Added to wishlist!' : 'Removed from wishlist', 'success');
      return result.added;
    }
  } catch (error) {
    console.error('Wishlist error:', error);
    showToast('Failed to update wishlist', 'error');
  }
  return false;
}
async function loadWishlist() {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) return { items: [] };
    const response = await fetch('/api/wishlist', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Load wishlist error:', error);
  }
  return { items: [] };
}
async function getWishlist() {
  const wishlist = await loadWishlist();
  if (wishlist.items) {
    return wishlist.items.map(item => item.productId?._id || item.productId);
  }
  return [];
}
async function isInWishlist(productId) {
  try {
    const wishlist = await getWishlist();
    return wishlist.includes(productId);
  } catch (error) {
    console.error('Check wishlist error:', error);
  }
  return false;
}
// ============ AUTH FUNCTIONS ============
async function registerUser(userData) {
  try {
    const response = await fetch('/api/users?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem('kidocart_token', data.token);
      localStorage.setItem('kidocart_currentUser', JSON.stringify(data.user));
      return { success: true, user: data.user };
    }
    
    return { success: false, message: data.error || 'Registration failed' };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, message: error.message };
  }
}
async function loginUser(email, password) {
  try {
    const response = await fetch('/api/users?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem('kidocart_token', data.token);
      localStorage.setItem('kidocart_currentUser', JSON.stringify(data.user));
      return { success: true, user: data.user };
    }
    
    return { success: false, message: data.error || 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: error.message };
  }
}
function logoutUser() {
  localStorage.removeItem('kidocart_token');
  localStorage.removeItem('kidocart_currentUser');
  window.location.href = 'index.html';
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('kidocart_currentUser'));
}
function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('kidocart_currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('kidocart_currentUser');
  }
}
// ============ ORDER FUNCTIONS ============
async function createOrder(orderData) {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) return null;
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });
    if (response.ok) {
      const order = await response.json();
      await clearCart();
      return order;
    }
  } catch (error) {
    console.error('Create order error:', error);
  }
  return null;
}
async function getUserOrders() {
  try {
    const token = localStorage.getItem('kidocart_token');
    if (!token) return [];
    const response = await fetch('/api/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Get orders error:', error);
  }
  return [];
}
// ============ UI UPDATE FUNCTIONS ============
function updateCartCount(count) {
  const cartCountElements = document.querySelectorAll('.cart-count');
  cartCountElements.forEach(el => {
    el.textContent = count || 0;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}
async function updateWishlistCount() {
  const wishlistCountElements = document.querySelectorAll('.wishlist-count');
  try {
    const wishlist = await getWishlist();
    const count = wishlist.length;
    wishlistCountElements.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (error) {
    wishlistCountElements.forEach(el => {
      el.textContent = '0';
      el.style.display = 'none';
    });
  }
}
// ============ HELPER FUNCTIONS ============
function renderStars(rating) {
  let stars = '';
  const ratingNum = parseFloat(rating) || 0;
  for (let i = 1; i <= 5; i++) {
    if (i <= ratingNum) {
      stars += '<i class="fas fa-star"></i>';
    } else if (i - 0.5 <= ratingNum) {
      stars += '<i class="fas fa-star-half-alt"></i>';
    } else {
      stars += '<i class="far fa-star"></i>';
    }
  }
  return stars;
}
// Renders a product card with INR currency
function renderProductCard(product) {
  const ageGroup = typeof AGE_GROUPS !== 'undefined' 
    ? AGE_GROUPS.find(ag => ag.id === product.ageGroup) 
    : null;
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const productId = product._id || product.id;
  
  // Image handling
  let firstImage = '/placeholder.jpg';
  if (product.images) {
    if (Array.isArray(product.images) && product.images.length > 0) firstImage = product.images[0];
    else if (typeof product.images === 'string') firstImage = product.images;
  } else if (product.image) {
    firstImage = product.image;
  }
  return `
    <div class="product-card" data-id="${productId}">
      ${product.badge ? `<span class="product-badge badge-${product.badge}">${product.badge.toUpperCase()}</span>` : ''}
      <button class="product-wishlist" onclick="handleWishlistClick(event, '${productId}')">
        <i class="far fa-heart"></i>
      </button>
      <div class="product-image" onclick="window.location.href='product-detail.html?id=${productId}'">
        <img src="${firstImage}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">
      </div>
      <div class="product-info">
        <span class="age-badge">${ageGroup ? ageGroup.label : product.ageGroup || 'All Ages'}</span>
        <p class="product-category">${product.category || ''}</p>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">
          <span class="stars">${renderStars(product.rating)}</span>
          <span class="rating-count">(${product.reviewCount || 0})</span>
        </div>
        <div class="product-price">
          <span class="current-price">₹${parseFloat(product.price).toFixed(0)}</span>
          ${product.originalPrice ? `<span class="original-price">₹${parseFloat(product.originalPrice).toFixed(0)}</span>` : ''}
          ${discount > 0 ? `<span class="discount">-${discount}%</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" onclick="handleAddToCart('${productId}')" ${!product.availability || product.stock < 1 ? 'disabled' : ''}>
            <i class="fas fa-shopping-cart"></i> ${product.availability && product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  `;
}
async function handleWishlistClick(event, productId) {
  event.stopPropagation();
  const btn = event.currentTarget;
  const isNowInWishlist = await toggleWishlist(productId);
  btn.classList.toggle('active', isNowInWishlist);
  btn.innerHTML = `<i class="fa${isNowInWishlist ? 's' : 'r'} fa-heart"></i>`;
}
async function handleAddToCart(productId) {
  await addToCart(productId);
}
// ============ HEADER UPDATE ============
async function updateHeader() {
  const user = getCurrentUser();
  const userAction = document.getElementById('user-action');
  
  if (userAction) {
    if (user) {
      userAction.innerHTML = `
        <a href="account.html" class="header-action">
          <i class="fas fa-user"></i>
          <span>${user.name ? user.name.split(' ')[0] : 'Account'}</span>
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
  // Only load cart/wishlist counts if user is logged in and NOT on admin page
  if (user && !IS_ADMIN_PAGE) {
    try {
      const cart = await loadCart();
      updateCartCount(cart.items ? cart.items.length : 0);
      await updateWishlistCount();
    } catch (error) {
      console.error('Error loading cart/wishlist:', error);
      updateCartCount(0);
    }
  } else {
    updateCartCount(0);
  }
}
// ============ SEARCH FUNCTIONALITY ============
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
// ============ MOBILE MENU ============
function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navList = document.querySelector('.nav-list');
  
  if (menuBtn && navList) {
    menuBtn.addEventListener('click', () => {
      navList.classList.toggle('active');
    });
  }
}
// ============ ADMIN FUNCTIONS ============
function isAdminLoggedIn() {
  return localStorage.getItem('kidocart_adminLoggedIn') === 'true';
}
function setAdminLoggedIn(status) {
  localStorage.setItem('kidocart_adminLoggedIn', status.toString());
}
// ============ INITIALIZE ON PAGE LOAD ============
document.addEventListener('DOMContentLoaded', async () => {
  // Skip heavy loading for admin pages
  if (IS_ADMIN_PAGE) {
    console.log('Admin page detected - skipping customer header init');
    return;
  }
  
  await updateHeader();
  initSearch();
  initMobileMenu();
});
