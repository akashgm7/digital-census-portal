/**
 * Verify Surveys Page for Supervisors.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { surveyAPI } from '../../services/api';

function VerifySurveys() {
    const [searchParams] = useSearchParams();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

    // Flagging State
    const [isFlagging, setIsFlagging] = useState(false);
    const [flagReason, setFlagReason] = useState('');

    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            // Fetch all relevant statuses: SUBMITTED (pending), FLAGGED (system or manual), VERIFIED (history)
            const response = await surveyAPI.list({ status: 'SUBMITTED,FLAGGED,VERIFIED' });
            setSurveys(response.data.results || response.data);
        } catch (err) {
            setError('Failed to load surveys.');
        }
        setLoading(false);
    };

    const handleVerify = (surveyId) => {
        setIsVerifying(true);
    };

    const confirmVerify = async () => {
        if (!selectedSurvey) return;

        try {
            await surveyAPI.verify(selectedSurvey.id);
            fetchSurveys();
            setSelectedSurvey(null);
            setIsVerifying(false);
            setIsFlagging(false);
            setFlagReason('');
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
            setIsVerifying(false);
        }
    };

    const handleFlagSubmit = async () => {
        if (!flagReason.trim()) {
            alert('Please enter a reason for flagging.');
            return;
        }

        try {
            await surveyAPI.flag(selectedSurvey.id, flagReason);
            fetchSurveys();
            setSelectedSurvey(null);
            setIsFlagging(false);
            setFlagReason('');
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
            setIsFlagging(false);
            setIsVerifying(false); // Reset verifying state
            setFlagReason('');
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

    // Filter Logic based on Tab
    const getFilteredSurveys = () => {
        const dashboardFilter = searchParams.get('filter'); // 'warning', 'new' from dashboard

        let filtered = surveys;

        // 1. Tab Filtering
        if (activeTab === 'pending') {
            filtered = filtered.filter(s => {
                // Pending = SUBMITTED OR (FLAGGED but NOT manually i.e. System Flagged)
                const isSystemFlag = s.status === 'FLAGGED' && !s.is_manual_flag;
                return s.status === 'SUBMITTED' || isSystemFlag;
            });
        } else {
            // History = VERIFIED OR (FLAGGED manually)
            filtered = filtered.filter(s => {
                const isManualFlag = s.status === 'FLAGGED' && s.is_manual_flag;
                return s.status === 'VERIFIED' || isManualFlag;
            });
        }

        // 2. Dashboard Query Param Filtering (only applies if relevant to the tab)
        if (dashboardFilter === 'warning') {
            filtered = filtered.filter(s => s.location_warning);
        } else if (dashboardFilter === 'new') {
            filtered = filtered.filter(s => s.is_new_house);
        }

        return filtered;
    };

    const filteredSurveys = getFilteredSurveys();

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div>
            <h2>Verify Surveys</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
                Review and verify submitted surveys. Verified surveys are locked permanently.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <button
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('pending'); setSelectedSurvey(null); }}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'pending' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        color: activeTab === 'pending' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'pending' ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Pending Verification
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('history'); setSelectedSurvey(null); }}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'history' ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    History
                </button>
            </div>

            <div className="grid grid-2">
                {/* Survey List */}
                <div className="card">
                    <h3 className="card-title">{activeTab === 'pending' ? 'Pending List' : 'History List'} ({filteredSurveys.length})</h3>
                    {filteredSurveys.length === 0 ? (
                        <p className="text-muted">No surveys found in {activeTab}.</p>
                    ) : (
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {filteredSurveys.map(survey => (
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
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                <span className={`badge badge-${survey.status.toLowerCase()}`}>
                                                    {survey.status}
                                                </span>
                                                {survey.is_new_house && (
                                                    <span className="badge badge-info" style={{ backgroundColor: '#17a2b8', color: 'white' }}>
                                                        🏠 New
                                                    </span>
                                                )}
                                                {survey.location_warning && (
                                                    <span className="badge badge-flagged">
                                                        ⚠️ GPS
                                                    </span>
                                                )}
                                                {survey.is_manual_flag && (
                                                    <span className="badge badge-flagged" style={{ backgroundColor: '#c53030' }}>
                                                        🚩 Flagged
                                                    </span>
                                                )}
                                            </div>
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

                            {selectedSurvey.is_new_house && (
                                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                                    🏠 <strong>New/Unknown House:</strong> This survey is not linked to an existing Master Address.
                                </div>
                            )}

                            {selectedSurvey.flag_reason && (
                                <div className="alert alert-error" style={{ marginBottom: '16px', backgroundColor: '#fff5f5', color: '#c53030', borderColor: '#fc8181' }}>
                                    <strong>🚩 Flag Reason:</strong> {selectedSurvey.flag_reason}
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
                                    <p><strong>Others:</strong> {selectedSurvey.other_members || 0}</p>
                                </div>
                            </div>

                            <div style={{ padding: '12px', backgroundColor: '#f7fafc', borderRadius: '8px', marginBottom: '16px', border: '1px solid #edf2f7' }}>
                                <h5 style={{ marginTop: 0, marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Economic & Housing</h5>
                                <div className="grid grid-2">
                                    <div>
                                        <p style={{ margin: '4px 0' }}><strong>Income:</strong> ₹{selectedSurvey.annual_income || '-'}</p>
                                        <p style={{ margin: '4px 0' }}><strong>Ownership:</strong> {selectedSurvey.ownership_type || '-'}</p>
                                        <p style={{ margin: '4px 0' }}><strong>Address:</strong> {selectedSurvey.address_line}</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🚰 Water:</span>
                                            <span className={`badge ${selectedSurvey.has_water_connection ? 'badge-verified' : 'badge-flagged'}`}>
                                                {selectedSurvey.has_water_connection ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🚽 Toilet:</span>
                                            <span className={`badge ${selectedSurvey.has_toilet ? 'badge-verified' : 'badge-flagged'}`}>
                                                {selectedSurvey.has_toilet ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🔥 LPG:</span>
                                            <span className={`badge ${selectedSurvey.has_lpg ? 'badge-verified' : 'badge-flagged'}`}>
                                                {selectedSurvey.has_lpg ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>💡 Electricity:</span>
                                            <span className={`badge ${selectedSurvey.has_electricity ? 'badge-verified' : 'badge-flagged'}`}>
                                                {selectedSurvey.has_electricity ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {selectedSurvey.remarks && (
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #e2e8f0' }}>
                                        <strong>Remarks:</strong> {selectedSurvey.remarks}
                                    </div>
                                )}
                            </div>

                            <p><strong>Surveyor:</strong> {selectedSurvey.surveyor_name}</p>
                            <p><strong>Submitted:</strong> {selectedSurvey.submitted_at ? new Date(selectedSurvey.submitted_at).toLocaleString() : 'N/A'}</p>

                            {/* Actions - Only show if in Pending Tab (activeTab === 'pending') OR if we want to allow re-flagging history?
                                Requirements said: "move out from pending surveys to History list".
                                Implies History is read-only or final state.
                                But manually flagged surveys in History might be re-verified if the surveyor fixes them and re-submits (Status becomes SUBMITTED again -> moves to Pending).
                                So effectively, History items are "Done" for now.
                            */}
                            {activeTab === 'pending' && (
                                <div style={{ marginTop: '24px' }}>
                                    {!isFlagging && !isVerifying ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleVerify(selectedSurvey.id)}
                                                style={{ flex: '1 1 auto' }}
                                            >
                                                ✓ Verify & Lock
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => setIsFlagging(true)}
                                                style={{ flex: '1 1 auto' }}
                                            >
                                                ⚠ Flag for Review
                                            </button>
                                        </div>
                                    ) : isVerifying ? (
                                        <div className="card" style={{ backgroundColor: '#f0fff4', border: '1px solid #48bb78', marginTop: '12px' }}>
                                            <h4 style={{ color: '#2f855a', marginTop: 0 }}>Confirm Verification</h4>
                                            <p style={{ marginBottom: '16px' }}>
                                                Are you sure you want to verify and lock this survey?
                                                <br />
                                                <small className="text-muted">This action cannot be undone.</small>
                                            </p>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => setIsVerifying(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn btn-success"
                                                    onClick={confirmVerify}
                                                >
                                                    Confirm Verify
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="card" style={{ backgroundColor: '#fff5f5', border: '1px solid #fc8181', marginTop: '12px' }}>
                                            <h4 style={{ color: '#c53030', marginTop: 0 }}>Flag for Review</h4>
                                            <div className="form-group">
                                                <label className="form-label">Reason for Flagging:</label>
                                                <textarea
                                                    className="form-input"
                                                    rows="3"
                                                    value={flagReason}
                                                    onChange={(e) => setFlagReason(e.target.value)}
                                                    placeholder="e.g., Incorrect address, Missing members..."
                                                ></textarea>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => {
                                                        setIsFlagging(false);
                                                        setFlagReason('');
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={handleFlagSubmit}
                                                >
                                                    Submit Flag
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
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
