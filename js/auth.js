// Kids Store - Authentication Module

// Register a new user
function registerUser(userData) {
  const users = getUsers();
  
  // Check if email already exists
  if (users.find(u => u.email === userData.email)) {
    return { success: false, message: 'Email already registered' };
  }

  // Validate required fields
  if (!userData.name || !userData.email || !userData.password) {
    return { success: false, message: 'Please fill in all required fields' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+/;
  if (!emailRegex.test(userData.email)) {
    return { success: false, message: 'Please enter a valid email address' };
  }

  // Validate password length
  if (userData.password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  const newUser = {
    id: Date.now(),
    name: userData.name,
    email: userData.email,
    phone: userData.phone || '',
    password: userData.password,
    addresses: [],
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  
  return { success: true, user: newUser };
}

// Login user
function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    setCurrentUser(user);
    return { success: true, user };
  }
  
  return { success: false, message: 'Invalid email or password' };
}

// Logout user
function logoutUser() {
  setCurrentUser(null);
  saveCart([]);
  saveWishlist([]);
  window.location.href = 'index.html';
}

// Update user profile
function updateUserProfile(updates) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex > -1) {
    // Check if email is being changed and already exists
    if (updates.email && updates.email !== currentUser.email) {
      if (users.find(u => u.email === updates.email)) {
        return { success: false, message: 'Email already in use' };
      }
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    saveUsers(users);
    setCurrentUser(users[userIndex]);
    return { success: true };
  }
  
  return { success: false, message: 'User not found' };
}

// Add address to user profile
function addUserAddress(address) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex > -1) {
    const newAddress = {
      id: Date.now(),
      ...address,
      isDefault: users[userIndex].addresses.length === 0
    };
    
    users[userIndex].addresses.push(newAddress);
    saveUsers(users);
    setCurrentUser(users[userIndex]);
    return { success: true, address: newAddress };
  }
  
  return { success: false };
}

// Remove address from user profile
function removeUserAddress(addressId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex > -1) {
    users[userIndex].addresses = users[userIndex].addresses.filter(a => a.id !== addressId);
    saveUsers(users);
    setCurrentUser(users[userIndex]);
    return true;
  }
  
  return false;
}

// Set default address
function setDefaultAddress(addressId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex > -1) {
    users[userIndex].addresses.forEach(a => {
      a.isDefault = a.id === addressId;
    });
    saveUsers(users);
    setCurrentUser(users[userIndex]);
    return true;
  }
  
  return false;
}

// Check if user is logged in
function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Require login - redirect to login if not logged in
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Admin authentication
function adminLogin(username, password) {
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    setAdminLoggedIn(true);
    return { success: true };
  }
  return { success: false, message: 'Invalid credentials' };
}

function adminLogout() {
  setAdminLoggedIn(false);
  window.location.href = 'login.html';
}

function requireAdmin() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}
