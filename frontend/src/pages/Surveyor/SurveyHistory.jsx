import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { surveyAPI } from '../../services/api';
import ConfirmationModal from '../../components/ConfirmationModal';
import MessageModal from '../../components/MessageModal';

function SurveyHistory() {
    const location = useLocation();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    // Modal states
    const [deleteId, setDeleteId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [messageModal, setMessageModal] = useState({ show: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const filterParam = queryParams.get('filter');
        if (filterParam) {
            setFilter(filterParam);
        }
        fetchSurveys();
    }, [location.search]);

    const fetchSurveys = async () => {
        try {
            const response = await surveyAPI.getHistory();
            setSurveys(response.data.results || response.data);
        } catch (err) {
            setError('Failed to load survey history.');
        }
        setLoading(false);
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            await surveyAPI.delete(deleteId);
            setSurveys(surveys.filter(s => s.id !== deleteId));
            setMessageModal({ show: true, title: 'Success', message: 'Survey deleted successfully.', type: 'success' });
        } catch (err) {
            console.error(err);
            setMessageModal({ show: true, title: 'Error', message: 'Failed to delete survey.', type: 'error' });
        } finally {
            setShowDeleteModal(false);
            setDeleteId(null);
        }
    };

    const filteredSurveys = surveys.filter(s => {
        if (filter === 'all') return true;
        if (filter === 'new') return s.is_new_house;
        return s.status.toLowerCase() === filter;
    });

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div>
            <h2>Survey History</h2>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                {['all', 'draft', 'submitted', 'verified', 'flagged', 'new'].map(f => (
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
                                                <span className="badge badge-flagged" style={{
                                                    marginLeft: '4px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '2px'
                                                }} title="GPS location mismatch">
                                                    ⚠️ <span style={{ fontSize: '0.8em' }}>GPS</span>
                                                </span>
                                            )}
                                            {survey.is_new_house && (
                                                <span className="badge badge-info" style={{ marginLeft: '4px', backgroundColor: '#17a2b8', color: 'white' }}>
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
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

                                                {survey.status !== 'VERIFIED' && (
                                                    <button
                                                        onClick={() => handleDeleteClick(survey.id)}
                                                        className="btn"
                                                        style={{
                                                            padding: '4px 12px',
                                                            minHeight: 'auto',
                                                            minWidth: 'auto',
                                                            backgroundColor: '#dc3545',
                                                            color: 'white',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Delete Survey"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Custom Modals */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                title="Delete Survey"
                message="Are you sure you want to delete this survey? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
                confirmText="Delete"
                cancelText="Cancel"
                type="error"
            />

            <MessageModal
                isOpen={messageModal.show}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
                onClose={() => setMessageModal({ ...messageModal, show: false })}
            />
        </div>
    );
}

export default SurveyHistory;
