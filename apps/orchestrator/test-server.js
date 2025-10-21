// Simple test server for UI verification demo
const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.json());

const users = new Map();

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Welcome</h1>
        <a href="/signup">Sign Up</a> | <a href="/login">Log In</a>
      </body>
    </html>
  `);
});

app.get('/signup', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Create Account</h1>
        <form id="signup-form" action="/api/signup" method="POST">
          <input id="email" name="email" type="email" placeholder="Email" required />
          <input id="password" name="password" type="password" placeholder="Password" required />
          <input id="password-confirm" name="password-confirm" type="password" placeholder="Confirm Password" required />
          <button id="create-account" type="submit">Create Account</button>
        </form>
        <script>
          document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('password-confirm').value;

            if (password !== confirm) {
              alert('Passwords do not match');
              return;
            }

            const res = await fetch('/api/signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            if (res.ok) {
              window.location.href = '/dashboard';
            } else {
              alert('Signup failed');
            }
          });
        </script>
      </body>
    </html>
  `);
});

app.get('/login', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Log In</h1>
        <form id="login-form" action="/api/login" method="POST">
          <input id="email" name="email" type="email" placeholder="Email" required />
          <input id="password" name="password" type="password" placeholder="Password" required />
          <button id="login" type="submit">Log In</button>
        </form>
        <script>
          document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const res = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            if (res.ok) {
              window.location.href = '/dashboard';
            } else {
              alert('Login failed');
            }
          });
        </script>
      </body>
    </html>
  `);
});

app.get('/dashboard', (req, res) => {
  res.send(`
    <html>
      <body>
        <div data-testid="dashboard">
          <h1>Dashboard</h1>
          <p>Welcome to your dashboard!</p>
          <button id="logout">Log Out</button>
        </div>
        <script>
          document.getElementById('logout').addEventListener('click', () => {
            window.location.href = '/login';
          });
        </script>
      </body>
    </html>
  `);
});

app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  users.set(email, password);
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (users.get(email) === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
