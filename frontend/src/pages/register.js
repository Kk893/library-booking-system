import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useForm } from 'react-hook-form';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone } from 'react-icons/fi';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const router = useRouter();
  const { register: registerUser, socialLogin, verifyOTP } = useAuth();

  const password = watch("password", "");

  const onSubmit = async (data) => {
    setIsLoading(true);
    setRegisterError('');
    
    try {
      // If OTP has already been sent, verify it
      if (otpSent) {
        await verifyOTP(data.email, otp);
        router.push('/login?registered=true');
        return;
      }

      // Register new user
      const response = await registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password
      });

      setOtpSent(true);
    } catch (error) {
      setRegisterError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    try {
      setIsLoading(true);
      setRegisterError('');
      
      // In a real implementation, this would use the actual social login provider SDK
      console.log(`Attempting to sign up with ${provider}`);
      
      // Mock social signup for development
      if (provider === 'google') {
        // This would normally get a token from Google OAuth
        const mockToken = 'google-mock-token';
        await socialLogin('google', mockToken);
      } else if (provider === 'facebook') {
        // This would normally get a token from Facebook OAuth
        const mockToken = 'facebook-mock-token';
        await socialLogin('facebook', mockToken);
      }
      
      router.push('/dashboard');
    } catch (error) {
      setRegisterError(`${provider} signup failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Register | LibraryBooking</title>
        <meta name="description" content="Create a new LibraryBooking account" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-card">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Create an Account</h1>
            <p className="mt-2 text-gray-600">
              Join LibraryBooking to start reserving seats and books
            </p>
          </div>

          {registerError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{registerError}</span>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {otpSent ? (
              <div className="space-y-4">
                <div>
                  <p className="text-center text-sm text-gray-600 mb-4">
                    We've sent a verification code to your email. Please enter it below.
                  </p>
                </div>
                <div className="form-control">
                  <label htmlFor="otp" className="form-label">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    className="form-input text-center text-xl tracking-widest"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-md shadow-sm space-y-4">
                <div className="form-control">
                  <label htmlFor="name" className="form-label">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className={`form-input pl-10 ${errors.name ? 'border-red-300' : ''}`}
                      placeholder="John Doe"
                      {...register("name", { 
                        required: "Name is required",
                        minLength: {
                          value: 2,
                          message: "Name must be at least 2 characters"
                        }
                      })}
                    />
                  </div>
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>

                <div className="form-control">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`form-input pl-10 ${errors.email ? 'border-red-300' : ''}`}
                      placeholder="you@example.com"
                      {...register("email", { 
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address"
                        }
                      })}
                    />
                  </div>
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>

                <div className="form-control">
                  <label htmlFor="phone" className="form-label">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiPhone className="text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      className={`form-input pl-10 ${errors.phone ? 'border-red-300' : ''}`}
                      placeholder="+1 (555) 123-4567"
                      {...register("phone", { 
                        required: "Phone number is required",
                        pattern: {
                          value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                          message: "Invalid phone number format"
                        }
                      })}
                    />
                  </div>
                  {errors.phone && <p className="form-error">{errors.phone.message}</p>}
                </div>

                <div className="form-control">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      className={`form-input pl-10 pr-10 ${errors.password ? 'border-red-300' : ''}`}
                      placeholder="********"
                      {...register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 8,
                          message: "Password must be at least 8 characters"
                        },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                          message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
                        }
                      })}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {errors.password && <p className="form-error">{errors.password.message}</p>}
                </div>

                <div className="form-control">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className={`form-input pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300' : ''}`}
                      placeholder="********"
                      {...register("confirmPassword", {
                        required: "Please confirm your password",
                        validate: value => value === password || "Passwords do not match"
                      })}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`btn btn-primary w-full ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading 
                  ? 'Processing...' 
                  : otpSent 
                    ? 'Verify & Complete Registration' 
                    : 'Register'
                }
              </button>
            </div>
          </form>

          {!otpSent && (
            <>
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialSignup('google')}
                    disabled={isLoading}
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FaGoogle className="mr-2 h-5 w-5 text-red-500" />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialSignup('facebook')}
                    disabled={isLoading}
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FaFacebookF className="mr-2 h-5 w-5 text-blue-600" />
                    Facebook
                  </button>
                </div>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary-600 hover:text-primary-500">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Register;