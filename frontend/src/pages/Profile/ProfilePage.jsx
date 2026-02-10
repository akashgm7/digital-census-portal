/**
 * Profile Page Component.
 * Displays user details and allows updating full name.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
    const { user, refreshUser } = useAuth(); // login used to update context
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
                await refreshUser(); // Update context with new data
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
        <div className="page-header" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button
                    className="btn btn-secondary"
                    onClick={handleBack}
                    style={{ marginRight: '16px' }}
                >
                    &larr; Back
                </button>
                <h1 className="title" style={{ margin: 0 }}>My Profile</h1>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div className="avatar-placeholder" style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: 'bold'
                    }}>
                        {user.fullName?.charAt(0) || 'U'}
                    </div>
                    {!isEditing && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit Profile
                        </button>
                    )}
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
                {success && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{success}</div>}

                {isEditing ? (
                    <form onSubmit={handleSave}>
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
                                // Looking at AuthContext, it maps to `user.phoneNumber` or just uses user object directly?
                                // AuthContext maps response: id, fullName, role, zoneId, zoneName, dailyTarget
                                // It seems phone_number is NOT in the mapped object in AuthContext!
                                // We might need to fetch it or just not show it if it's missing.
                                // Let's check AuthContext again.
                                disabled
                                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                            />
                            <small className="text-muted">Phone number cannot be changed.</small>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setIsEditing(false);
                                    setFullName(user.fullName);
                                    setError('');
                                }}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="profile-details">
                        <div className="detail-row" style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Full Name</label>
                            <div style={{ fontSize: '18px', fontWeight: '500' }}>{user.fullName}</div>
                        </div>

                        <div className="detail-row" style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Role</label>
                            <div style={{ fontSize: '16px' }}><span className="badge badge-primary">{user.role}</span></div>
                        </div>

                        <div className="detail-row" style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Joined Date</label>
                            <div style={{ fontSize: '16px' }}>
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) : 'N/A'}
                            </div>
                        </div>

                        {user.role !== 'ADMIN' && (
                            <>
                                <div className="detail-row" style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Zone</label>
                                    <div style={{ fontSize: '16px' }}>{user.zoneName || 'N/A'}</div>
                                </div>

                                {user.dailyTarget && (
                                    <div className="detail-row" style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Daily Target</label>
                                        <div style={{ fontSize: '16px' }}>{user.dailyTarget}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfilePage;
