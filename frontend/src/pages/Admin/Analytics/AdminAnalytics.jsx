import React, { useState, useEffect } from 'react';
import { analyticsAPI, zoneAPI, userAPI } from '../../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [zones, setZones] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [filters, setFilters] = useState({
        zone_id: '',
        supervisor_id: ''
    });

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [filters]);

    const fetchMetadata = async () => {
        try {
            const [zonesRes, usersRes] = await Promise.all([
                zoneAPI.list(),
                userAPI.list({ role: 'SUPERVISOR' }) // Assuming userAPI.list supports role filtering
            ]);
            setZones(zonesRes.data.results || zonesRes.data);
            setSupervisors(usersRes.data.results || usersRes.data);
        } catch (error) {
            console.error("Failed to fetch metadata", error);
        }
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await analyticsAPI.getAdminDashboard(filters);
            setData(response.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetFilters = () => {
        setFilters({ zone_id: '', supervisor_id: '' });
    };

    if (loading && !data) return <div className="loading-container"><div className="spinner"></div></div>;
    if (!data) return <div>No Data Available</div>;

    // Prepare Pie Chart Data
    const pieData = [
        { name: 'Submitted', value: data.overview.submitted },
        { name: 'Verified', value: data.overview.verified },
        { name: 'Flagged', value: data.overview.flagged },
        { name: 'Drafts', value: data.overview.drafts },
    ].filter(item => item.value > 0);

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

                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Supervisor</label>
                        <select
                            className="form-input"
                            name="supervisor_id"
                            value={filters.supervisor_id}
                            onChange={handleFilterChange}
                        >
                            <option value="">All Supervisors</option>
                            {supervisors.map(sup => (
                                <option key={sup.id} value={sup.id}>{sup.full_name}</option>
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
                <div className="stat-card">
                    <div className="stat-value">{data?.overview?.total_surveys || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {data?.overview?.submitted || 0}
                    </div>
                    <div className="stat-label">Submitted</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.overview?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.overview?.flagged || 0}
                    </div>
                    <div className="stat-label">Flagged</div>
                </div>
                <div className="stat-card">
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
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Submission Velocity (Last 7 Days)</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.velocity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="var(--color-primary)" name="Surveys" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="card">
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Top Surveyors (Today)</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Name</th>
                                <th style={{ textAlign: 'left' }}>Zone</th>
                                <th style={{ textAlign: 'center' }}>Completed</th>
                                <th style={{ textAlign: 'center' }}>Target</th>
                                <th style={{ textAlign: 'left' }}>Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.leaderboard.length > 0 ? (
                                data.leaderboard.map((surveyor, index) => (
                                    <tr key={index}>
                                        <td style={{ textAlign: 'left' }}>{surveyor.surveyor_name}</td>
                                        <td style={{ textAlign: 'left' }}>{surveyor.zone_name}</td>
                                        <td style={{ textAlign: 'center' }}>{surveyor.completed}</td>
                                        <td style={{ textAlign: 'center' }}>{surveyor.target}</td>
                                        <td>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                color: surveyor.percentage >= 100 ? 'var(--color-success)' : 'inherit'
                                            }}>
                                                <div className="progress-bar" style={{ width: '100px', height: '8px' }}>
                                                    <div
                                                        className="progress-fill"
                                                        style={{
                                                            width: `${Math.min(surveyor.percentage, 100)}%`,
                                                            backgroundColor: surveyor.percentage >= 100 ? 'var(--color-success)' : 'var(--color-primary)'
                                                        }}
                                                    ></div>
                                                </div>
                                                {surveyor.percentage}%
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        No active surveyors today
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
