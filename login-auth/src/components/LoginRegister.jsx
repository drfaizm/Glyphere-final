import React, { useState } from 'react';
import './LoginRegister.css';

const LoginRegister = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ email: '', password: '', name: '', confirmPassword: '' });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin
      ? { email: formData.email, password: formData.password }
      : { name: formData.name, email: formData.email, password: formData.password };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        alert(`${isLogin ? 'Login' : 'Registration'} successful!`);
      } else {
        setError(data.msg || 'Something went wrong');
      }
    } catch {
      setError('Server connection failed. Make sure the backend is running.');
    }
  };

  return (
    /* The CSS uses .log-in-active to show the Login form. 
       So if isLogin is true, we add 'log-in-active' class. */
    <div className={`container ${isLogin ? 'log-in-active' : ''}`}>
      
      {/* Login Form (Sign In) */}
      <div className="form-container sign-in-container">
        <form onSubmit={handleSubmit}>
          <h1>Login</h1>
          
          <div className="input-group">
            <input
              type="text"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <i className="fa-solid fa-envelope"></i>
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            <i className="fa-solid fa-lock"></i>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit">Login</button>
          
          <p className="toggle-text">
            Don't have an account? <span onClick={toggleMode}>Sign Up</span>
          </p>
        </form>
      </div>

      {/* Register Form (Sign Up) */}
      <div className="form-container sign-up-container">
        <form onSubmit={handleSubmit}>
          <h1>Register</h1>

          <div className="input-group">
            <input
              type="text"
              name="name"
              placeholder="Username"
              value={formData.name}
              onChange={handleInputChange}
              required={!isLogin}
            />
            <i className="fa-solid fa-user"></i>
          </div>

          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <i className="fa-solid fa-envelope"></i>
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required={!isLogin}
            />
            <i className="fa-solid fa-lock"></i>
          </div>

          <div className="input-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required={!isLogin}
            />
            <i className="fa-solid fa-lock"></i>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit">Register</button>

          <p className="toggle-text">
            Already have an account? <span onClick={toggleMode}>Sign In</span>
          </p>
        </form>
      </div>

      {/* Diagonal Overlay */}
      <div className="overlay-container">
        <div className="overlay-panel overlay-left">
          <h2>WELCOME BACK!</h2>
          <p>We are happy to have you with us again. If you need anything, we are here to help.</p>
        </div>

        <div className="overlay-panel overlay-right">
          <h2>WELCOME!</h2>
          <p>We're delighted to have you here. If you need any assistance, feel free to reach out.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;