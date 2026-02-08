/**
 * Survey History Page for Surveyors.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { surveyAPI } from '../../services/api';

function SurveyHistory() {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            const response = await surveyAPI.getHistory();
            setSurveys(response.data.results || response.data);
        } catch (err) {
            setError('Failed to load survey history.');
        }
        setLoading(false);
    };

    const filteredSurveys = surveys.filter(s => {
        if (filter === 'all') return true;
        return s.status.toLowerCase() === filter;
    });

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div>
            <h2>Survey History</h2>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                {['all', 'draft', 'submitted', 'verified', 'flagged'].map(f => (
                    <button
                        key={f}
                        className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '8px 16px', minHeight: 'auto' }}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="card">
                {filteredSurveys.length === 0 ? (
                    <p className="text-muted">No surveys found.</p>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Head of Household</th>
                                    <th>Address</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSurveys.map(survey => (
                                    <tr key={survey.id}>
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
                                        </td>
                                        <td>
                                            {survey.submitted_at
                                                ? new Date(survey.submitted_at).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td>
                                            {survey.status === 'DRAFT' ? (
                                                <Link
                                                    to={`/surveyor/survey/${survey.id}`}
                                                    className="btn btn-primary"
                                                    style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto' }}
                                                >
                                                    Continue
                                                </Link>
                                            ) : survey.status === 'SUBMITTED' || survey.status === 'FLAGGED' ? (
                                                <Link
                                                    to={`/surveyor/survey/${survey.id}`}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto' }}
                                                >
                                                    Edit
                                                </Link>
                                            ) : (
                                                <span className="text-muted">Locked</span>
                                            )}
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

export default SurveyHistory;
