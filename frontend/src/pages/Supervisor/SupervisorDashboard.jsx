/**
 * Supervisor Dashboard - Zone-restricted view.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function SupervisorDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await analyticsAPI.getSupervisorDashboard();
            setData(response.data);
        } catch (err) {
            setError('Failed to load dashboard data.');
        }
        setLoading(false);
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
    if (error) return <div className="alert alert-error">{error}</div>;

    return (
        <div>
            <h2>Supervisor Dashboard</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
                Zone: <strong>{data?.zone?.name}</strong> ({data?.zone?.code})
            </p>

            {/* Overview Cards */}
            <div className="grid grid-4" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-value">{data?.overview?.total || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {data?.overview?.submitted || 0}
                    </div>
                    <div className="stat-label">Pending Verification</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.overview?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.overview?.location_warnings || 0}
                    </div>
                    <div className="stat-label">Location Warnings</div>
                </div>
            </div>

            {/* Velocity Graph */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 className="card-title">Daily Submissions (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data?.velocity || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Surveyors in Zone */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 className="card-title">Surveyors in Zone</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Daily Target</th>
                                <th>Surveys Completed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.surveyors || []).map(s => (
                                <tr key={s.id}>
                                    <td>{s.full_name}</td>
                                    <td>{s.phone_number}</td>
                                    <td>{s.daily_target}</td>
                                    <td>{s.survey_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="card">
                <h3 className="card-title">Today's Zone Leaderboard</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Surveyor</th>
                                <th>Completed</th>
                                <th>Target</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.leaderboard || []).map((entry, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{entry.surveyor_name}</td>
                                    <td>{entry.completed}</td>
                                    <td>{entry.target}</td>
                                    <td>
                                        <div className="progress-container" style={{ width: '100px' }}>
                                            <div
                                                className={`progress-bar ${entry.percentage >= 100 ? 'complete' : ''}`}
                                                style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default SupervisorDashboard;
