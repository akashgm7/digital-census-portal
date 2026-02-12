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

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterZone, setFilterZone] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, zonesRes] = await Promise.all([
                userAPI.list(), // Now returns all users (no pagination)
                zoneAPI.list()
            ]);
            // Handle both paginated (just in case) and non-paginated responses
            setUsers(usersRes.data.results || usersRes.data || []);
            setZones(zonesRes.data.results || zonesRes.data || []);
        } catch (err) {
            console.error(err);
            const msg = err.response
                ? `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`
                : err.message;
            setError('Failed to load data: ' + msg);
        }
        setLoading(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Send payload matching backend expectations (shimmed in backend but good practice)
            const payload = {
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                role: formData.role,
                // Only send zone/target if relevant
                zone_id: formData.role !== 'ADMIN' ? formData.zone : null,
                daily_target: formData.role === 'SURVEYOR' ? formData.daily_target : 0
            };

            await userAPI.create(payload);
            setShowCreateForm(false);
            setFormData({ full_name: '', phone_number: '', role: 'SURVEYOR', zone: '', daily_target: 10 });
            fetchData();
        } catch (err) {
            console.error('Create User Error:', err);
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create user.');
        }
    };

    const handleBlock = async (userId) => {
        if (!userId) return;
        try {
            await userAPI.block(userId);
            fetchData();
        } catch (err) {
            console.error('Block User Error:', err);
            setError('Failed to block user.');
        }
    };

    const handleUnblock = async (userId) => {
        if (!userId) return;
        try {
            await userAPI.unblock(userId);
            fetchData();
        } catch (err) {
            console.error('Unblock User Error:', err);
            setError('Failed to unblock user.');
        }
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone_number.includes(searchTerm);

        const matchesRole = filterRole === '' || user.role === filterRole;

        const matchesZone = filterZone === '' || (user.zone && user.zone.toString() === filterZone) || (user.zone_id && user.zone_id.toString() === filterZone);

        return matchesSearch && matchesRole && matchesZone;
    });

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>User Management <span className="badge badge-info">{filteredUsers.length} Users</span></h2>
                <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? 'Cancel' : 'Add New User'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {!showCreateForm && (
                <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
                    <div className="grid grid-3" style={{ gap: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Search</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Filter by Role</label>
                            <select
                                className="form-input form-select"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                <option value="ADMIN">Admin</option>
                                <option value="SUPERVISOR">Supervisor</option>
                                <option value="SURVEYOR">Surveyor</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Filter by Zone</label>
                            <select
                                className="form-input form-select"
                                value={filterZone}
                                onChange={(e) => setFilterZone(e.target.value)}
                            >
                                <option value="">All Zones</option>
                                {zones.map(zone => (
                                    <option key={zone.id} value={zone.id}>{zone.name} ({zone.code})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

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

                            {/* Conditional Fields based on Role */}
                            {formData.role !== 'ADMIN' && (
                                <div className="form-group">
                                    <label className="form-label">Zone</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.zone}
                                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                        required={formData.role !== 'ADMIN'}
                                    >
                                        <option value="">Select Zone</option>
                                        {zones.map(zone => (
                                            <option key={zone.id} value={zone.id}>{zone.name} ({zone.code})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.role === 'SURVEYOR' && (
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
                            )}
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
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                                        No users found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default UserManagement;
