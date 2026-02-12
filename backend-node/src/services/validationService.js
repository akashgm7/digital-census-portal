/**
 * Validation Service
 * Ports logic from Django serializers.
 */

const validateSurveyResponse = (data, isDraft = false) => {
    const errors = [];

    // 1. Draft check: If draft, skip strict validation
    if (isDraft) return { isValid: true, errors: [] };

    // 2. Age/Occupation Rule
    // If head_age < 18, head_occupation must be "Student" or empty
    if (data.headAge && data.headAge < 18) {
        const occupation = data.headOccupation || ''; // Assuming occupation is a field (not in prompt schema but implied by logic)
        // Wait, prompt schema for SurveyResponse didn't allow 'occupation'. 
        // Checking prompt: "Age/Occupation: If head_age < 18, head_occupation must be 'Student' or empty."
        // Schema in prompt: "head_name, head_gender, head_age, family_members, schemes_availed..."
        // It seems 'occupation' might be missing from the prompt's schema list but required for validation? 
        // Or maybe it's inside `family_members`?
        // "head_occupation" implies it's a field on the head.
        // I will assume it's part of the request body even if not explicitly in the minimal schema list, 
        // or maybe I should check family members.
        // Let's assume it's a field `headOccupation` passed in data.

        if (data.headOccupation && data.headOccupation !== 'Student') {
            errors.push("If head is under 18, occupation must be 'Student'.");
        }
    }

    // 3. Gender Math
    // total_members must equal sum of male + female + other
    if (data.totalMembers !== undefined) {
        // Assuming these fields exist in data or derived from family_members
        // If family_members is an array, we can calc logic from it.
        // Prompt: "Gender Math: total_members must equal the sum of male + female + other."
        // This implies input has these summary fields OR we validate the array.
        // Let's stick to the prompt's likely intent: validating summary fields if provided.

        const males = data.males || 0;
        const females = data.females || 0;
        const others = data.others || 0;
        const statedTotal = data.totalMembers || 0;

        if (statedTotal !== (males + females + others)) {
            errors.push(`Total members (${statedTotal}) does not match sum of genders (${males + females + others}).`);
        }
    }

    // 4. Phone Number
    // "Must be exactly 10 digits." 
    // Survey response usually has a phone? Or refers to User?
    // Use generic phone validator if needed.

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateUser = (data) => {
    const errors = [];

    // Phone Format: Force +91 prefix.
    // We expect input to be 10 digits or already have +91?
    // Prompt: "Force +91 prefix on user creation." -> This is a transformation, not just validation.
    // Validation: "Phone Number: Must be exactly 10 digits."
    if (data.phoneNumber) {
        // Strip +91 if present to check digits
        const cleanPhone = data.phoneNumber.replace('+91', '').trim();
        if (!/^\d{10}$/.test(cleanPhone)) {
            errors.push("Phone number must be exactly 10 digits.");
        }
    }

    // Role Rules: Supervisors/Surveyors must be assigned a Zone
    if (['SUPERVISOR', 'SURVEYOR'].includes(data.role)) {
        if (!data.zoneId) {
            errors.push(`${data.role} must be assigned to a Zone.`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateSurveyResponse,
    validateUser
};
