import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../context/AuthContext';

const LoginForm = ({ onSwitchToSignup }) => {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors?.[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.username?.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData?.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login({
        username: formData?.username,
        password: formData?.password
      });

      if (result?.success) {
        navigate('/personalized-dashboard');
      } else {
        setErrors({
          general: result?.error || authError || 'Invalid credentials.'
        });
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors?.general && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start space-x-3">
          <Icon name="AlertCircle" size={20} color="var(--color-error)" />
          <p className="text-sm text-error flex-1">{errors?.general}</p>
        </div>
      )}
      <Input
        label="Username"
        type="text"
        name="username"
        placeholder="Enter your username"
        value={formData?.username}
        onChange={handleChange}
        error={errors?.username}
        required
        disabled={isLoading}
      />
      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Enter your password"
          value={formData?.password}
          onChange={handleChange}
          error={errors?.password}
          required
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 p-2 rounded-lg hover:bg-muted transition-gentle"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <Icon
            name={showPassword ? 'EyeOff' : 'Eye'}
            size={18}
            color="var(--color-muted-foreground)"
          />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-sm text-primary hover:text-primary/80 transition-gentle caption"
        >
          Forgot Password?
        </button>
      </div>
      <Button
        type="submit"
        variant="default"
        fullWidth
        loading={isLoading}
        iconName="LogIn"
        iconPosition="right"
      >
        Enter Your Space
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToSignup}
          disabled={isLoading}
          className="text-sm text-primary hover:text-primary/80 transition-gentle caption"
        >
          Don't have an account? Create one
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
