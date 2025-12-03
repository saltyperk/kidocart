// Kids Store - Data & Initial Setup

// Age Groups Configuration
const AGE_GROUPS = [
  { id: 'newborn', label: 'Newborn (0-6 months)', min: 0, max: 6 },
  { id: 'infant', label: 'Infant (6-12 months)', min: 6, max: 12 },
  { id: 'toddler', label: 'Toddler (1-2 years)', min: 12, max: 24 },
  { id: 'preschool', label: 'Preschool (2-4 years)', min: 24, max: 48 },
  { id: 'early-childhood', label: 'Early Childhood (4-6 years)', min: 48, max: 72 },
  { id: 'kids', label: 'Kids (6-10 years)', min: 72, max: 120 }
];

// Product Categories
const CATEGORIES = [
  { id: 'clothing', name: 'Clothing', icon: '👕', description: 'Adorable outfits for every occasion' },
  { id: 'toys', name: 'Toys', icon: '🧸', description: 'Fun and educational toys' },
  { id: 'feeding', name: 'Feeding', icon: '🍼', description: 'Bottles, bibs & feeding essentials' },
  { id: 'diapers', name: 'Diapers & Care', icon: '🧷', description: 'Diapers, wipes & skincare' },
  { id: 'furniture', name: 'Furniture', icon: '🛏️', description: 'Cribs, chairs & storage' },
  { id: 'gear', name: 'Gear & Travel', icon: '🚗', description: 'Strollers, car seats & carriers' },
  { id: 'bath', name: 'Bath & Safety', icon: '🛁', description: 'Bath time essentials & safety' },
  { id: 'books', name: 'Books & Media', icon: '📚', description: 'Learning books & entertainment' }
];

// Brands
const BRANDS = [
  'BabyJoy', 'LittleStars', 'TinyTots', 'KiddieCare', 'HappyBaby', 
  'PlayTime', 'SafeKids', 'Comfy Baby', 'Wonder Child', 'SmartKids'
];

// Admin credentials (in real app, this would be server-side)
const ADMIN_CREDENTIALS = {
  username: 'saltyperk',
  password: 'Salty@717'
};

// Initialize data in localStorage if not exists
function initializeData() {
  if (!localStorage.getItem('_products')) {
    localStorage.setItem('_products', JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem('_users')) {
    localStorage.setItem('_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('_orders')) {
    localStorage.setItem('_orders', JSON.stringify([]));
  }
  if (!localStorage.getItem('_cart')) {
    localStorage.setItem('_cart', JSON.stringify([]));
  }
  if (!localStorage.getItem('_wishlist')) {
    localStorage.setItem('_wishlist', JSON.stringify([]));
  }
}

// Data access functions
function getProducts() {
  return JSON.parse(localStorage.getItem('_products')) || [];
}

function saveProducts(products) {
  localStorage.setItem('_products', JSON.stringify(products));
}

function getUsers() {
  return JSON.parse(localStorage.getItem('_users')) || [];
}

function saveUsers(users) {
  localStorage.setItem('_users', JSON.stringify(users));
}

function getOrders() {
  return JSON.parse(localStorage.getItem('_orders')) || [];
}

function saveOrders(orders) {
  localStorage.setItem('_orders', JSON.stringify(orders));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('_currentUser'));
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('_currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('_currentUser');
  }
}

function getCart() {
  return JSON.parse(localStorage.getItem('_cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('_cart', JSON.stringify(cart));
}

function getWishlist() {
  return JSON.parse(localStorage.getItem('_wishlist')) || [];
}

function saveWishlist(wishlist) {
  localStorage.setItem('_wishlist', JSON.stringify(wishlist));
}

function isAdminLoggedIn() {
  return localStorage.getItem('_adminLoggedIn') === 'true';
}

function setAdminLoggedIn(status) {
  localStorage.setItem('_adminLoggedIn', status.toString());
}

// Initialize on load
initializeData();
