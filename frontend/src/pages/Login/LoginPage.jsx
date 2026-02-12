/**
 * Login Page with Development Mode Bypass.
 * In dev mode, allows login without Firebase OTP.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Check if in development mode
const IS_DEV_MODE = import.meta.env.DEV || !import.meta.env.VITE_FIREBASE_API_KEY?.startsWith('AIza');

function LoginPage() {
    const [step, setStep] = useState('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [devMode, setDevMode] = useState(IS_DEV_MODE);

    const { login, isAuthenticated, user, devLogin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            const from = location.state?.from?.pathname || user.redirectUrl || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, user, navigate, location]);

    const handleDevLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const digits = phoneNumber.replace(/\D/g, '');
        if (digits.length !== 10) {
            setError('Please enter a valid 10-digit phone number.');
            setLoading(false);
            return;
        }

        try {
            const result = await devLogin(`+91${digits}`);

            if (result.success) {
                navigate(result.user.redirectUrl || '/', { replace: true });
            } else {
                setError(result.error || 'Login failed. User not found in system.');
            }
        } catch (err) {
            setError('Login failed. Please check if the phone number is registered.');
        }

        setLoading(false);
    };

    return (
        <div className="page" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'var(--color-background)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>
                        Digital Census Portal
                    </h1>
                    <p className="text-muted">Government of Karnataka</p>
                    {devMode && (
                        <div className="alert alert-info" style={{ marginTop: '16px', textAlign: 'left' }}>
                            <strong>🔧 Development Mode</strong>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleDevLogin}>
                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="form-input"
                                value="+91"
                                disabled
                                style={{ width: '60px', textAlign: 'center' }}
                            />
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="Enter 10-digit number"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {devMode && (
                    <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '4px' }}>
                        <p className="text-muted" style={{ fontSize: '14px', marginBottom: '4px' }}>
                            Admin: <code>9876543210</code>
                        </p>
                        <p className="text-muted" style={{ fontSize: '14px', marginBottom: '4px' }}>
                            Supervisor: <code>9876500000</code>
                        </p>
                        <p className="text-muted" style={{ fontSize: '14px', marginBottom: '0' }}>
                            Surveyor: <code>9876500001</code>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LoginPage;
