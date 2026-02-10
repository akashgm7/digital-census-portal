/**
 * User Management Page for Admin.
 */
import React, { useState, useEffect } from 'react';
import { userAPI, zoneAPI } from '../../services/api';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        role: 'SURVEYOR',
        zone: '',
        daily_target: 10
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, zonesRes] = await Promise.all([
                userAPI.list(),
                zoneAPI.list()
            ]);
            setUsers(usersRes.data.results || usersRes.data);
            setZones(zonesRes.data.results || zonesRes.data);
        } catch (err) {
            setError('Failed to load data.');
        }
        setLoading(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await userAPI.create(formData);
            setShowCreateForm(false);
            setFormData({ full_name: '', phone_number: '', role: 'SURVEYOR', zone: '', daily_target: 10 });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user.');
        }
    };

    const handleBlock = async (userId) => {
        try {
            await userAPI.block(userId);
            fetchData();
        } catch (err) {
            setError('Failed to block user.');
        }
    };

    const handleUnblock = async (userId) => {
        try {
            await userAPI.unblock(userId);
            fetchData();
        } catch (err) {
            setError('Failed to unblock user.');
        }
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>User Management</h2>
                <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? 'Cancel' : 'Add New User'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {showCreateForm && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3>Create New User</h3>
                    <form onSubmit={handleCreateUser}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="10 digits"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select
                                    className="form-input form-select"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="SURVEYOR">Surveyor</option>
                                    <option value="SUPERVISOR">Supervisor</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Zone</label>
                                <select
                                    className="form-input form-select"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                >
                                    <option value="">Select Zone</option>
                                    {zones.map(zone => (
                                        <option key={zone.id} value={zone.id}>{zone.name} ({zone.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Daily Target</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.daily_target}
                                    onChange={(e) => setFormData({ ...formData, daily_target: parseInt(e.target.value) })}
                                    min="1"
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">Create User</button>
                    </form>
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Zone</th>
                                <th>Target</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.full_name}</td>
                                    <td>{user.phone_number}</td>
                                    <td><span className="badge badge-draft">{user.role}</span></td>
                                    <td>{user.zone_name || '-'}</td>
                                    <td>{user.daily_target}</td>
                                    <td>
                                        <span className={`badge ${user.is_active ? 'badge-verified' : 'badge-flagged'}`}>
                                            {user.is_active ? 'Active' : 'Blocked'}
                                        </span>
                                    </td>
                                    <td>
                                        {user.is_active ? (
                                            <button
                                                className="btn btn-danger"
                                                style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto' }}
                                                onClick={() => handleBlock(user.id)}
                                            >
                                                Block
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-success"
                                                style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto' }}
                                                onClick={() => handleUnblock(user.id)}
                                            >
                                                Unblock
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default UserManagement;
