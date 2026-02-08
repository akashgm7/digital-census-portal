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
    // Members
    total_members: 1,
    male_members: 1,
    female_members: 0,
    children_under_5: 0,
    children_5_18: 0,
    adults_18_60: 1,
    senior_above_60: 0,
    // Additional
    income_range: '',
    house_ownership: '',
    water_source: '',
    toilet_type: '',
    cooking_fuel: '',
    electricity: true,
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

    const validatePincode = async (pincode) => {
        if (pincode.length !== 6) {
            setPincodeValid(null);
            return;
        }

        try {
            const response = await addressAPI.validatePincode(pincode);
            setPincodeValid(response.data.valid);
        } catch (err) {
            setPincodeValid(false);
        }
    };

    const nextStep = () => {
        if (step < STEPS.length) {
            setStep(step + 1);
            if (autoSaveHandler && !surveyId) {
                autoSaveHandler.save(formData, step + 1);
            }
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
            // Get GPS position first
            const gps = await getPosition();

            let response;
            if (surveyId) {
                // Update existing
                await surveyAPI.update(surveyId, formData);
                response = await surveyAPI.submit(surveyId, {
                    gps_latitude: gps.latitude,
                    gps_longitude: gps.longitude
                });
            } else {
                // Create new
                const createResponse = await surveyAPI.create(formData);
                response = await surveyAPI.submit(createResponse.data.id, {
                    gps_latitude: gps.latitude,
                    gps_longitude: gps.longitude
                });
            }

            // Clear draft
            if (autoSaveHandler) {
                await autoSaveHandler.completeDraft();
            }

            // Show success and redirect
            alert(response.data.location_warning
                ? '⚠️ Survey submitted - Location warning flagged'
                : '✓ Survey submitted successfully!');
            navigate('/surveyor/dashboard');

        } catch (err) {
            setError(err.message || 'Failed to submit survey. Please try again.');
        }

        setLoading(false);
    };

    const saveDraft = async () => {
        setLoading(true);
        try {
            if (surveyId) {
                await surveyAPI.update(surveyId, formData);
            } else {
                await surveyAPI.create({ ...formData, status: 'DRAFT' });
                if (autoSaveHandler) {
                    await autoSaveHandler.completeDraft();
                }
            }
            navigate('/surveyor/dashboard');
        } catch (err) {
            setError('Failed to save draft.');
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
                                <label className="form-label">Address Line *</label>
                                <input
                                    type="text"
                                    name="address_line"
                                    className="form-input"
                                    value={formData.address_line}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    required
                                />
                            </div>
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
                            <div className="form-group">
                                <label className="form-label">Landmark</label>
                                <input
                                    type="text"
                                    name="landmark"
                                    className="form-input"
                                    value={formData.landmark}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                />
                            </div>
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
                        <h3>Household Members</h3>
                        <div className="grid grid-2">
                            <div className="form-group">
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
                                />
                            </div>
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
                                    name="children_5_18"
                                    className="form-input"
                                    value={formData.children_5_18}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Adults (18-60)</label>
                                <input
                                    type="number"
                                    name="adults_18_60"
                                    className="form-input"
                                    value={formData.adults_18_60}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Seniors (Above 60)</label>
                                <input
                                    type="number"
                                    name="senior_above_60"
                                    className="form-input"
                                    value={formData.senior_above_60}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    min="0"
                                />
                            </div>
                        </div>

                        <h4 style={{ marginTop: '24px' }}>Household Facilities</h4>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Income Range</label>
                                <select
                                    name="income_range"
                                    className="form-input form-select"
                                    value={formData.income_range}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                >
                                    <option value="">Select Range</option>
                                    <option value="BELOW_1L">Below ₹1 Lakh</option>
                                    <option value="1L_3L">₹1 - 3 Lakh</option>
                                    <option value="3L_5L">₹3 - 5 Lakh</option>
                                    <option value="5L_10L">₹5 - 10 Lakh</option>
                                    <option value="ABOVE_10L">Above ₹10 Lakh</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">House Ownership</label>
                                <select
                                    name="house_ownership"
                                    className="form-input form-select"
                                    value={formData.house_ownership}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                >
                                    <option value="">Select</option>
                                    <option value="OWNED">Owned</option>
                                    <option value="RENTED">Rented</option>
                                    <option value="GOVERNMENT">Government Allotted</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Water Source</label>
                                <select
                                    name="water_source"
                                    className="form-input form-select"
                                    value={formData.water_source}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                >
                                    <option value="">Select</option>
                                    <option value="TAP">Municipal Tap</option>
                                    <option value="WELL">Well</option>
                                    <option value="BOREWELL">Borewell</option>
                                    <option value="TANKER">Tanker</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Toilet Type</label>
                                <select
                                    name="toilet_type"
                                    className="form-input form-select"
                                    value={formData.toilet_type}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                >
                                    <option value="">Select</option>
                                    <option value="FLUSH">Flush Toilet</option>
                                    <option value="PIT">Pit Latrine</option>
                                    <option value="COMMUNITY">Community Toilet</option>
                                    <option value="NONE">Open Defecation</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <div>
                        <h3>Review & Submit</h3>

                        <div className="alert alert-info" style={{ marginBottom: '24px' }}>
                            Please review all information before submitting. GPS location will be captured on submit.
                        </div>

                        <div className="grid grid-2" style={{ marginBottom: '24px' }}>
                            <div>
                                <h4>Address</h4>
                                <p>{formData.address_line}</p>
                                <p>Pincode: {formData.pincode}</p>
                                {formData.landmark && <p>Landmark: {formData.landmark}</p>}
                            </div>
                            <div>
                                <h4>Household Head</h4>
                                <p><strong>{formData.head_name}</strong></p>
                                <p>Age: {formData.head_age} | Gender: {formData.head_gender}</p>
                                {formData.head_phone && <p>Phone: {formData.head_phone}</p>}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4>Members Summary</h4>
                            <p>Total: {formData.total_members} | Male: {formData.male_members} | Female: {formData.female_members}</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Additional Remarks</label>
                            <textarea
                                name="remarks"
                                className="form-input"
                                value={formData.remarks}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                rows={3}
                            />
                        </div>

                        {gpsError && (
                            <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                                {gpsError}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    <div>
                        {step > 1 && (
                            <button className="btn btn-secondary" onClick={prevStep}>
                                ← Previous
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={saveDraft} disabled={loading}>
                            Save Draft
                        </button>
                        {step < STEPS.length ? (
                            <button className="btn btn-primary" onClick={nextStep}>
                                Next →
                            </button>
                        ) : (
                            <button
                                className="btn btn-success"
                                onClick={handleSubmit}
                                disabled={loading || gpsLoading}
                            >
                                {gpsLoading ? 'Capturing GPS...' : loading ? 'Submitting...' : 'Submit Survey'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SurveyForm;
