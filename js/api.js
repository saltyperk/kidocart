// KidsStore - API Connector
// This file handles all communication with the backend

const API_BASE = '/api'; // Vercel functions will handle this

// ============ AUTH TOKEN MANAGEMENT ============

function getAuthToken() {
  return localStorage.getItem('kidsstore_token');
}

function setAuthToken(token) {
  localStorage.setItem('kidsstore_token', token);
}

function removeAuthToken() {
  localStorage.removeItem('kidsstore_token');
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
    return apiRequest(`/products?id=${id}`);
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
    return apiRequest(`/products?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  // Delete product (Admin)
  async delete(id) {
    return apiRequest(`/products?id=${id}`, {
      method: 'DELETE'
    });
  }
};

// ============ USERS API ============

const UsersAPI = {
  // Register new user
  async register(userData) {
    const data = await apiRequest('/users?action=register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('kidsstore_currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Login user
  async login(email, password) {
    const data = await apiRequest('/users?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('kidsstore_currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Google login
  async googleLogin(googleData) {
    const data = await apiRequest('/users?action=google', {
      method: 'POST',
      body: JSON.stringify(googleData)
    });
    
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('kidsstore_currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Get current user profile
  async getProfile() {
    return apiRequest('/users?action=profile');
  },
  
  // Update user profile
  async updateProfile(updates) {
    const data = await apiRequest('/users?action=profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    localStorage.setItem('kidsstore_currentUser', JSON.stringify(data));
    return data;
  },
  
  // Logout
  logout() {
    removeAuthToken();
    localStorage.removeItem('kidsstore_currentUser');
    localStorage.removeItem('kidsstore_cart');
    localStorage.removeItem('kidsstore_wishlist');
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
    return apiRequest(`/orders?id=${orderId}`);
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
    return apiRequest(`/orders?id=${orderId}`, {
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
      name: 'KidsStore',
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
          localStorage.removeItem('kidsstore_cart');
          
          if (onSuccess) onSuccess(order, response);
        } catch (error) {
          if (onFailure) onFailure(error);
        }
      },
      prefill: {
        name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
        email: JSON.parse(localStorage.getItem('kidsstore_currentUser'))?.email || '',
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
// Use API if MongoDB is configured, fallback to localStorage

const HybridAPI = {
  // Set to false when MongoDB is configured
  useLocalStorage: true, // CHANGE THIS TO false WHEN MONGODB IS READY
  
  async getProducts(filters = {}) {
    if (this.useLocalStorage) {
      // Use existing localStorage functions
      return typeof filterProducts !== 'undefined' ? filterProducts(filters) : getProducts();
    }
    return ProductsAPI.getAll(filters);
  },
  
  async getProductById(id) {
    if (this.useLocalStorage) {
      return typeof getProductById !== 'undefined' ? getProductById(id) : getProducts().find(p => p.id === parseInt(id));
    }
    return ProductsAPI.getById(id);
  },
  
  async createProduct(productData) {
    if (this.useLocalStorage) {
      const products = getProducts();
      const newProduct = {
        ...productData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };
      products.push(newProduct);
      saveProducts(products);
      return newProduct;
    }
    return ProductsAPI.create(productData);
  },
  
  async updateProduct(id, updates) {
    if (this.useLocalStorage) {
      const products = getProducts();
      const index = products.findIndex(p => p.id === parseInt(id));
      if (index !== -1) {
        products[index] = { ...products[index], ...updates };
        saveProducts(products);
        return products[index];
      }
      throw new Error('Product not found');
    }
    return ProductsAPI.update(id, updates);
  },
  
  async deleteProduct(id) {
    if (this.useLocalStorage) {
      let products = getProducts();
      products = products.filter(p => p.id !== parseInt(id));
      saveProducts(products);
      return { success: true };
    }
    return ProductsAPI.delete(id);
  },
  
  async login(email, password) {
    if (this.useLocalStorage) {
      return typeof loginUser !== 'undefined' ? loginUser(email, password) : { success: false, message: 'Login not available' };
    }
    return UsersAPI.login(email, password);
  },
  
  async register(userData) {
    if (this.useLocalStorage) {
      return typeof registerUser !== 'undefined' ? registerUser(userData) : { success: false, message: 'Registration not available' };
    }
    return UsersAPI.register(userData);
  },
  
  async createOrder(orderData) {
    if (this.useLocalStorage) {
      return typeof createOrder !== 'undefined' ? createOrder(orderData) : null;
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
