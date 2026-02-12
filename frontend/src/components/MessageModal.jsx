import React from 'react';
import Modal from './Modal';

/**
 * Reusable Message Modal (replacement for alert)
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - Modal title
 * @param {string} message - Message content
 * @param {Function} onClose - Function to call on close
 * @param {string} buttonText - Text for close button
 * @param {string} type - 'info', 'success', 'warning', 'error'
 */
function MessageModal({
    isOpen,
    title = 'Information',
    message,
    onClose,
    buttonText = 'OK',
    type = 'info'
}) {
    return (
        <Modal
            isOpen={isOpen}
            title={title}
            onClose={onClose}
            type={type}
            footer={
                <button
                    className="btn btn-primary"
                    onClick={onClose}
                    style={{ minWidth: '80px' }}
                >
                    {buttonText}
                </button>
            }
        >
            <p style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
                {message}
            </p>
        </Modal>
    );
}

export default MessageModal;
