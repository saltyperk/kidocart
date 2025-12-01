// Kids Store - Products Module

// Get product by ID
function getProductById(id) {
  return getProducts().find(p => p.id === parseInt(id));
}

// Filter products based on criteria
function filterProducts(filters) {
  let products = getProducts();

  // Filter by category
  if (filters.category && filters.category !== 'all') {
    products = products.filter(p => p.category === filters.category);
  }

  // Filter by age group
  if (filters.ageGroup && filters.ageGroup !== 'all') {
    products = products.filter(p => p.ageGroup === filters.ageGroup);
  }

  // Filter by brand
  if (filters.brand && filters.brand !== 'all') {
    products = products.filter(p => p.brand === filters.brand);
  }

  // Filter by min price
  if (filters.minPrice) {
    products = products.filter(p => p.price >= parseFloat(filters.minPrice));
  }

  // Filter by max price
  if (filters.maxPrice) {
    products = products.filter(p => p.price <= parseFloat(filters.maxPrice));
  }

  // Filter by rating
  if (filters.rating) {
    products = products.filter(p => p.rating >= parseFloat(filters.rating));
  }

  // Filter by availability
  if (filters.availability) {
    products = products.filter(p => p.availability === true && p.stock > 0);
  }

  // Filter by badge (new, sale, hot)
  if (filters.badge) {
    products = products.filter(p => p.badge === filters.badge);
  }

  // Filter by featured
  if (filters.featured) {
    products = products.filter(p => p.featured === true);
  }

  // Search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm) ||
      p.brand.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm)
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
      case 'name-asc':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        products.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
  }

  return products;
}

// Get featured products
function getFeaturedProducts(limit = 8) {
  return getProducts()
    .filter(p => p.featured)
    .slice(0, limit);
}

// Get new arrivals
function getNewArrivals(limit = 8) {
  return getProducts()
    .filter(p => p.badge === 'new')
    .slice(0, limit);
}

// Get products on sale
function getSaleProducts(limit = 8) {
  return getProducts()
    .filter(p => p.badge === 'sale' && p.originalPrice)
    .slice(0, limit);
}

// Get products by category
function getProductsByCategory(category, limit = null) {
  let products = getProducts().filter(p => p.category === category);
  return limit ? products.slice(0, limit) : products;
}

// Get products by age group
function getProductsByAgeGroup(ageGroup, limit = null) {
  let products = getProducts().filter(p => p.ageGroup === ageGroup);
  return limit ? products.slice(0, limit) : products;
}

// Get related products
function getRelatedProducts(product, limit = 4) {
  return getProducts()
    .filter(p => 
      p.id !== product.id && 
      (p.category === product.category || p.ageGroup === product.ageGroup)
    )
    .slice(0, limit);
}

// Render star rating
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

// Render product card HTML
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

// Handle wishlist click from product card
function handleWishlistClick(event, productId) {
  event.stopPropagation();
  const isNowInWishlist = toggleWishlist(productId);
  const btn = event.currentTarget;
  btn.classList.toggle('active', isNowInWishlist);
  btn.innerHTML = `<i class="fa${isNowInWishlist ? 's' : 'r'} fa-heart"></i>`;
}

// Handle add to cart from product card
function handleAddToCart(productId) {
  addToCart(productId);
}

// Calculate discount percentage
function getDiscountPercentage(originalPrice, currentPrice) {
  if (!originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round((1 - currentPrice / originalPrice) * 100);
}

// Check if product is low stock
function isLowStock(product, threshold = 10) {
  return product.stock > 0 && product.stock <= threshold;
}

// Check if product is out of stock
function isOutOfStock(product) {
  return !product.availability || product.stock <= 0;
}

// Get product stock status
function getStockStatus(product) {
  if (isOutOfStock(product)) {
    return { status: 'out-of-stock', message: 'Out of Stock', class: 'danger' };
  }
  if (isLowStock(product)) {
    return { status: 'low-stock', message: `Only ${product.stock} left!`, class: 'warning' };
  }
  return { status: 'in-stock', message: 'In Stock', class: 'success' };
}

// Search products (for autocomplete)
function searchProducts(query, limit = 5) {
  if (!query || query.length < 2) return [];
  
  const searchTerm = query.toLowerCase();
  return getProducts()
    .filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.brand.toLowerCase().includes(searchTerm)
    )
    .slice(0, limit);
}
