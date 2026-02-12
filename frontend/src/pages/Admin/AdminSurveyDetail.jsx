import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { surveyAPI } from '../../services/api';

function AdminSurveyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [survey, setSurvey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSurvey = async () => {
            try {
                const response = await surveyAPI.get(id);
                setSurvey(response.data);
            } catch (err) {
                setError('Failed to load survey details');
                console.error(err);
            }
            setLoading(false);
        };
        fetchSurvey();
    }, [id]);

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
    if (error) return <div className="alert alert-error">{error}</div>;
    if (!survey) return <div className="alert alert-info">Survey not found</div>;

    const familyMembers = survey.family_members || {};

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Survey Details</h2>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
            </div>

            <div className="status-bar" style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                <strong>Status:</strong> <span className={`badge badge-${survey.status.toLowerCase()}`}>{survey.status}</span>
                <span style={{ margin: '0 10px' }}>|</span>
                <strong>Surveyor:</strong> {survey.surveyor_name} ({survey.surveyor_phone})
                <span style={{ margin: '0 10px' }}>|</span>
                <strong>Zone:</strong> {survey.zone_name}
                <span style={{ margin: '0 10px' }}>|</span>
                <strong>Submitted:</strong> {new Date(survey.submitted_at).toLocaleString()}
                {survey.location_warning && <span className="badge badge-flagged" style={{ marginLeft: '10px' }}>⚠️ GPS Warning</span>}
            </div>

            <div className="grid grid-2" style={{ gap: '20px' }}>
                <div>
                    <h3>Head of Family</h3>
                    <table className="table table-bordered">
                        <tbody>
                            <tr><th>Name</th><td>{survey.head_name}</td></tr>
                            <tr><th>Age</th><td>{survey.head_age}</td></tr>
                            <tr><th>Gender</th><td>{survey.head_gender}</td></tr>
                            <tr><th>Phone</th><td>{survey.head_phone}</td></tr>
                            <tr><th>Occupation</th><td>{survey.head_occupation}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div>
                    <h3>Address</h3>
                    <table className="table table-bordered">
                        <tbody>
                            <tr><th>Address Line</th><td>{survey.address_line}</td></tr>
                            <tr><th>Pincode</th><td>{survey.pincode}</td></tr>
                            <tr><th>New House</th><td>{survey.is_new_house ? 'Yes' : 'No'}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <h3>Family Members</h3>
            <table className="table table-bordered">
                <tbody>
                    <tr><th>Total Members</th><td>{survey.total_members}</td></tr>
                    <tr><th>Male</th><td>{survey.male_members}</td></tr>
                    <tr><th>Female</th><td>{survey.female_members}</td></tr>
                    <tr><th>Children (&lt;5)</th><td>{familyMembers.children_under_5 || 0}</td></tr>
                    <tr><th>Children (5-18)</th><td>{familyMembers.children_5_to_18 || 0}</td></tr>
                    <tr><th>Senior Citizens</th><td>{familyMembers.senior_citizens || 0}</td></tr>
                </tbody>
            </table>

            <h3>Economic & Amenities</h3>
            <table className="table table-bordered">
                <tbody>
                    <tr><th>Annual Income</th><td>{familyMembers.annual_income || '-'}</td></tr>
                    <tr><th>Ownership Type</th><td>{familyMembers.ownership_type || '-'}</td></tr>
                    <tr><th>Water Connection</th><td>{familyMembers.has_water_connection ? 'Yes' : 'No'}</td></tr>
                    <tr><th>Toilet</th><td>{familyMembers.has_toilet ? 'Yes' : 'No'}</td></tr>
                    <tr><th>LPG Connection</th><td>{familyMembers.has_lpg ? 'Yes' : 'No'}</td></tr>
                    <tr><th>Electricity</th><td>{familyMembers.has_electricity ? 'Yes' : 'No'}</td></tr>
                </tbody>
            </table>
        </div>
    );
}

export default AdminSurveyDetail;
