/**
 * Supervisor Survey List - View and filter surveys in their zone.
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { surveyAPI, userAPI } from '../../services/api';

function SupervisorSurveyList() {
    const { user } = useAuth();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [surveyors, setSurveyors] = useState([]);
    const [selectedSurveyor, setSelectedSurveyor] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    const location = useLocation();

    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user]);

    // Handle URL query parameters for initial filter state
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const statusParam = queryParams.get('status');
        const surveyorParam = queryParams.get('surveyor');

        if (statusParam) setSelectedStatus(statusParam);
        if (surveyorParam) setSelectedSurveyor(surveyorParam);
    }, [location.search]);

    useEffect(() => {
        if (user) {
            fetchSurveys();
        }
    }, [selectedSurveyor, selectedStatus, user]);

    const fetchInitialData = async () => {
        try {
            // Supervisors see Surveyors in their zone
            const params = { role: 'SURVEYOR' };
            if (user.zoneId) params.zone_id = user.zoneId;

            const usersRes = await userAPI.list(params);
            setSurveyors(usersRes.data.results || usersRes.data);
        } catch (err) {
            console.error('Failed to load filters', err);
        }
    };

    const fetchSurveys = async () => {
        setLoading(true);
        try {
            const params = { zone_id: user.zoneId };
            // Zone is automatically filtered by backend based on user role
            if (selectedSurveyor) params.surveyor_id = selectedSurveyor; // Filter by specific surveyor

            if (selectedStatus === 'new') {
                params.is_new = 'true';
            } else if (selectedStatus && selectedStatus !== 'all') {
                params.status = selectedStatus.toUpperCase();
            }

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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

                    {/* Surveyor Filter */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Filter by Surveyor</label>
                        <select
                            className="form-input"
                            value={selectedSurveyor}
                            onChange={(e) => setSelectedSurveyor(e.target.value)}
                        >
                            <option value="">All Surveyors</option>
                            {surveyors.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                        </select>
                    </div>

                </div>

            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {['all', 'draft', 'submitted', 'verified', 'flagged', 'new'].map(f => (
                    <button
                        key={f}
                        className={`btn ${selectedStatus === f ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '8px 16px', minHeight: 'auto', whiteSpace: 'nowrap' }}
                        onClick={() => setSelectedStatus(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        setSelectedSurveyor('');
                        setSelectedStatus('all');
                    }}
                    style={{ marginLeft: 'auto', minHeight: 'auto' }}
                >
                    Reset
                </button>
            </div>


            {/* Survey List */}
            <div className="card">
                {loading ? (
                    <div className="text-center py-4">Loading surveys...</div>
                ) : surveys.length === 0 ? (
                    <div className="text-center py-4 text-muted">No surveys found matching criteria.</div>
                ) : (
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
                                        <div className="font-medium">{survey.surveyor_name}</div>
                                        <div className="text-sm text-muted">{survey.zone_name}</div>
                                    </td>
                                    <td>
                                        <div className="font-medium">{survey.head_name || 'N/A'}</div>
                                        <div className="text-sm text-muted">{survey.head_phone}</div>
                                    </td>
                                    <td>
                                        {survey.address_line}
                                        <div className="text-sm text-muted">{survey.pincode}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                            <span className={`badge badge-${survey.status.toLowerCase()}`}>
                                                {survey.status}
                                            </span>
                                            {survey.location_warning && (
                                                <span className="badge badge-flagged" style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '2px'
                                                }} title="GPS location mismatch">
                                                    ⚠️ <span style={{ fontSize: '0.8em' }}>GPS</span>
                                                </span>
                                            )}
                                            {survey.is_new_house && (
                                                <span className="badge badge-info" style={{ backgroundColor: '#17a2b8', color: 'white' }}>
                                                    🏠 New
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {survey.submitted_at
                                            ? new Date(survey.submitted_at).toLocaleDateString()
                                            : 'Draft'}
                                    </td>
                                    <td>
                                        {/* Use existing View/Verify route */}
                                        <Link to={`/supervisor/verify/${survey.id}`} className="btn btn-sm btn-secondary">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
                }
            </div>
        </div>
    );
}

export default SupervisorSurveyList;
