/**
 * Verify Surveys Page for Supervisors.
 */
import React, { useState, useEffect } from 'react';
import { surveyAPI } from '../../services/api';

function VerifySurveys() {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedSurvey, setSelectedSurvey] = useState(null);

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            // Fetch both SUBMITTED and FLAGGED (for new houses)
            const response = await surveyAPI.list({ status: 'SUBMITTED,FLAGGED' });
            setSurveys(response.data.results || response.data);
        } catch (err) {
            setError('Failed to load surveys.');
        }
        setLoading(false);
    };

    const handleVerify = async (surveyId) => {
        if (!window.confirm('Are you sure you want to verify and lock this survey? This action cannot be undone.')) {
            return;
        }

        try {
            await surveyAPI.verify(surveyId);
            fetchSurveys();
            setSelectedSurvey(null);
        } catch (err) {
            // Extract detailed error
            let errorMessage = 'Failed to verify survey.';
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        }
    };

    const handleFlag = async (surveyId, reason) => {
        try {
            await surveyAPI.flag(surveyId, reason);
            fetchSurveys();
            setSelectedSurvey(null);
        } catch (err) {
            let errorMessage = 'Failed to flag survey.';
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        }
    };

    const viewDetails = async (surveyId) => {
        try {
            const response = await surveyAPI.get(surveyId);
            setSelectedSurvey(response.data);
            // Scroll to details on mobile
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    document.getElementById('survey-details')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (err) {
            setError('Failed to load survey details.');
        }
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div>
            <h2>Verify Surveys</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
                Review and verify submitted surveys. Verified surveys are locked permanently.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid grid-2">
                {/* Survey List */}
                <div className="card">
                    <h3 className="card-title">Pending Verification ({surveys.length})</h3>
                    {surveys.length === 0 ? (
                        <p className="text-muted">No surveys pending verification.</p>
                    ) : (
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {surveys.map(survey => (
                                <div
                                    key={survey.id}
                                    style={{
                                        padding: '12px',
                                        borderBottom: '1px solid var(--color-border)',
                                        cursor: 'pointer',
                                        backgroundColor: selectedSurvey?.id === survey.id ? 'var(--color-background)' : 'transparent'
                                    }}
                                    onClick={() => viewDetails(survey.id)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{survey.head_name}</strong>
                                            <br />
                                            <span className="text-muted">{survey.pincode} • {survey.total_members} members</span>
                                        </div>
                                        <div>
                                            {!survey.address && survey.status === 'FLAGGED' && (
                                                <span className="badge badge-flagged" style={{ marginRight: '8px', backgroundColor: '#e74c3c' }}>🏠 New</span>
                                            )}
                                            {survey.location_warning && (
                                                <span className="badge badge-flagged" style={{ marginRight: '8px' }}>⚠️ GPS</span>
                                            )}
                                            <span className="badge badge-submitted">Submitted</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Survey Details */}
                <div className="card" id="survey-details">
                    <h3 className="card-title">Survey Details</h3>
                    {selectedSurvey ? (
                        <div>
                            <h4>{selectedSurvey.head_name}</h4>

                            {selectedSurvey.location_warning && (
                                <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                                    ⚠️ Survey submitted from outside designated zone area.
                                </div>
                            )}

                            {!selectedSurvey.address && (
                                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                                    🏠 <strong>New/Unknown House:</strong> This survey is not linked to an existing Master Address.
                                </div>
                            )}

                            <div className="grid grid-2" style={{ marginBottom: '16px' }}>
                                <div>
                                    <p><strong>Phone:</strong> {selectedSurvey.head_phone || '-'}</p>
                                    <p><strong>Age:</strong> {selectedSurvey.head_age}</p>
                                    <p><strong>Gender:</strong> {selectedSurvey.head_gender}</p>
                                    <p><strong>Occupation:</strong> {selectedSurvey.head_occupation || '-'}</p>
                                </div>
                                <div>
                                    <p><strong>Total Members:</strong> {selectedSurvey.total_members}</p>
                                    <p><strong>Male:</strong> {selectedSurvey.male_members}</p>
                                    <p><strong>Female:</strong> {selectedSurvey.female_members}</p>
                                    <p><strong>Address:</strong> {selectedSurvey.address_line}</p>
                                </div>
                            </div>

                            <p><strong>Surveyor:</strong> {selectedSurvey.surveyor_name}</p>
                            <p><strong>Submitted:</strong> {new Date(selectedSurvey.submitted_at).toLocaleString()}</p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
                                <button
                                    className="btn btn-success"
                                    onClick={() => handleVerify(selectedSurvey.id)}
                                    style={{ flex: '1 1 auto' }}
                                >
                                    ✓ Verify & Lock
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        const reason = prompt('Enter reason for flagging:');
                                        if (reason !== null && reason.trim() !== '') {
                                            handleFlag(selectedSurvey.id, reason);
                                        }
                                    }}
                                    style={{ flex: '1 1 auto' }}
                                >
                                    ⚠ Flag for Review
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted">Select a survey to view details.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VerifySurveys;
