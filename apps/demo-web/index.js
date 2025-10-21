// Simple demo app for UI verification testing
const express = require('express');
const app = express();
const PORT = 3000;

let users = {}; // In-memory user store

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Homepage
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>ORK Demo</title></head>
    <body>
      <h1>Welcome to ORK Demo</h1>
      <p><a href="/signup">Sign Up</a> | <a href="/login">Login</a></p>
    </body>
    </html>
  `);
});

// Signup page
app.get('/signup', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Sign Up</title></head>
    <body>
      <h1>Create Account</h1>
      <form id="signup-form" action="/signup" method="POST">
        <label>Email: <input type="email" id="email" name="email" required /></label><br/>
        <label>Password: <input type="password" id="password" name="password" required /></label><br/>
        <label>Confirm: <input type="password" id="password-confirm" name="confirm" required /></label><br/>
        <button id="create-account" type="submit">Create Account</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/signup', (req, res) => {
  const { email, password, confirm } = req.body;
  if (password === confirm) {
    users[email] = password;
    res.redirect('/dashboard');
  } else {
    res.send('Passwords do not match');
  }
});

// Login page
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Login</title></head>
    <body>
      <h1>Login</h1>
      <form id="login-form" action="/login" method="POST">
        <label>Email: <input type="email" id="email" name="email" required /></label><br/>
        <label>Password: <input type="password" id="password" name="password" required /></label><br/>
        <button id="login" type="submit">Login</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (users[email] === password) {
    res.redirect('/dashboard');
  } else {
    res.send('Invalid credentials');
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Dashboard</title></head>
    <body>
      <div data-testid="dashboard">
        <h1>Dashboard</h1>
        <p>Welcome! You are logged in.</p>
        <button id="logout" onclick="window.location.href='/login'">Logout</button>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Demo app listening on http://0.0.0.0:${PORT}`);
});
