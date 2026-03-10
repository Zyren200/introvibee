import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../context/AuthContext';

const SignupForm = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { signUp, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    selectedAvatar: 1,
    interests: '',
    tags: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const avatarOptions = [
    { id: 1, icon: 'User', label: 'Default', color: 'var(--color-primary)' },
    { id: 2, icon: 'Smile', label: 'Happy', color: 'var(--color-accent)' },
    { id: 3, icon: 'Heart', label: 'Kind', color: 'var(--color-error)' },
    { id: 4, icon: 'Star', label: 'Bright', color: 'var(--color-warning)' },
    { id: 5, icon: 'Zap', label: 'Energetic', color: 'var(--color-success)' },
    { id: 6, icon: 'Moon', label: 'Calm', color: 'var(--color-muted-foreground)' },
    { id: 7, icon: 'Sun', label: 'Cheerful', color: 'var(--color-warning)' },
    { id: 8, icon: 'Cloud', label: 'Dreamy', color: 'var(--color-primary)' }
  ];

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

  const handleAvatarSelect = (avatarId) => {
    setFormData(prev => ({
      ...prev,
      selectedAvatar: avatarId
    }));
    if (errors?.selectedAvatar) {
      setErrors(prev => ({
        ...prev,
        selectedAvatar: ''
      }));
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password?.length >= 8) strength++;
    if (/[a-z]/?.test(password) && /[A-Z]/?.test(password)) strength++;
    if (/\d/?.test(password)) strength++;
    if (/[^a-zA-Z\d]/?.test(password)) strength++;

    const strengthMap = {
      0: { label: 'Too weak', color: 'var(--color-error)' },
      1: { label: 'Weak', color: 'var(--color-error)' },
      2: { label: 'Fair', color: 'var(--color-warning)' },
      3: { label: 'Good', color: 'var(--color-success)' },
      4: { label: 'Strong', color: 'var(--color-success)' }
    };

    return { strength, ...strengthMap?.[strength] };
  };

  const passwordStrength = calculatePasswordStrength(formData?.password);

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.username?.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData?.username?.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData?.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData?.password) {
      newErrors.password = 'Password is required';
    } else if (formData?.password?.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData?.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData?.password !== formData?.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

    const result = signUp({
      username: formData?.username,
      email: formData?.email,
      password: formData?.password,
      interests: formData?.interests
        ? formData?.interests?.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      tags: formData?.tags
        ? formData?.tags?.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      avatarId: formData?.selectedAvatar || 1,
    });

    if (result?.success) {
      navigate('/personalized-dashboard');
    } else {
      setErrors((prev) => ({
        ...prev,
        general: result?.error || authError || 'Unable to create account.'
      }));
      setIsLoading(false);
    }
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
        placeholder="Choose a username"
        value={formData?.username}
        onChange={handleChange}
        error={errors?.username}
        required
        disabled={isLoading}
      />

      <Input
        label="Email"
        type="email"
        name="email"
        placeholder="Enter your email"
        value={formData?.email}
        onChange={handleChange}
        error={errors?.email}
        required
        disabled={isLoading}
      />

      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Create a password"
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

      {formData?.password && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Password strength:</span>
            <span className="text-xs font-medium" style={{ color: passwordStrength?.color }}>
              {passwordStrength?.label}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(passwordStrength?.strength / 4) * 100}%`,
                backgroundColor: passwordStrength?.color
              }}
            />
          </div>
        </div>
      )}

      <div className="relative">
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          placeholder="Confirm your password"
          value={formData?.confirmPassword}
          onChange={handleChange}
          error={errors?.confirmPassword}
          required
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-9 p-2 rounded-lg hover:bg-muted transition-gentle"
          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
        >
          <Icon
            name={showConfirmPassword ? 'EyeOff' : 'Eye'}
            size={18}
            color="var(--color-muted-foreground)"
          />
        </button>
      </div>

      <div className="space-y-3">
        <Input
          label="Interests (comma separated)"
          type="text"
          name="interests"
          placeholder="Reading, Coding, Photography"
          value={formData?.interests}
          onChange={handleChange}
          disabled={isLoading}
          description="Used for matching suggestions"
        />

        <Input
          label="Personality Tags (comma separated)"
          type="text"
          name="tags"
          placeholder="Reflective, Calm"
          value={formData?.tags}
          onChange={handleChange}
          disabled={isLoading}
          description="Helps tailor prompts and matches"
        />

        <label className="text-sm font-medium leading-none text-foreground">
          Choose Your Avatar <span className="text-destructive ml-1">*</span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          {avatarOptions?.map((avatar) => (
            <button
              key={avatar?.id}
              type="button"
              onClick={() => handleAvatarSelect(avatar?.id)}
              disabled={isLoading}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                hover:scale-105 hover:shadow-gentle
                ${formData?.selectedAvatar === avatar?.id
                  ? 'border-primary bg-primary/5 shadow-gentle'
                  : 'border-border bg-card hover:border-primary/50'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-label={`Select ${avatar?.label} avatar`}
            >
              <div className="flex flex-col items-center space-y-2">
                <Icon
                  name={avatar?.icon}
                  size={28}
                  color={formData?.selectedAvatar === avatar?.id ? avatar?.color : 'var(--color-muted-foreground)'}
                />
                <span className="text-xs font-medium text-center">{avatar?.label}</span>
              </div>
              {formData?.selectedAvatar === avatar?.id && (
                <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                  <Icon name="Check" size={12} color="white" />
                </div>
              )}
            </button>
          ))}
        </div>
        {errors?.selectedAvatar && (
          <p className="text-sm text-destructive">{errors?.selectedAvatar}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="default"
        fullWidth
        loading={isLoading}
        iconName="UserPlus"
        iconPosition="right"
      >
        Create Your Account
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          disabled={isLoading}
          className="text-sm text-primary hover:text-primary/80 transition-gentle caption"
        >
          Already have an account? Sign in
        </button>
      </div>
    </form>
  );
};

export default SignupForm;
