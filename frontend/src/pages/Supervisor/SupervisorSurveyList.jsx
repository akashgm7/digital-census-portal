/**
 * Supervisor Survey List - View and filter surveys in their zone.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { surveyAPI, userAPI } from '../../services/api';

function SupervisorSurveyList() {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [surveyors, setSurveyors] = useState([]);
    const [selectedSurveyor, setSelectedSurveyor] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchSurveys();
    }, [selectedSurveyor, selectedStatus]);

    const fetchInitialData = async () => {
        try {
            // Supervisors see Surveyors in their zone
            const usersRes = await userAPI.list({ role: 'SURVEYOR' });
            setSurveyors(usersRes.data.results || usersRes.data);
        } catch (err) {
            console.error('Failed to load filters', err);
        }
    };

    const fetchSurveys = async () => {
        setLoading(true);
        try {
            const params = {};
            // Zone is automatically filtered by backend based on user role
            if (selectedSurveyor) params.surveyor = selectedSurveyor; // Filter by specific surveyor
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
                            <option value="FLAGGED">Flagged</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'end' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setSelectedSurveyor('');
                                setSelectedStatus('');
                            }}
                            style={{ width: '100%' }}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
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
                                        <span className={`badge badge-${survey.status.toLowerCase()}`}>
                                            {survey.status}
                                        </span>
                                        {survey.location_warning && (
                                            <span className="badge badge-flagged" style={{ marginLeft: '4px' }}>
                                                ⚠️ GPS
                                            </span>
                                        )}
                                        {/* New House Badge Logic: !address && status === 'FLAGGED' */}
                                        {!survey.address && survey.status === 'FLAGGED' && (
                                            <span className="badge badge-flagged" style={{ marginLeft: '4px', backgroundColor: '#e74c3c' }}>
                                                🏠 New
                                            </span>
                                        )}
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
                )}
            </div>
        </div>
    );
}

export default SupervisorSurveyList;
