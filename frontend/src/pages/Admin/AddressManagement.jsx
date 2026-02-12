/**
 * Address Management Page for Admin.
 * Lists all master addresses with CRUD operations.
 */
import React, { useState, useEffect } from 'react';
import { addressAPI, zoneAPI } from '../../services/api';
import ConfirmationModal from '../../components/ConfirmationModal';

function AddressManagement() {
    const [addresses, setAddresses] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        zone: '',
        pincode: '',
        address_line1: '',
        address_line2: '',
        landmark: '',
        building_number: '',
        floor_number: '',
        status: 'ACTIVE'
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterZone, setFilterZone] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPincode, setFilterPincode] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [addrRes, zonesRes] = await Promise.all([
                addressAPI.list(),
                zoneAPI.list()
            ]);
            const addrData = addrRes.data.results || addrRes.data || [];
            setAddresses(addrData);
            setZones(zonesRes.data.results || zonesRes.data || []);
            setAddresses(addrData);
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

    const resetForm = () => {
        setFormData({
            zone: '',
            pincode: '',
            address_line1: '',
            address_line2: '',
            landmark: '',
            building_number: '',
            floor_number: '',
            status: 'ACTIVE'
        });
        setEditingId(null);
        setShowCreateForm(false);
    };

    const validateAddressLine = (value) => {
        if (!value.trim().toLowerCase().startsWith('door no.')) {
            return 'Address must begin with "Door No."';
        }
        return '';
    };

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate Door No.
        const validationError = validateAddressLine(formData.address_line1);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            const payload = {
                ...formData,
                zone_id: formData.zone
            };

            if (editingId) {
                await addressAPI.update(editingId, payload);
                setSuccess('Address updated successfully.');
            } else {
                await addressAPI.create(payload);
                setSuccess('Address created successfully.');
            }
            resetForm();
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to save address.');
        }
    };

    const handleEdit = (address) => {
        setFormData({
            zone: address.zone,
            pincode: address.pincode,
            address_line1: address.address_line1,
            address_line2: address.address_line2 || '',
            landmark: address.landmark || '',
            building_number: address.building_number || '',
            floor_number: address.floor_number || '',
            status: address.status
        });
        setEditingId(address.id);
        setShowCreateForm(true);
    };

    const handleDelete = (id) => {
        setAddressToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!addressToDelete) return;
        setError('');
        try {
            await addressAPI.delete(addressToDelete);
            setSuccess('Address deleted.');
            setShowDeleteModal(false);
            setAddressToDelete(null);
            fetchData();
        } catch (err) {
            setError('Failed to delete address.');
            setShowDeleteModal(false);
        }
    };

    // Filter logic
    const filteredAddresses = addresses.filter(addr => {
        const matchesSearch = searchTerm === '' ||
            addr.address_line1.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (addr.landmark || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (addr.building_number || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesZone = filterZone === '' ||
            (addr.zone_id && addr.zone_id.toString() === filterZone);

        const matchesStatus = filterStatus === '' || addr.status === filterStatus;

        const matchesPincode = filterPincode === '' || addr.pincode.includes(filterPincode);

        return matchesSearch && matchesZone && matchesStatus && matchesPincode;
    });

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Address Management <span className="badge badge-info">{filteredAddresses.length} Addresses</span></h2>
                <button className="btn btn-primary" onClick={() => {
                    if (showCreateForm) resetForm();
                    else setShowCreateForm(true);
                }}>
                    {showCreateForm ? 'Cancel' : 'Add New Address'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{success}</div>}

            <ConfirmationModal
                isOpen={showDeleteModal}
                title="Delete Address"
                message="Are you sure you want to delete this address? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="error"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            {/* Filters */}
            {!showCreateForm && (
                <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
                    <div className="grid grid-4" style={{ gap: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Search</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search address, landmark..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Pincode</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Filter by pincode"
                                value={filterPincode}
                                onChange={(e) => setFilterPincode(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Zone</label>
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
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Status</label>
                            <select
                                className="form-input form-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="NEW">New</option>
                                <option value="MODIFIED">Modified</option>
                                <option value="DEMOLISHED">Demolished</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Edit Form */}
            {showCreateForm && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3>{editingId ? 'Edit Address' : 'Add New Address'}</h3>
                    <form onSubmit={handleCreateOrUpdate}>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Zone *</label>
                                <select
                                    className="form-input form-select"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                    required
                                >
                                    <option value="">Select Zone</option>
                                    {zones.map(zone => (
                                        <option key={zone.id} value={zone.id}>{zone.name} ({zone.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pincode *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. 560001"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address Line 1 * <small style={{ color: 'var(--color-text-muted)' }}>(Must start with "Door No.")</small></label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Door No. 123, Street Name"
                                    value={formData.address_line1}
                                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address Line 2</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Additional details"
                                    value={formData.address_line2}
                                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Landmark</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Near..."
                                    value={formData.landmark}
                                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Building Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.building_number}
                                    onChange={(e) => setFormData({ ...formData, building_number: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Floor Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.floor_number}
                                    onChange={(e) => setFormData({ ...formData, floor_number: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-input form-select"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="NEW">New</option>
                                    <option value="MODIFIED">Modified</option>
                                    <option value="DEMOLISHED">Demolished</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">
                            {editingId ? 'Update Address' : 'Create Address'}
                        </button>
                    </form>
                </div>
            )}

            {/* Address Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Address</th>
                                <th>Pincode</th>
                                <th>Zone</th>
                                <th>Landmark</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAddresses.length > 0 ? (
                                filteredAddresses.map(addr => (
                                    <tr key={addr.id}>
                                        <td>{addr.address_line1}</td>
                                        <td>{addr.pincode}</td>
                                        <td>{addr.zone_name || '-'}</td>
                                        <td>{addr.landmark || '-'}</td>
                                        <td>
                                            <span className={`badge ${addr.status === 'ACTIVE' ? 'badge-verified' :
                                                addr.status === 'NEW' ? 'badge-info' :
                                                    addr.status === 'MODIFIED' ? 'badge-draft' :
                                                        'badge-flagged'
                                                }`}>
                                                {addr.status}
                                            </span>
                                        </td>
                                        <td style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto' }}
                                                onClick={() => handleEdit(addr)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto' }}
                                                onClick={() => handleDelete(addr.id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                                        No addresses found matching your filters.
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

export default AddressManagement;
