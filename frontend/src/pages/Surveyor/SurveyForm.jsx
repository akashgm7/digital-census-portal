/**
 * Multi-step Survey Form with auto-save and GPS capture.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { surveyAPI, addressAPI } from '../../services/api';
import { createAutoSave, getDraftsForSurveyor } from '../../services/indexedDB';
import useGeolocation from '../../hooks/useGeolocation';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const STEPS = [
    { id: 1, name: 'Address' },
    { id: 2, name: 'Household Head' },
    { id: 3, name: 'Members' },
    { id: 4, name: 'Review & Submit' }
];

const initialFormData = {
    // Address
    address_line: '',
    pincode: '',
    landmark: '',
    // Household Head
    head_name: '',
    head_age: '',
    head_gender: '',
    head_phone: '',
    head_occupation: '',
    head_education: '',
    // Members (matching backend model field names)
    total_members: 1,
    male_members: 1,
    female_members: 0,
    other_members: 0,
    children_under_5: 0,
    children_5_to_18: 0,
    senior_citizens: 0,
    // Additional (matching backend model)
    annual_income: '',
    ownership_type: '',
    has_water_connection: false,
    has_toilet: false,
    has_lpg: false,
    has_electricity: true,
    // Notes
    remarks: ''
};

function SurveyForm() {
    const { id: surveyId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isOnline = useOnlineStatus();
    const { position, loading: gpsLoading, error: gpsError, getPosition } = useGeolocation();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(initialFormData);
    const [masterAddresses, setMasterAddresses] = useState([]);
    const [isNewAddress, setIsNewAddress] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [pincodeValid, setPincodeValid] = useState(null);
    const [draftId, setDraftId] = useState(null);

    // Auto-save handler
    const autoSave = useCallback(() => {
        if (!user?.id) return null;
        return createAutoSave(user.id, (draft) => {
            setDraftId(draft.id);
            setSaving(true);
            setTimeout(() => setSaving(false), 1000);
        });
    }, [user?.id]);

    const [autoSaveHandler] = useState(autoSave);

    // Load existing survey or draft
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            if (surveyId) {
                // Load existing survey from API
                try {
                    const response = await surveyAPI.get(surveyId);
                    setFormData(response.data);
                    // If existing survey has address_id, we might want to load it contextually
                    // but simplify for now
                } catch (err) {
                    setError('Failed to load survey.');
                }
            } else if (autoSaveHandler) {
                // Check for existing drafts
                const draft = await autoSaveHandler.loadDraft();
                if (draft?.formData) {
                    setFormData(draft.formData);
                    setStep(draft.currentStep || 1);
                    setDraftId(draft.id);
                }
            }

            setLoading(false);
        };

        loadData();
    }, [surveyId, autoSaveHandler]);

    // Start auto-save interval
    useEffect(() => {
        if (!autoSaveHandler || surveyId) return;

        autoSaveHandler.startAutoSave(
            () => formData,
            () => step
        );

        return () => autoSaveHandler.stopAutoSave();
    }, [autoSaveHandler, formData, step, surveyId]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({ ...prev, [name]: newValue }));
    };

    const handleBlur = () => {
        if (autoSaveHandler && !surveyId) {
            autoSaveHandler.debouncedSave(formData, step);
        }
    };

    const fetchMasterAddresses = async (pincode) => {
        try {
            const response = await addressAPI.list({ pincode });
            // Handle pagination (Django REST Framework default)
            const addresses = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setMasterAddresses(addresses);
        } catch (err) {
            console.error('Failed to load master addresses', err);
            setMasterAddresses([]);
        }
    };

    const validatePincode = async (pincode) => {
        if (pincode.length !== 6) {
            setPincodeValid(null);
            setMasterAddresses([]);
            return;
        }

        try {
            console.log('Validating pincode:', pincode);
            const response = await addressAPI.validatePincode(pincode);
            console.log('Pincode validation response:', response.data);
            if (response.data.valid) {
                setPincodeValid(true);
                const addresses = response.data.addresses || [];
                console.log('Loaded addresses:', addresses.length);
                setMasterAddresses(addresses);
            } else {
                setPincodeValid(false);
                setMasterAddresses([]);
            }
        } catch (err) {
            console.error('Pincode validation error:', err.response?.data || err.message);
            setPincodeValid(false);
            setMasterAddresses([]);
            setError(err.response?.data?.error || 'Pincode validation failed');
            setTimeout(() => setError(''), 4000);
        }
    };

    const handleAddressSelect = (e) => {
        const value = e.target.value;
        if (value === 'NEW') {
            setIsNewAddress(true);
            setFormData(prev => ({
                ...prev,
                address_line: '',
                landmark: '',
                address_id: null // clear link
            }));
        } else {
            setIsNewAddress(false);
            const address = masterAddresses.find(a => a.id === value);
            if (address) {
                setFormData(prev => ({
                    ...prev,
                    address_line: address.address_line1, // Simplification
                    landmark: address.landmark || '',
                    address_id: address.id // Link to master address
                }));
            }
        }
    };

    const validateStep1 = () => {
        if (!formData.address_line || !formData.pincode) {
            setError('Please fill in all required fields (*)');
            return false;
        }
        if (isNewAddress && !formData.address_line.trim().toLowerCase().startsWith('door no.')) {
            setError('Address must begin with "Door No." (e.g. Door No. 123, Street Name)');
            return false;
        }
        if (pincodeValid === false) {
            setError("Please enter a valid pincode for your assigned zone.");
            return false;
        }
        if (pincodeValid === null) {
            setError("Please enter a valid 6-digit pincode.");
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.head_name || formData.head_name.length < 3) {
            setError('Head of Household name must be at least 3 characters.');
            return false;
        }
        const age = parseInt(formData.head_age);
        if (!age || age < 18 || age > 120) {
            setError('Please enter a valid age (18-120).');
            return false;
        }
        if (!formData.head_gender) {
            setError('Please select a gender.');
            return false;
        }
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!formData.head_phone || !phoneRegex.test(formData.head_phone)) {
            setError('Please enter a valid 10-digit mobile number starting with 6-9.');
            return false;
        }
        return true;
    };

    const validateStep3 = () => {
        const total = parseInt(formData.total_members) || 0;
        const male = parseInt(formData.male_members) || 0;
        const female = parseInt(formData.female_members) || 0;
        const other = parseInt(formData.other_members) || 0;

        if (total !== (male + female + other)) {
            setError(`Total members (${total}) must equal sum of Male (${male}) + Female (${female}) + Other (${other}). Results in ${male + female + other}.`);
            return false;
        }

        if (!formData.annual_income) {
            setError('Please enter Annual Income.');
            return false;
        }
        return true;
    };

    const nextStep = () => {
        setError('');
        let isValid = false;

        if (step === 1) isValid = validateStep1();
        else if (step === 2) isValid = validateStep2();
        else if (step === 3) isValid = validateStep3();
        else isValid = true;

        if (isValid) {
            if (step < STEPS.length) {
                setStep(step + 1);
                if (autoSaveHandler && !surveyId) {
                    autoSaveHandler.save(formData, step + 1);
                }
            }
        } else {
            setTimeout(() => setError(''), 4000);
        }
    };

    const prevStep = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            // Try to get GPS position, but allow submission even if it fails
            let gps = { latitude: 0, longitude: 0 };
            let gpsError = null;

            try {
                gps = await getPosition();
            } catch (gpsErr) {
                // GPS failed - we'll still submit but with default coordinates
                // The backend will flag this with location_warning
                gpsError = typeof gpsErr === 'string' ? gpsErr : (gpsErr?.message || 'GPS unavailable');
                console.warn('GPS capture failed, submitting with default coordinates:', gpsError);
            }

            let response;

            // Prepare payload with correct field name for backend (address_id -> address)
            const payload = { ...formData };
            if (payload.address_id) {
                payload.address = payload.address_id;
            }

            if (surveyId) {
                // Update existing
                await surveyAPI.update(surveyId, payload);
                response = await surveyAPI.submit(surveyId, {
                    gps_latitude: Number(gps.latitude).toFixed(7),
                    gps_longitude: Number(gps.longitude).toFixed(7)
                });
            } else {
                // Create new
                // If it's a new address, 'address_id' should be null or omitted
                const createResponse = await surveyAPI.create(payload);
                response = await surveyAPI.submit(createResponse.data.id, {
                    gps_latitude: Number(gps.latitude).toFixed(7),
                    gps_longitude: Number(gps.longitude).toFixed(7)
                });
            }

            // Clear draft (with error handling to prevent crashes)
            if (autoSaveHandler) {
                try {
                    await autoSaveHandler.completeDraft();
                } catch (draftErr) {
                    console.warn('Failed to clear draft:', draftErr);
                    // Continue anyway - draft cleanup is not critical
                }
            }

            // Show success and redirect
            let message = '✓ Survey submitted successfully!';
            if (gpsError) {
                message = `⚠️ Survey submitted (GPS unavailable: ${gpsError})`;
            } else if (response?.data?.location_warning) {
                message = '⚠️ Survey submitted - Location warning flagged (submitted from different location)';
            }
            alert(message);
            navigate('/surveyor/dashboard');

        } catch (err) {
            // Extract detailed error message from API response
            let errorMessage = 'Failed to submit survey. Please try again.';

            // Handle string errors (from GPS rejection)
            if (typeof err === 'string') {
                errorMessage = err;
            } else if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.error) {
                    errorMessage = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
                } else if (data.detail) {
                    // Handle if detail is an object (causing the crash)
                    errorMessage = typeof data.detail === 'object'
                        ? (data.detail.message || JSON.stringify(data.detail))
                        : data.detail;
                } else if (typeof data === 'object') {
                    // Handle field-level validation errors
                    const fieldErrors = Object.entries(data)
                        .map(([field, errors]) => {
                            const errorMsg = Array.isArray(errors) ? errors.join(', ') : (typeof errors === 'object' ? JSON.stringify(errors) : errors);
                            return `${field}: ${errorMsg}`;
                        })
                        .join('; ');
                    if (fieldErrors) {
                        errorMessage = fieldErrors;
                    }
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error('Survey submission error:', err);
        }

        setLoading(false);
    };

    const saveDraft = async () => {
        setLoading(true);
        setError('');
        try {
            if (surveyId) {
                await surveyAPI.update(surveyId, formData);
            } else {
                await surveyAPI.create({ ...formData, status: 'DRAFT' });
                if (autoSaveHandler) {
                    try {
                        await autoSaveHandler.completeDraft();
                    } catch (draftErr) {
                        console.warn('Failed to clear local draft:', draftErr);
                    }
                }
            }
            alert('✓ Draft saved successfully!');
            navigate('/surveyor/dashboard');
        } catch (err) {
            // Extract detailed error message
            let errorMessage = 'Failed to save draft.';
            if (typeof err === 'string') {
                errorMessage = err;
            } else if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.error) {
                    errorMessage = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
                } else if (data.detail) {
                    errorMessage = typeof data.detail === 'object'
                        ? (data.detail.message || JSON.stringify(data.detail))
                        : data.detail;
                } else if (typeof data === 'object') {
                    const fieldErrors = Object.entries(data)
                        .map(([field, errors]) => {
                            const errorMsg = Array.isArray(errors) ? errors.join(', ') : (typeof errors === 'object' ? JSON.stringify(errors) : errors);
                            return `${field}: ${errorMsg}`;
                        })
                        .join('; ');
                    if (fieldErrors) {
                        errorMessage = fieldErrors;
                    }
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error('Save draft error:', err);
        }
        setLoading(false);
    };

    if (loading && step === 1) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>{surveyId ? 'Edit Survey' : 'New Survey'}</h2>
                {saving && <span className="text-muted">Auto-saving...</span>}
                {!isOnline && <span className="badge badge-flagged">Offline</span>}
            </div>

            {/* Step Indicator */}
            <div className="form-steps">
                {STEPS.map(s => (
                    <div
                        key={s.id}
                        className={`form-step ${step === s.id ? 'active' : ''} ${step > s.id ? 'completed' : ''}`}
                    >
                        <span className="step-number">{step > s.id ? '✓' : s.id}</span>
                        <span>{s.name}</span>
                    </div>
                ))}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                {/* Step 1: Address */}
                {step === 1 && (
                    <div>
                        <h3>Address Information</h3>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Pincode *</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    className={`form-input ${pincodeValid === false ? 'error' : ''}`}
                                    value={formData.pincode}
                                    onChange={(e) => {
                                        handleInputChange(e);
                                        validatePincode(e.target.value);
                                    }}
                                    onBlur={handleBlur}
                                    maxLength={6}
                                    required
                                />
                                {pincodeValid === false && (
                                    <span className="form-error">Invalid pincode for this zone</span>
                                )}
                            </div>

                            {pincodeValid && (
                                <div className="form-group">
                                    <label className="form-label">Select Address *</label>
                                    <select
                                        className="form-input form-select"
                                        onChange={handleAddressSelect}
                                        value={formData.address_id || (isNewAddress ? 'NEW' : '')}
                                    >
                                        <option value="">Select an address...</option>
                                        {masterAddresses.map(addr => (
                                            <option key={addr.id} value={addr.id}>
                                                {addr.address_line1} {addr.landmark ? `(${addr.landmark})` : ''} - {addr.status}
                                            </option>
                                        ))}
                                        <option value="NEW">+ New House / Not in List</option>
                                    </select>
                                </div>
                            )}

                            {(formData.address_id || isNewAddress) && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Address Line * <small style={{ color: 'var(--color-text-muted)' }}>(Must start with "Door No.")</small></label>
                                        <input
                                            type="text"
                                            name="address_line"
                                            className="form-input"
                                            placeholder="Door No. 123, Street Name"
                                            value={formData.address_line}
                                            onChange={handleInputChange}
                                            onBlur={handleBlur}
                                            required
                                            disabled={!!formData.address_id && !isNewAddress}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Landmark</label>
                                        <input
                                            type="text"
                                            name="landmark"
                                            className="form-input"
                                            value={formData.landmark}
                                            onChange={handleInputChange}
                                            onBlur={handleBlur}
                                            disabled={!!formData.address_id && !isNewAddress}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Household Head */}
                {step === 2 && (
                    <div>
                        <h3>Household Head Details</h3>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    type="text"
                                    name="head_name"
                                    className="form-input"
                                    value={formData.head_name}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Age *</label>
                                <input
                                    type="number"
                                    name="head_age"
                                    className="form-input"
                                    value={formData.head_age}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="18"
                                    max="120"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select
                                    name="head_gender"
                                    className="form-input form-select"
                                    value={formData.head_gender}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input
                                    type="tel"
                                    name="head_phone"
                                    className="form-input"
                                    value={formData.head_phone}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    maxLength={10}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Education</label>
                                <select
                                    name="head_education"
                                    className="form-input form-select"
                                    value={formData.head_education}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                >
                                    <option value="">Select Education</option>
                                    <option value="NONE">No Formal Education</option>
                                    <option value="PRIMARY">Primary School</option>
                                    <option value="SECONDARY">Secondary School</option>
                                    <option value="HIGHER_SECONDARY">Higher Secondary</option>
                                    <option value="GRADUATE">Graduate</option>
                                    <option value="POST_GRADUATE">Post Graduate</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Occupation</label>
                                <input
                                    type="text"
                                    name="head_occupation"
                                    className="form-input"
                                    value={formData.head_occupation}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Members */}
                {step === 3 && (
                    <div>
                        <h3 style={{ marginBottom: '24px' }}>Household Members</h3>

                        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px', padding: '16px' }}>
                            <div className="grid grid-2">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Total Members *</label>
                                    <input
                                        type="number"
                                        name="total_members"
                                        className="form-input"
                                        value={formData.total_members}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        min="1"
                                        required
                                        style={{ fontSize: '1.25rem', fontWeight: 'bold' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Annual Income *</label>
                                    <select
                                        name="annual_income"
                                        className="form-input form-select"
                                        value={formData.annual_income}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        required
                                    >
                                        <option value="">Select Range</option>
                                        <option value="BELOW_1L">Below ₹1 Lakh</option>
                                        <option value="1L_3L">₹1 - 3 Lakh</option>
                                        <option value="3L_5L">₹3 - 5 Lakh</option>
                                        <option value="5L_10L">₹5 - 10 Lakh</option>
                                        <option value="ABOVE_10L">Above ₹10 Lakh</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <h4 style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>Member Breakdown</h4>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Male Members</label>
                                <input
                                    type="number"
                                    name="male_members"
                                    className="form-input"
                                    value={formData.male_members}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Female Members</label>
                                <input
                                    type="number"
                                    name="female_members"
                                    className="form-input"
                                    value={formData.female_members}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Children (Under 5)</label>
                                <input
                                    type="number"
                                    name="children_under_5"
                                    className="form-input"
                                    value={formData.children_under_5}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Children (5-18)</label>
                                <input
                                    type="number"
                                    name="children_5_to_18"
                                    className="form-input"
                                    value={formData.children_5_to_18}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Senior Citizens</label>
                                <input
                                    type="number"
                                    name="senior_citizens"
                                    className="form-input"
                                    value={formData.senior_citizens}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Other Members</label>
                                <input
                                    type="number"
                                    name="other_members"
                                    className="form-input"
                                    value={formData.other_members}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                        </div>

                        <h4 style={{ marginTop: '24px', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>Facilities & Ownership</h4>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Ownership Type</label>
                                <select
                                    name="ownership_type"
                                    className="form-input form-select"
                                    value={formData.ownership_type}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                >
                                    <option value="">Select Type</option>
                                    <option value="OWNED">Owned</option>
                                    <option value="RENTED">Rented</option>
                                    <option value="GOVERNMENT">Government Allotted</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amenities</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="has_electricity"
                                            checked={formData.has_electricity}
                                            onChange={handleInputChange}
                                        />
                                        Electricity
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="has_water_connection"
                                            checked={formData.has_water_connection}
                                            onChange={handleInputChange}
                                        />
                                        Water
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="has_toilet"
                                            checked={formData.has_toilet}
                                            onChange={handleInputChange}
                                        />
                                        Toilet
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="has_lpg"
                                            checked={formData.has_lpg}
                                            onChange={handleInputChange}
                                        />
                                        LPG
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <div>
                        <h3 style={{ marginBottom: '24px' }}>Review & Submit</h3>

                        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                            <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>Address</h4>
                            <p><strong>Address:</strong> {formData.address_line}</p>
                            <p><strong>Pincode:</strong> {formData.pincode}</p>
                            {formData.landmark && <p><strong>Landmark:</strong> {formData.landmark}</p>}
                        </div>

                        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                            <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>Head of Household</h4>
                            <div className="grid grid-2">
                                <p><strong>Name:</strong> {formData.head_name}</p>
                                <p><strong>Phone:</strong> {formData.head_phone || 'N/A'}</p>
                                <p><strong>Age:</strong> {formData.head_age}</p>
                                <p><strong>Gender:</strong> {formData.head_gender}</p>
                            </div>
                        </div>

                        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                            <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>Members & Economic Status</h4>
                            <div className="grid grid-2">
                                <p><strong>Total Members:</strong> {formData.total_members}</p>
                                <p><strong>Annual Income:</strong> {formData.annual_income}</p>
                                <p><strong>Ownership:</strong> {formData.ownership_type || 'N/A'}</p>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <p><strong>Amenities:</strong> {[
                                    formData.has_electricity && 'Electricity',
                                    formData.has_water_connection && 'Water',
                                    formData.has_toilet && 'Toilet',
                                    formData.has_lpg && 'LPG'
                                ].filter(Boolean).join(', ') || 'None'}</p>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Remarks / Notes</label>
                            <textarea
                                name="remarks"
                                className="form-input"
                                rows="3"
                                value={formData.remarks}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                placeholder="Any additional observations..."
                            ></textarea>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', padding: '24px', background: 'white', borderTop: '1px solid var(--color-border)', position: 'sticky', bottom: 0, zIndex: 10 }}>
                <button
                    className="btn btn-secondary"
                    onClick={prevStep}
                    disabled={step === 1 || loading}
                >
                    Back
                </button>

                {step < STEPS.length ? (
                    <button
                        className="btn btn-primary"
                        onClick={nextStep}
                    >
                        Next Step
                    </button>
                ) : (
                    <button
                        className="btn btn-success"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit Survey'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default SurveyForm;
