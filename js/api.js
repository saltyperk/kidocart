// kidocart - API Connector
// This file handles all communication with the backend

const API_BASE = '/api'; // Netlify functions will handle this

// ============ AUTH TOKEN MANAGEMENT ============

function getAuthToken() {
  return localStorage.getItem('kidocart_token');
}

function setAuthToken(token) {
  localStorage.setItem('kidocart_token', token);
}

function removeAuthToken() {
  localStorage.removeItem('kidocart_token');
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ============ API HELPER ============

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============ PRODUCTS API ============

const ProductsAPI = {
  // Get all products with optional filters
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const endpoint = params ? `/products?${params}` : '/products';
    return apiRequest(endpoint);
  },
  
  // Get single product by ID
  async getById(id) {
    return apiRequest(`/products/${id}`);
  },
  
  // Create new product (Admin)
  async create(productData) {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },
  
  // Update product (Admin)
  async update(id, updates) {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  // Delete product (Admin)
  async delete(id) {
    return apiRequest(`/products/${id}`, {
      method: 'DELETE'
    });
  }
};

// ============ USERS API ============

const UsersAPI = {
  // Register new user
  async register(userData) {
    const data = await apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('kidocart_currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Login user
  async login(email, password) {
    const data = await apiRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('kidocart_currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Google login
  async googleLogin(googleData) {
    const data = await apiRequest('/users/google', {
      method: 'POST',
      body: JSON.stringify(googleData)
    });
    
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('kidocart_currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Get current user profile
  async getProfile() {
    return apiRequest('/users/profile');
  },
  
  // Update user profile
  async updateProfile(updates) {
    const data = await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    localStorage.setItem('kidocart_currentUser', JSON.stringify(data));
    return data;
  },
  
  // Logout
  logout() {
    removeAuthToken();
    localStorage.removeItem('kidocart_currentUser');
    localStorage.removeItem('kidocart_cart');
    localStorage.removeItem('kidocart_wishlist');
    window.location.href = '/index.html';
  }
};

// ============ ORDERS API ============

const OrdersAPI = {
  // Get user's orders
  async getMyOrders() {
    return apiRequest('/orders');
  },
  
  // Get single order
  async getById(orderId) {
    return apiRequest(`/orders/${orderId}`);
  },
  
  // Create new order
  async create(orderData) {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },
  
  // Get all orders (Admin)
  async getAllAdmin() {
    return apiRequest('/orders?admin=true');
  },
  
  // Update order status (Admin)
  async updateStatus(orderId, status) {
    return apiRequest(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
};

// ============ RAZORPAY INTEGRATION ============

const PaymentAPI = {
  // Initialize Razorpay payment
  initiatePayment(orderData, onSuccess, onFailure) {
    const options = {
      key: window.RAZORPAY_KEY_ID || 'rzp_test_your_key', // Set in HTML or env
      amount: Math.round(orderData.total * 100), // Amount in paise
      currency: 'INR',
      name: 'kidocart',
      description: 'Order Payment',
      image: '/images/logo.png',
      handler: async function(response) {
        try {
          // Create order after successful payment
          const order = await OrdersAPI.create({
            ...orderData,
            paymentId: response.razorpay_payment_id,
            paymentStatus: 'paid'
          });
          
          // Clear cart
          localStorage.removeItem('kidocart_cart');
          
          if (onSuccess) onSuccess(order, response);
        } catch (error) {
          if (onFailure) onFailure(error);
        }
      },
      prefill: {
        name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
        email: JSON.parse(localStorage.getItem('kidocart_currentUser'))?.email || '',
        contact: orderData.shippingAddress.phone
      },
      theme: {
        color: '#6366f1'
      },
      modal: {
        ondismiss: function() {
          console.log('Payment modal closed');
        }
      }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
  }
};

// ============ HYBRID MODE ============
// Use API if available, fallback to localStorage

const HybridAPI = {
  useLocalStorage: true, // Set to false when MongoDB is configured
  
  async getProducts(filters = {}) {
    if (this.useLocalStorage) {
      return filterProducts(filters); // From existing app.js
    }
    return ProductsAPI.getAll(filters);
  },
  
  async getProductById(id) {
    if (this.useLocalStorage) {
      return getProductById(id); // From existing app.js
    }
    return ProductsAPI.getById(id);
  },
  
  async login(email, password) {
    if (this.useLocalStorage) {
      return loginUser(email, password); // From existing app.js
    }
    return UsersAPI.login(email, password);
  },
  
  async register(userData) {
    if (this.useLocalStorage) {
      return registerUser(userData); // From existing app.js
    }
    return UsersAPI.register(userData);
  },
  
  async createOrder(orderData) {
    if (this.useLocalStorage) {
      return createOrder(orderData); // From existing app.js
    }
    return OrdersAPI.create(orderData);
  }
};

// Export for use in other files
window.API = {
  Products: ProductsAPI,
  Users: UsersAPI,
  Orders: OrdersAPI,
  Payment: PaymentAPI,
  Hybrid: HybridAPI
};
