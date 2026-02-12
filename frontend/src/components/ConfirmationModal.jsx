import React from 'react';
import Modal from './Modal';

/**
 * Reusable Confirmation Modal
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Function to call on confirmation
 * @param {Function} onCancel - Function to call on cancellation
 * @param {string} confirmText - Text for confirm button
 * @param {string} cancelText - Text for cancel button
 * @param {string} type - 'warning', 'error', 'info', 'success'
 */
function ConfirmationModal({
    isOpen,
    title = 'Confirm Action',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
}) {
    return (
        <Modal
            isOpen={isOpen}
            title={title}
            onClose={onCancel}
            type={type}
            footer={
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                        style={{ minWidth: '80px' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn btn-${type === 'error' ? 'primary' : 'primary'}`}
                        onClick={onConfirm}
                        style={{
                            minWidth: '80px',
                            backgroundColor: type === 'error' ? '#ef4444' : undefined,
                            borderColor: type === 'error' ? '#ef4444' : undefined
                        }}
                    >
                        {confirmText}
                    </button>
                </>
            }
        >
            <p style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
                {message}
            </p>
        </Modal>
    );
}

export default ConfirmationModal;
