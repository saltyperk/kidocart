// Kids Store - Admin Module

// Check if admin is authenticated
function checkAdminAuth() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Admin logout
function adminLogout() {
  setAdminLoggedIn(false);
  window.location.href = 'login.html';
}

// ==================== PRODUCT MANAGEMENT ====================

// Add new product
function addProduct(productData) {
  const products = getProducts();
  
  const newProduct = {
    id: Date.now(),
    name: productData.name,
    description: productData.description,
    price: parseFloat(productData.price),
    originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
    category: productData.category,
    ageGroup: productData.ageGroup,
    brand: productData.brand,
    images: productData.images || [],
    stock: parseInt(productData.stock) || 0,
    availability: productData.availability !== false,
    rating: productData.rating || 4.5,
    reviewCount: productData.reviewCount || 0,
    sizes: productData.sizes || null,
    colors: productData.colors || null,
    badge: productData.badge || null,
    featured: productData.featured || false,
    createdAt: new Date().toISOString().split('T')[0]
  };

  products.push(newProduct);
  saveProducts(products);
  
  return { success: true, product: newProduct };
}

// Update existing product
function updateProduct(productId, updates) {
  const products = getProducts();
  const index = products.findIndex(p => p.id === productId);
  
  if (index === -1) {
    return { success: false, message: 'Product not found' };
  }

  products[index] = { ...products[index], ...updates };
  saveProducts(products);
  
  return { success: true, product: products[index] };
}

// Delete product
function deleteProduct(productId) {
  let products = getProducts();
  const initialLength = products.length;
  
  products = products.filter(p => p.id !== productId);
  
  if (products.length === initialLength) {
    return { success: false, message: 'Product not found' };
  }

  saveProducts(products);
  return { success: true };
}

// Toggle product availability
function toggleProductAvailability(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return { success: false, message: 'Product not found' };
  }

  product.availability = !product.availability;
  saveProducts(products);
  
  return { success: true, availability: product.availability };
}

// Update product stock
function updateProductStock(productId, newStock) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return { success: false, message: 'Product not found' };
  }

  product.stock = parseInt(newStock);
  if (product.stock <= 0) {
    product.availability = false;
  }
  
  saveProducts(products);
  return { success: true, stock: product.stock };
}

// Get low stock products
function getLowStockProducts(threshold = 10) {
  return getProducts().filter(p => p.stock < threshold && p.stock > 0);
}

// Get out of stock products
function getOutOfStockProducts() {
  return getProducts().filter(p => p.stock === 0 || !p.availability);
}

// ==================== ORDER MANAGEMENT ====================

// Get all orders with optional filters
function getFilteredOrders(filters = {}) {
  let orders = getOrders();

  if (filters.status) {
    orders = orders.filter(o => o.status === filters.status);
  }

  if (filters.userId) {
    orders = orders.filter(o => o.userId === filters.userId);
  }

  if (filters.dateFrom) {
    orders = orders.filter(o => new Date(o.createdAt) >= new Date(filters.dateFrom));
  }

  if (filters.dateTo) {
    orders = orders.filter(o => new Date(o.createdAt) <= new Date(filters.dateTo));
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    const users = getUsers();
    orders = orders.filter(o => {
      const user = users.find(u => u.id === o.userId);
      return o.id.toLowerCase().includes(searchTerm) ||
             (user && user.name.toLowerCase().includes(searchTerm)) ||
             (user && user.email.toLowerCase().includes(searchTerm));
    });
  }

  return orders;
}

// Update order status
function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  
  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, message: 'Invalid status' };
  }

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  
  saveOrders(orders);
  return { success: true, order };
}

// Get order statistics
function getOrderStats() {
  const orders = getOrders();
  
  return {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0)
  };
}

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics
function getDashboardStats() {
  const products = getProducts();
  const orders = getOrders();
  const users = getUsers();

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const lowStockProducts = products.filter(p => p.stock < 10 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  // Recent orders (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo);

  // Recent revenue
  const recentRevenue = recentOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  return {
    products: {
      total: products.length,
      lowStock: lowStockProducts.length,
      outOfStock: outOfStockProducts.length
    },
    orders: {
      total: orders.length,
      recent: recentOrders.length,
      pending: orders.filter(o => o.status === 'confirmed').length
    },
    users: {
      total: users.length
    },
    revenue: {
      total: totalRevenue,
      recent: recentRevenue
    }
  };
}

// ==================== EXPORT FUNCTIONS ====================

// Export orders to CSV
function exportOrdersCSV() {
  const orders = getOrders();
  const users = getUsers();
  
  let csv = 'Order ID,Customer,Email,Items,Total,Status,Payment,Date\n';
  
  orders.forEach(order => {
    const user = users.find(u => u.id === order.userId);
    const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
    
    csv += `"${order.id}","${user ? user.name : 'Unknown'}","${user ? user.email : '-'}",${itemCount},$${order.total.toFixed(2)},${order.status},${order.paymentMethod},"${order.createdAt}"\n`;
  });

  downloadCSV(csv, 'orders_export.csv');
}

// Export products to CSV
function exportProductsCSV() {
  const products = getProducts();
  
  let csv = 'ID,Name,Category,Age Group,Price,Original Price,Stock,Available,Rating,Featured\n';
  
  products.forEach(p => {
    csv += `${p.id},"${p.name}",${p.category},${p.ageGroup},$${p.price.toFixed(2)},${p.originalPrice ? '$' + p.originalPrice.toFixed(2) : '-'},${p.stock},${p.availability},${p.rating},${p.featured}\n`;
  });

  downloadCSV(csv, 'products_export.csv');
}

// Helper function to download CSV
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ==================== BULK OPERATIONS ====================

// Bulk update product availability
function bulkUpdateAvailability(productIds, availability) {
  const products = getProducts();
  let updatedCount = 0;
  
  productIds.forEach(id => {
    const product = products.find(p => p.id === id);
    if (product) {
      product.availability = availability;
      updatedCount++;
    }
  });
  
  saveProducts(products);
  return { success: true, updatedCount };
}

// Bulk delete products
function bulkDeleteProducts(productIds) {
  let products = getProducts();
  const initialLength = products.length;
  
  products = products.filter(p => !productIds.includes(p.id));
  
  saveProducts(products);
  return { success: true, deletedCount: initialLength - products.length };
}
