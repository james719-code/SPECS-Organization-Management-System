import './style.css';
import renderLanding from './views/landing.js';
import renderLogin from './views/login.js';
import renderSignup from './views/signup.js';
import renderDashboard from './views/dashboard.js'; // <-- new import

function renderRoute() {
  const route = window.location.hash.slice(1);
  
  if (route === '' || route === 'home') {
    renderLanding();
  } else if (route === 'login') {
    renderLogin();
  } else if (route === 'signup') {
    renderSignup();
  } else if (route === 'dashboard') {
    renderDashboard();
  } else {
    document.getElementById('app').innerHTML = '<h1>404 - Page Not Found</h1>';
  }
}

window.addEventListener('load', renderRoute);
window.addEventListener('hashchange', renderRoute);
