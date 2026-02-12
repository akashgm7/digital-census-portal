import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, zoneAPI } from '../../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function AdminAnalytics() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [zones, setZones] = useState([]);
    const [filters, setFilters] = useState({
        zone_id: ''
    });

    const [velocityTimeframe, setVelocityTimeframe] = useState('week'); // 'today', 'week', 'month', 'overall'
    const [graphStatus, setGraphStatus] = useState('all');

    // Leaderboard State
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [leaderboardType, setLeaderboardType] = useState('surveyor'); // 'surveyor' | 'supervisor'
    const [leaderboardTimeframe, setLeaderboardTimeframe] = useState('today'); // 'today', 'week', 'month', 'overall'
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    const [error, setError] = useState('');

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetFilters = () => {
        setFilters({ zone_id: '' });
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [filters, velocityTimeframe]);

    // Fetch Leaderboard when filters change
    useEffect(() => {
        fetchLeaderboard();
    }, [leaderboardType, leaderboardTimeframe, filters.zone_id]);

    const fetchMetadata = async () => {
        try {
            const zonesRes = await zoneAPI.list();
            setZones(zonesRes.data);
        } catch (err) {
            console.error("Failed to fetch metadata", err);
        }
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');
        try {
            // Map timeframe to days
            let days = 7;
            if (velocityTimeframe === 'today') days = 1;
            if (velocityTimeframe === 'month') days = 30;
            if (velocityTimeframe === 'overall') days = 90; // Cap at 90 for daily breakdown

            const response = await analyticsAPI.getAdminDashboard({ ...filters, days });
            setData(response.data);
        } catch (err) {
            console.error("Failed to fetch analytics", err);
            const msg = err.response
                ? `Status: ${err.response.status}`
                : err.message;
            setError('Failed to fetch analytics: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    // ... fetchLeaderboard ...
    const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
            const response = await analyticsAPI.getLeaderboard({
                type: leaderboardType,
                timeframe: leaderboardTimeframe,
                zone_id: filters.zone_id
            });
            setLeaderboardData(response.data);
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    if (loading && !data) return <div className="loading-container"><div className="spinner"></div></div>;
    if (error) return <div className="alert alert-error">{error}</div>;
    if (!data) return <div>No Data Available</div>;

    // Prepare Pie Chart Data
    const pieData = [
        { name: 'Submitted', value: data.overview.submitted },
        { name: 'Verified', value: data.overview.verified },
        { name: 'Flagged', value: data.overview.flagged },
        { name: 'Drafts', value: data.overview.drafts },
    ].filter(item => item.value > 0);

    const handleCardClick = (status) => {
        if (status === 'ALL') navigate('/admin/surveys');
        else navigate(`/admin/surveys?status=${status}`);
    };

    return (
        <div className="analytics-dashboard">
            <h1 className="title">Analytics Dashboard</h1>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Zone</label>
                        <select
                            className="form-input"
                            name="zone_id"
                            value={filters.zone_id}
                            onChange={handleFilterChange}
                        >
                            <option value="">All Zones</option>
                            {zones.map(zone => (
                                <option key={zone.id} value={zone.id}>{zone.name}</option>
                            ))}
                        </select>
                    </div>

                    <button className="btn btn-secondary" onClick={resetFilters}>
                        Reset
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-5" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="stat-card" onClick={() => handleCardClick('ALL')} style={{ cursor: 'pointer' }}>
                    <div className="stat-value">{data?.overview?.total_surveys || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </div>
                <div className="stat-card" onClick={() => handleCardClick('SUBMITTED')} style={{ cursor: 'pointer' }}>
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {data?.overview?.submitted || 0}
                    </div>
                    <div className="stat-label">Submitted</div>
                </div>
                <div className="stat-card" onClick={() => handleCardClick('VERIFIED')} style={{ cursor: 'pointer' }}>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.overview?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </div>
                <div className="stat-card" onClick={() => handleCardClick('FLAGGED')} style={{ cursor: 'pointer' }}>
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.overview?.flagged || 0}
                    </div>
                    <div className="stat-label">Flagged</div>
                </div>
                <div className="stat-card" onClick={() => handleCardClick('NEW')} style={{ cursor: 'pointer' }}>
                    <div className="stat-value" style={{ color: '#e74c3c' }}>
                        {data?.overview?.new_houses || 0}
                    </div>
                    <div className="stat-label">New Houses</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Survey Status Distribution</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <h3 style={{ margin: 0 }}>Survey Status Trend</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <button
                                    className={`btn btn-sm ${graphStatus === 'all' ? 'btn-primary' : ''}`}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 0, backgroundColor: graphStatus === 'all' ? 'var(--color-primary)' : 'white', color: graphStatus === 'all' ? 'white' : 'var(--color-text)' }}
                                    onClick={() => setGraphStatus('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`btn btn-sm ${graphStatus === 'submitted' ? 'btn-primary' : ''}`}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 0, backgroundColor: graphStatus === 'submitted' ? '#FFBB28' : 'white', color: graphStatus === 'submitted' ? 'white' : 'var(--color-text)' }}
                                    onClick={() => setGraphStatus('submitted')}
                                >
                                    Submitted
                                </button>
                                <button
                                    className={`btn btn-sm ${graphStatus === 'verified' ? 'btn-primary' : ''}`}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 0, backgroundColor: graphStatus === 'verified' ? '#00C49F' : 'white', color: graphStatus === 'verified' ? 'white' : 'var(--color-text)' }}
                                    onClick={() => setGraphStatus('verified')}
                                >
                                    Verified
                                </button>
                                <button
                                    className={`btn btn-sm ${graphStatus === 'flagged' ? 'btn-primary' : ''}`}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 0, backgroundColor: graphStatus === 'flagged' ? '#FF8042' : 'white', color: graphStatus === 'flagged' ? 'white' : 'var(--color-text)' }}
                                    onClick={() => setGraphStatus('flagged')}
                                >
                                    Flagged
                                </button>
                            </div>
                            <select
                                className="form-input"
                                style={{ width: 'auto', padding: '4px', fontSize: '0.9rem' }}
                                value={velocityTimeframe}
                                onChange={(e) => setVelocityTimeframe(e.target.value)}
                            >
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="overall">Overall</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.velocity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(label) => new Date(label).toDateString()}
                                    formatter={(value, name) => [value, name]}
                                />
                                {(graphStatus === 'all' || graphStatus === 'verified') && <Bar dataKey="verified" stackId="a" fill="#00C49F" name="Verified" />}
                                {(graphStatus === 'all' || graphStatus === 'submitted') && <Bar dataKey="submitted" stackId="a" fill="#FFBB28" name="Submitted" />}
                                {(graphStatus === 'all' || graphStatus === 'flagged') && <Bar dataKey="flagged" stackId="a" fill="#FF8042" name="Flagged" />}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Zone Intensity Heatmap */}
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Zone Survey Intensity</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                    {data.zones.map((zone) => {
                        // Calculate intensity (0-1) based on max survey count
                        const maxSurveys = Math.max(...data.zones.map(z => z.survey_count), 1);
                        const intensity = zone.survey_count / maxSurveys;
                        // Color from light blue #e0f2fe to dark blue #0284c7 essentially
                        const opacity = 0.2 + (intensity * 0.8);

                        return (
                            <div
                                key={zone.id}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: `rgba(2, 132, 199, ${opacity})`,
                                    color: intensity > 0.6 ? 'white' : 'var(--color-text-primary)',
                                    textAlign: 'center',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '0.9rem'
                                }}
                                title={`${zone.name}: ${zone.survey_count} surveys`}
                            >
                                <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zone.name}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{zone.survey_count}</div>
                            </div>
                        );
                    })}
                    {data.zones.length === 0 && <div className="text-muted">No zones data available</div>}
                </div>
            </div>

            {/* Leaderboard */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h3>Top Performers</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="tabs">
                            <button
                                className={`btn ${leaderboardType === 'surveyor' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setLeaderboardType('surveyor')}
                                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                            >
                                Surveyors
                            </button>
                            <button
                                className={`btn ${leaderboardType === 'supervisor' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setLeaderboardType('supervisor')}
                                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                            >
                                Supervisors
                            </button>
                        </div>
                        <select
                            className="form-input"
                            style={{ width: '120px', padding: '4px', fontSize: '0.9rem' }}
                            value={leaderboardTimeframe}
                            onChange={(e) => setLeaderboardTimeframe(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="overall">Overall</option>
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Name</th>
                                <th style={{ textAlign: 'left' }}>Zone</th>
                                {leaderboardType === 'surveyor' ? (
                                    <>
                                        <th style={{ textAlign: 'center' }}>Completed</th>
                                        <th style={{ textAlign: 'center' }}>Target (Daily)</th>
                                        <th style={{ textAlign: 'left' }}>% Achieved</th>
                                    </>
                                ) : (
                                    <>
                                        <th style={{ textAlign: 'center' }}>Verified</th>
                                        <th style={{ textAlign: 'center' }}>Total Submitted</th>
                                        <th style={{ textAlign: 'left' }}>Performance Score</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboardLoading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td></tr>
                            ) : leaderboardData.length > 0 ? (
                                leaderboardData.map((item, index) => (
                                    <tr key={index}>
                                        <td style={{ textAlign: 'left' }}>{item.surveyor_name || item.name}</td>
                                        <td style={{ textAlign: 'left' }}>{item.zone_name}</td>
                                        {leaderboardType === 'surveyor' ? (
                                            <>
                                                <td style={{ textAlign: 'center' }}>{item.completed}</td>
                                                <td style={{ textAlign: 'center' }}>{item.target}</td>
                                                <td>
                                                    {leaderboardTimeframe === 'today' ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: item.percentage >= 100 ? 'var(--color-success)' : 'inherit' }}>
                                                            <div className="progress-bar" style={{ width: '100px', height: '8px' }}>
                                                                <div className="progress-fill" style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.percentage >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }}></div>
                                                            </div>
                                                            {item.percentage}%
                                                        </div>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ textAlign: 'center' }}>{item.verified}</td>
                                                <td style={{ textAlign: 'center' }}>{item.submitted}</td>
                                                <td>{item.score}</td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        No data available for this selection
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

export default AdminAnalytics;
