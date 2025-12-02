// Kids Store - Main Application Logic with MongoDB

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

// ============ CART FUNCTIONS (MongoDB) ============

async function addToCart(productId, quantity = 1, selectedSize = null, selectedColor = null) {
  try {
    const token = localStorage.getItem('kidsstore_token');
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
    updateCartCount(cart.items.length);
    showToast('Added to cart!', 'success');
    return cart;
  } catch (error) {
    console.error('Add to cart error:', error);
    showToast(error.message || 'Failed to add to cart', 'error');
  }
}

async function removeFromCart(productId, size = null, color = null) {
  try {
    const token = localStorage.getItem('kidsstore_token');
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
    const token = localStorage.getItem('kidsstore_token');
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
      await loadCart();
    }
  } catch (error) {
    console.error('Update cart error:', error);
    showToast('Failed to update cart', 'error');
  }
}

async function loadCart() {
  try {
    const token = localStorage.getItem('kidsstore_token');
    if (!token) return null;

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
  return null;
}

async function clearCart() {
  try {
    const token = localStorage.getItem('kidsstore_token');
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

// ============ WISHLIST FUNCTIONS (MongoDB) ============

async function toggleWishlist(productId) {
  try {
    const token = localStorage.getItem('kidsstore_token');
    if (!token) {
      showToast('Please login to use wishlist', 'warning');
      window.location.href = 'login.html';
      return;
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
      updateWishlistCount();
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
    const token = localStorage.getItem('kidsstore_token');
    if (!token) return null;

    const response = await fetch('/api/wishlist', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const wishlist = await response.json();
      updateWishlistCount(wishlist.items ? wishlist.items.length : 0);
      return wishlist;
    }
  } catch (error) {
    console.error('Load wishlist error:', error);
  }
  return null;
}

async function isInWishlist(productId) {
  try {
    const wishlist = await loadWishlist();
    if (wishlist && wishlist.items) {
      return wishlist.items.some(item => item.productId._id === productId);
    }
  } catch (error) {
    console.error('Check wishlist error:', error);
  }
  return false;
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

// ============ AUTH FUNCTIONS (MongoDB) ============

async function registerUser(userData) {
  try {
    const response = await fetch('/api/users?action=register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem('kidsstore_token', data.token);
      localStorage.setItem('kidsstore_currentUser', JSON.stringify(data.user));
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem('kidsstore_token', data.token);
      localStorage.setItem('kidsstore_currentUser', JSON.stringify(data.user));
      
      // Load user's cart and wishlist
      await loadCart();
      await loadWishlist();
      
      return { success: true, user: data.user };
    }
    
    return { success: false, message: data.error || 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: error.message };
  }
}

function logoutUser() {
  localStorage.removeItem('kidsstore_token');
  localStorage.removeItem('kidsstore_currentUser');
  window.location.href = 'index.html';
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('kidsstore_currentUser'));
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('kidsstore_currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('kidsstore_currentUser');
  }
}

async function updateUserProfile(updates) {
  try {
    const token = localStorage.getItem('kidsstore_token');
    if (!token) return false;

    const response = await fetch('/api/users?action=profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (response.ok) {
      const user = await response.json();
      setCurrentUser(user);
      return true;
    }
  } catch (error) {
    console.error('Update profile error:', error);
  }
  return false;
}

// ============ ORDER FUNCTIONS (MongoDB) ============

async function createOrder(orderData) {
  try {
    const token = localStorage.getItem('kidsstore_token');
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
      
      // Clear cart after successful order
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
    const token = localStorage.getItem('kidsstore_token');
    if (!token) return [];

    const response = await fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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

function updateCartCount(count = null) {
  const cartCountElements = document.querySelectorAll('.cart-count');
  
  if (count === null) {
    // Load count from server
    loadCart().then(cart => {
      const itemCount = cart && cart.items ? cart.items.length : 0;
      cartCountElements.forEach(el => {
        el.textContent = itemCount;
        el.style.display = itemCount > 0 ? 'flex' : 'none';
      });
    });
  } else {
    cartCountElements.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }
}

function updateWishlistCount(count = null) {
  const wishlistCountElements = document.querySelectorAll('.wishlist-count');
  
  if (count === null) {
    // Load count from server
    loadWishlist().then(wishlist => {
      const itemCount = wishlist && wishlist.items ? wishlist.items.length : 0;
      wishlistCountElements.forEach(el => {
        el.textContent = itemCount;
        el.style.display = itemCount > 0 ? 'flex' : 'none';
      });
    });
  } else {
    wishlistCountElements.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }
}

// ============ HELPER FUNCTIONS ============

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

async function renderProductCard(product) {
  const ageGroup = AGE_GROUPS.find(ag => ag.id === product.ageGroup);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const inWishlist = await isInWishlist(product._id || product.id);

  return `
    <div class="product-card" data-id="${product._id || product.id}">
      ${product.badge ? `<span class="product-badge badge-${product.badge}">${product.badge.toUpperCase()}</span>` : ''}
      <button class="product-wishlist ${inWishlist ? 'active' : ''}" onclick="handleWishlistClick(event, '${product._id || product.id}')">
        <i class="fa${inWishlist ? 's' : 'r'} fa-heart"></i>
      </button>
      <div class="product-image" onclick="window.location.href='product-detail.html?id=${product._id || product.id}'">
        <img src="${product.images && product.images[0] ? product.images[0] : '/placeholder.jpg'}" alt="${product.name}" loading="lazy">
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
          <button class="btn btn-primary btn-sm" onclick="handleAddToCart('${product._id || product.id}')" ${!product.availability || product.stock < 1 ? 'disabled' : ''}>
            <i class="fas fa-shopping-cart"></i> ${product.availability && product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  `;
}

async function handleWishlistClick(event, productId) {
  event.stopPropagation();
  const isNowInWishlist = await toggleWishlist(productId);
  const btn = event.currentTarget;
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

  // Update counts from server
  if (user) {
    await updateCartCount();
    await updateWishlistCount();
  } else {
    updateCartCount(0);
    updateWishlistCount(0);
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
  return localStorage.getItem('kidsstore_adminLoggedIn') === 'true';
}

function setAdminLoggedIn(status) {
  localStorage.setItem('kidsstore_adminLoggedIn', status.toString());
}

// ============ INITIALIZE ON PAGE LOAD ============

document.addEventListener('DOMContentLoaded', async () => {
  await updateHeader();
  initSearch();
  initMobileMenu();
});

// For backward compatibility - redirect old localStorage functions to MongoDB
if (typeof getCart !== 'undefined') {
  window.getCart = async () => {
    const cart = await loadCart();
    return cart ? cart.items : [];
  };
}

if (typeof saveCart !== 'undefined') {
  window.saveCart = () => {
    console.log('Cart is now saved in MongoDB automatically');
  };
}

if (typeof getWishlist !== 'undefined') {
  window.getWishlist = async () => {
    const wishlist = await loadWishlist();
    return wishlist ? wishlist.items.map(item => item.productId._id) : [];
  };
}

if (typeof saveWishlist !== 'undefined') {
  window.saveWishlist = () => {
    console.log('Wishlist is now saved in MongoDB automatically');
  };
}

if (typeof saveProducts !== 'undefined') {
  window.saveProducts = () => {
    console.log('Products are now saved in MongoDB automatically');
  };
}
