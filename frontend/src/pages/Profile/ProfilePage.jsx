import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
        }
    }, [user]);

    const handleBack = () => {
        navigate(-1);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await authAPI.updateProfile({ full_name: fullName });
            if (response.data.success) {
                await refreshUser();
                setSuccess('Profile updated successfully!');
                setIsEditing(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="title" style={{ marginBottom: 'var(--spacing-lg)', fontSize: '2rem', textAlign: 'center' }}>My Profile</h1>

            <div className="card">
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-xl)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        fontWeight: '800',
                        marginBottom: 'var(--spacing-md)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '4px solid white'
                    }}>
                        {user.fullName?.charAt(0) || 'U'}
                    </div>
                    <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>{user.fullName}</h2>
                    <span className="badge badge-primary" style={{ fontSize: '1rem', padding: '0.5em 1em' }}>{user.role}</span>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {isEditing ? (
                    <form onSubmit={handleSave} style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="text"
                                className="form-input"
                                value={user.phoneNumber || ''}
                                disabled
                                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: 'var(--color-text-secondary)' }}
                            />
                            <small className="text-muted">Phone number cannot be changed.</small>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)', justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setIsEditing(false);
                                    setFullName(user.fullName);
                                    setError('');
                                }}
                                disabled={loading}
                                style={{ minWidth: '120px' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ minWidth: '120px' }}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-2" style={{ gap: 'var(--spacing-xl)', maxWidth: '600px', margin: '0 auto' }}>
                        <div>
                            <label className="stat-label">Full Name</label>
                            <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--color-text-primary)' }}>{user.fullName}</div>
                        </div>

                        <div>
                            <label className="stat-label">Phone Number</label>
                            <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--color-text-primary)' }}>{user.phoneNumber || 'N/A'}</div>
                        </div>

                        <div>
                            <label className="stat-label">Member Since</label>
                            <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) : 'N/A'}
                            </div>
                        </div>

                        {user.role !== 'ADMIN' && (
                            <>
                                <div>
                                    <label className="stat-label">Assigned Zone</label>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                        {user.zoneName || 'No Zone Assigned'}
                                    </div>
                                </div>

                                <div>
                                    <label className="stat-label">Daily Target</label>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                                        {user.dailyTarget || 0} Surveys
                                    </div>
                                </div>
                            </>
                        )}

                        <div style={{ gridColumn: '1 / -1', marginTop: 'var(--spacing-lg)', display: 'flex', justifyContent: 'center' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setIsEditing(true)}
                                style={{ minWidth: '200px' }}
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfilePage;
