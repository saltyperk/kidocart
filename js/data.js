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

// Sample Products Data
const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: 'Organic Cotton Baby Romper Set',
    description: 'Super soft 100% organic cotton romper set. Perfect for newborns with sensitive skin. Includes 3 rompers in pastel colors.',
    price: 29.99,
    originalPrice: 39.99,
    category: 'clothing',
    ageGroup: 'newborn',
    brand: 'BabyJoy',
    images: [
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=500',
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500'
    ],
    stock: 50,
    availability: true,
    rating: 4.8,
    reviewCount: 124,
    sizes: ['0-3M', '3-6M'],
    colors: ['Pink', 'Blue', 'White'],
    badge: 'sale',
    featured: true,
    createdAt: '2024-01-15'
  },
  {
    id: 2,
    name: 'Interactive Learning Tablet for Kids',
    description: 'Educational tablet with games, songs, and learning activities. Perfect for preschoolers to develop cognitive skills.',
    price: 49.99,
    originalPrice: 69.99,
    category: 'toys',
    ageGroup: 'preschool',
    brand: 'SmartKids',
    images: [
      'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=500',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500'
    ],
    stock: 30,
    availability: true,
    rating: 4.5,
    reviewCount: 89,
    colors: ['Blue', 'Pink', 'Green'],
    badge: 'hot',
    featured: true,
    createdAt: '2024-01-10'
  },
  {
    id: 3,
    name: 'Premium Baby Stroller - All Terrain',
    description: 'Lightweight yet sturdy stroller with all-terrain wheels. Features adjustable canopy, storage basket, and one-hand fold.',
    price: 299.99,
    originalPrice: 399.99,
    category: 'gear',
    ageGroup: 'infant',
    brand: 'SafeKids',
    images: [
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=500',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500'
    ],
    stock: 15,
    availability: true,
    rating: 4.9,
    reviewCount: 256,
    colors: ['Black', 'Gray', 'Navy'],
    badge: 'sale',
    featured: true,
    createdAt: '2024-01-08'
  },
  {
    id: 4,
    name: 'Wooden Building Blocks Set - 100 Pieces',
    description: 'Classic wooden building blocks in various shapes and colors. Encourages creativity and motor skill development.',
    price: 34.99,
    originalPrice: 44.99,
    category: 'toys',
    ageGroup: 'toddler',
    brand: 'PlayTime',
    images: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500',
      'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=500'
    ],
    stock: 45,
    availability: true,
    rating: 4.7,
    reviewCount: 178,
    badge: 'new',
    featured: true,
    createdAt: '2024-01-20'
  },
  {
    id: 5,
    name: 'Baby Feeding Bottle Set with Sterilizer',
    description: 'Complete feeding set with 4 anti-colic bottles and UV sterilizer. BPA-free and dishwasher safe.',
    price: 59.99,
    originalPrice: 79.99,
    category: 'feeding',
    ageGroup: 'newborn',
    brand: 'HappyBaby',
    images: [
      'https://images.unsplash.com/photo-1584839404042-8bc21d240de7?w=500'
    ],
    stock: 25,
    availability: true,
    rating: 4.6,
    reviewCount: 92,
    sizes: ['4oz', '8oz'],
    badge: 'sale',
    featured: false,
    createdAt: '2024-01-12'
  },
  {
    id: 6,
    name: 'Convertible Baby Crib - 4 in 1',
    description: 'Grows with your child from crib to toddler bed to daybed to full-size bed. Solid wood construction.',
    price: 449.99,
    originalPrice: 599.99,
    category: 'furniture',
    ageGroup: 'newborn',
    brand: 'Comfy Baby',
    images: [
      'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=500',
      'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=500'
    ],
    stock: 8,
    availability: true,
    rating: 4.9,
    reviewCount: 312,
    colors: ['White', 'Natural Wood', 'Gray'],
    badge: 'hot',
    featured: true,
    createdAt: '2024-01-05'
  },
  {
    id: 7,
    name: 'Eco-Friendly Diapers - Size 2 (Pack of 80)',
    description: 'Plant-based, hypoallergenic diapers. Super absorbent core keeps baby dry for up to 12 hours.',
    price: 32.99,
    originalPrice: 38.99,
    category: 'diapers',
    ageGroup: 'infant',
    brand: 'TinyTots',
    images: [
      'https://images.unsplash.com/photo-1584839404042-8bc21d240de7?w=500'
    ],
    stock: 100,
    availability: true,
    rating: 4.4,
    reviewCount: 567,
    sizes: ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5'],
    featured: false,
    createdAt: '2024-01-18'
  },
  {
    id: 8,
    name: 'Kids Bicycle with Training Wheels',
    description: '14-inch bicycle perfect for beginners. Includes removable training wheels, bell, and basket.',
    price: 129.99,
    originalPrice: 159.99,
    category: 'toys',
    ageGroup: 'early-childhood',
    brand: 'KiddieCare',
    images: [
      'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=500'
    ],
    stock: 20,
    availability: true,
    rating: 4.7,
    reviewCount: 145,
    colors: ['Red', 'Blue', 'Pink'],
    badge: 'new',
    featured: true,
    createdAt: '2024-01-22'
  },
  {
    id: 9,
    name: 'Interactive Story Book Collection',
    description: 'Set of 10 interactive books with sound buttons. Perfect for early readers and bedtime stories.',
    price: 44.99,
    originalPrice: 59.99,
    category: 'books',
    ageGroup: 'toddler',
    brand: 'Wonder Child',
    images: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500'
    ],
    stock: 35,
    availability: true,
    rating: 4.8,
    reviewCount: 203,
    badge: 'sale',
    featured: false,
    createdAt: '2024-01-14'
  },
  {
    id: 10,
    name: 'Baby Bath Tub with Temperature Indicator',
    description: 'Ergonomic baby bath tub with built-in temperature indicator. Non-slip surface and drain plug.',
    price: 39.99,
    originalPrice: 49.99,
    category: 'bath',
    ageGroup: 'newborn',
    brand: 'SafeKids',
    images: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500'
    ],
    stock: 40,
    availability: true,
    rating: 4.5,
    reviewCount: 88,
    colors: ['White', 'Blue', 'Pink'],
    badge: 'new',
    featured: false,
    createdAt: '2024-01-19'
  },
  {
    id: 11,
    name: 'Kids Backpack School Set',
    description: 'Durable backpack with matching lunch bag and pencil case. Ergonomic design with padded straps.',
    price: 45.99,
    originalPrice: 55.99,
    category: 'gear',
    ageGroup: 'kids',
    brand: 'LittleStars',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500'
    ],
    stock: 60,
    availability: true,
    rating: 4.6,
    reviewCount: 234,
    colors: ['Dinosaur', 'Unicorn', 'Space', 'Princess'],
    featured: true,
    createdAt: '2024-01-21'
  },
  {
    id: 12,
    name: 'Soft Plush Teddy Bear - Giant Size',
    description: '36-inch super soft teddy bear. Made with hypoallergenic materials. Perfect cuddle buddy!',
    price: 54.99,
    originalPrice: 69.99,
    category: 'toys',
    ageGroup: 'infant',
    brand: 'HappyBaby',
    images: [
      'https://images.unsplash.com/photo-1558864559-ed673ba3610b?w=500'
    ],
    stock: 25,
    availability: true,
    rating: 4.9,
    reviewCount: 456,
    colors: ['Brown', 'White', 'Pink'],
    badge: 'hot',
    featured: true,
    createdAt: '2024-01-16'
  }
];

// Admin credentials (in real app, this would be server-side)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// Initialize data in localStorage if not exists
function initializeData() {
  if (!localStorage.getItem('kidsstore_products')) {
    localStorage.setItem('kidsstore_products', JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem('kidsstore_users')) {
    localStorage.setItem('kidsstore_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('kidsstore_orders')) {
    localStorage.setItem('kidsstore_orders', JSON.stringify([]));
  }
  if (!localStorage.getItem('kidsstore_cart')) {
    localStorage.setItem('kidsstore_cart', JSON.stringify([]));
  }
  if (!localStorage.getItem('kidsstore_wishlist')) {
    localStorage.setItem('kidsstore_wishlist', JSON.stringify([]));
  }
}

// Data access functions
function getProducts() {
  return JSON.parse(localStorage.getItem('kidsstore_products')) || [];
}

function saveProducts(products) {
  localStorage.setItem('kidsstore_products', JSON.stringify(products));
}

function getUsers() {
  return JSON.parse(localStorage.getItem('kidsstore_users')) || [];
}

function saveUsers(users) {
  localStorage.setItem('kidsstore_users', JSON.stringify(users));
}

function getOrders() {
  return JSON.parse(localStorage.getItem('kidsstore_orders')) || [];
}

function saveOrders(orders) {
  localStorage.setItem('kidsstore_orders', JSON.stringify(orders));
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

function getCart() {
  return JSON.parse(localStorage.getItem('kidsstore_cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('kidsstore_cart', JSON.stringify(cart));
}

function getWishlist() {
  return JSON.parse(localStorage.getItem('kidsstore_wishlist')) || [];
}

function saveWishlist(wishlist) {
  localStorage.setItem('kidsstore_wishlist', JSON.stringify(wishlist));
}

function isAdminLoggedIn() {
  return localStorage.getItem('kidsstore_adminLoggedIn') === 'true';
}

function setAdminLoggedIn(status) {
  localStorage.setItem('kidsstore_adminLoggedIn', status.toString());
}

// Initialize on load
initializeData();
