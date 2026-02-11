/**
 * Admin Survey List - View and filter all surveys.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { surveyAPI, zoneAPI, userAPI } from '../../services/api';

function AdminSurveyList() {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [zones, setZones] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [selectedZone, setSelectedZone] = useState('');
    const [selectedSupervisor, setSelectedSupervisor] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchSurveys();
    }, [selectedZone, selectedSupervisor, selectedStatus]);

    const fetchInitialData = async () => {
        try {
            const [zonesRes, usersRes] = await Promise.all([
                zoneAPI.list(),
                userAPI.list({ role: 'SUPERVISOR' })
            ]);
            setZones(zonesRes.data.results || zonesRes.data);
            setSupervisors(usersRes.data.results || usersRes.data);
        } catch (err) {
            console.error('Failed to load filters', err);
        }
    };

    const fetchSurveys = async () => {
        setLoading(true);
        try {
            const params = {};
            if (selectedZone) params.zone = selectedZone;
            if (selectedSupervisor) params.supervisor = selectedSupervisor;
            if (selectedStatus) params.status = selectedStatus;

            const response = await surveyAPI.list(params);
            setSurveys(response.data.results || response.data);
        } catch (err) {
            setError('Failed to load surveys.');
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div>
            <h2>Survey Management</h2>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Filters */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

                    {/* Zone Filter */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Filter by Zone</label>
                        <select
                            className="form-input"
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                        >
                            <option value="">All Zones</option>
                            {zones.map(z => (
                                <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                            ))}
                        </select>
                    </div>

                    {/* Supervisor Filter */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Filter by Supervisor</label>
                        <select
                            className="form-input"
                            value={selectedSupervisor}
                            onChange={(e) => setSelectedSupervisor(e.target.value)}
                        >
                            <option value="">All Supervisors</option>
                            {supervisors.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Filter by Status</label>
                        <select
                            className="form-input"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="FLAGGED">Flagged</option>
                        </select>
                    </div>

                    {/* Reset Button */}
                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'end' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            onClick={() => {
                                setSelectedZone('');
                                setSelectedSupervisor('');
                                setSelectedStatus('');
                            }}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="card">
                {loading ? (
                    <div className="loading-container"><div className="spinner"></div></div>
                ) : surveys.length === 0 ? (
                    <p className="text-muted">No surveys found matching criteria.</p>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Surveyor</th>
                                    <th>Head of Household</th>
                                    <th>Address</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {surveys.map(survey => (
                                    <tr key={survey.id}>
                                        <td>
                                            {survey.surveyor_name || 'Unknown'}
                                            <br />
                                            <small className="text-muted">
                                                {survey.zone_name || '-'}
                                            </small>
                                        </td>
                                        <td>
                                            <strong>{survey.head_name}</strong>
                                            <br />
                                            <span className="text-muted">{survey.head_phone || '-'}</span>
                                        </td>
                                        <td>
                                            {survey.address_line}
                                            <br />
                                            <span className="text-muted">{survey.pincode}</span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${survey.status.toLowerCase()}`}>
                                                {survey.status}
                                            </span>
                                            {survey.location_warning && (
                                                <span className="badge badge-flagged" style={{ marginLeft: '4px' }}>
                                                    ⚠️ GPS
                                                </span>
                                            )}
                                            {!survey.address && survey.status === 'FLAGGED' && (
                                                <span className="badge badge-flagged" style={{ marginLeft: '4px', backgroundColor: '#e74c3c' }}>
                                                    🏠 New
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {survey.submitted_at
                                                ? new Date(survey.submitted_at).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td>
                                            {/* Admin can always view details */}
                                            <Link
                                                to={`/surveyor/survey/${survey.id}`}
                                                className="btn btn-secondary"
                                                style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto' }}
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminSurveyList;
