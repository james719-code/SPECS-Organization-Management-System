import { Modal } from 'bootstrap';

let modalInstance = null;
let modalEl = null;

function ensureModalExists() {
    if (modalEl && document.body.contains(modalEl)) return;

    modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.id = 'globalConfirmModal';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <div class="modal-body p-4 text-center">
                    <div id="confirmIcon" class="mb-3"></div>
                    <h5 id="confirmTitle" class="fw-bold mb-2"></h5>
                    <p id="confirmMessage" class="text-muted small mb-4"></p>
                    <div class="d-flex gap-2 justify-content-center">
                        <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" id="confirmActionBtn" class="btn rounded-pill px-4"></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalEl);
    modalInstance = new Modal(modalEl);
}

/**
 * Show a confirmation modal dialog (replaces window.confirm)
 * @param {string} title - Modal title
 * @param {string} message - Description text
 * @param {string} confirmLabel - Text for the confirm button (default: "Confirm")
 * @param {string} variant - Bootstrap variant for confirm button: "danger", "warning", "success", "primary" (default: "danger")
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
export function confirmAction(title, message, confirmLabel = 'Confirm', variant = 'danger') {
    ensureModalExists();

    const iconMap = {
        danger: '<div class="bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center" style="width:56px;height:56px;"><i class="bi bi-exclamation-triangle-fill" style="font-size:1.5rem;"></i></div>',
        warning: '<div class="bg-warning-subtle text-warning rounded-circle d-inline-flex align-items-center justify-content-center" style="width:56px;height:56px;"><i class="bi bi-exclamation-circle-fill" style="font-size:1.5rem;"></i></div>',
        success: '<div class="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center" style="width:56px;height:56px;"><i class="bi bi-check-circle-fill" style="font-size:1.5rem;"></i></div>',
        primary: '<div class="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center" style="width:56px;height:56px;"><i class="bi bi-question-circle-fill" style="font-size:1.5rem;"></i></div>',
        info: '<div class="bg-info-subtle text-info rounded-circle d-inline-flex align-items-center justify-content-center" style="width:56px;height:56px;"><i class="bi bi-info-circle-fill" style="font-size:1.5rem;"></i></div>'
    };

    modalEl.querySelector('#confirmIcon').innerHTML = iconMap[variant] || iconMap.danger;
    modalEl.querySelector('#confirmTitle').textContent = title;
    modalEl.querySelector('#confirmMessage').textContent = message;

    const btn = modalEl.querySelector('#confirmActionBtn');
    btn.className = `btn btn-${variant} rounded-pill px-4`;
    btn.textContent = confirmLabel;

    return new Promise((resolve) => {
        let resolved = false;

        const cleanup = () => {
            btn.removeEventListener('click', onConfirm);
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
        };

        const onConfirm = () => {
            resolved = true;
            cleanup();
            modalInstance.hide();
            resolve(true);
        };

        const onHidden = () => {
            if (!resolved) {
                cleanup();
                resolve(false);
            }
        };

        btn.addEventListener('click', onConfirm);
        modalEl.addEventListener('hidden.bs.modal', onHidden);

        modalInstance.show();
    });
}
