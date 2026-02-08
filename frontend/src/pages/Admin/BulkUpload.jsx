/**
 * Bulk Upload Page for Admin CSV user import.
 */
import React, { useState } from 'react';
import { userAPI } from '../../services/api';

function BulkUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setError('');
        } else {
            setError('Please select a CSV file.');
            setFile(null);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await userAPI.bulkUpload(file);
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed.');
        }

        setLoading(false);
    };

    return (
        <div>
            <h2>Bulk User Upload</h2>

            <div className="card" style={{ marginBottom: '24px' }}>
                <h3>CSV Format</h3>
                <p>Upload a CSV file with the following columns:</p>
                <code style={{
                    display: 'block',
                    padding: '16px',
                    backgroundColor: 'var(--color-background)',
                    borderRadius: '4px',
                    marginBottom: '16px'
                }}>
                    Full Name,Phone Number,Role,Zone Code,Daily Target
                </code>
                <p className="text-muted">Example:</p>
                <code style={{
                    display: 'block',
                    padding: '16px',
                    backgroundColor: 'var(--color-background)',
                    borderRadius: '4px'
                }}>
                    John Doe,9876543210,SURVEYOR,BLR-N,10<br />
                    Jane Smith,9876543211,SUPERVISOR,BLR-S,50
                </code>
            </div>

            <div className="card">
                <h3>Upload File</h3>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleUpload}>
                    <div className="form-group">
                        <label className="form-label">Select CSV File</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="form-input"
                            style={{ padding: '12px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!file || loading}
                    >
                        {loading ? 'Uploading...' : 'Upload and Process'}
                    </button>
                </form>
            </div>

            {result && (
                <div className="card" style={{ marginTop: '24px' }}>
                    <h3>Upload Results</h3>

                    <div className="grid grid-3" style={{ marginBottom: '16px' }}>
                        <div className="stat-card">
                            <div className="stat-value">{result.total_rows}</div>
                            <div className="stat-label">Total Rows</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                                {result.successful}
                            </div>
                            <div className="stat-label">Successful</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                                {result.failed}
                            </div>
                            <div className="stat-label">Failed</div>
                        </div>
                    </div>

                    {result.errors && result.errors.length > 0 && (
                        <>
                            <h4>Errors</h4>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Row</th>
                                            <th>Data</th>
                                            <th>Errors</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.errors.map((err, index) => (
                                            <tr key={index}>
                                                <td>{err.row}</td>
                                                <td><code>{JSON.stringify(err.data)}</code></td>
                                                <td className="text-error">{err.errors.join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default BulkUpload;
