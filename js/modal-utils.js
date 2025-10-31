// Utilitaires pour les modales

class ModalManager {
    constructor() {
        this.notificationModal = document.getElementById('notificationModal');
        this.confirmModal = document.getElementById('confirmModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Notification OK
        document.getElementById('notificationOk').addEventListener('click', () => {
            this.closeNotification();
        });

        // Fermer sur clic en dehors
        this.notificationModal.addEventListener('click', (e) => {
            if (e.target === this.notificationModal) {
                this.closeNotification();
            }
        });

        this.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.confirmModal) {
                this.closeConfirm();
            }
        });
    }

    // Afficher une notification
    showNotification(message, type = 'info') {
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const icon = document.getElementById('notificationIcon');
        const messageEl = document.getElementById('notificationMessage');

        icon.textContent = iconMap[type] || iconMap.info;
        icon.className = `notification-icon ${type}`;
        messageEl.textContent = message;

        this.notificationModal.style.display = 'block';
        
        // Animation d'entrée
        setTimeout(() => {
            this.notificationModal.querySelector('.modal-content').style.animation = 'slideIn 0.3s';
        }, 10);
    }

    // Fermer la notification
    closeNotification() {
        this.notificationModal.style.display = 'none';
    }

    // Afficher une confirmation
    showConfirm(message, title = 'Confirmation') {
        return new Promise((resolve) => {
            const titleEl = document.getElementById('confirmTitle');
            const messageEl = document.getElementById('confirmMessage');
            const okBtn = document.getElementById('confirmOk');
            const cancelBtn = document.getElementById('confirmCancel');

            titleEl.textContent = title;
            messageEl.textContent = message;

            // Supprimer les anciens listeners
            const newOkBtn = okBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // Nouveaux listeners
            newOkBtn.addEventListener('click', () => {
                this.closeConfirm();
                resolve(true);
            });

            newCancelBtn.addEventListener('click', () => {
                this.closeConfirm();
                resolve(false);
            });

            this.confirmModal.style.display = 'block';
        });
    }

    // Fermer la confirmation
    closeConfirm() {
        this.confirmModal.style.display = 'none';
    }

    // Afficher le chargement
    showLoading(message = 'Chargement...') {
        document.getElementById('loadingMessage').textContent = message;
        this.loadingOverlay.style.display = 'flex';
    }

    // Masquer le chargement
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    // Notification de succès (raccourci)
    success(message) {
        this.showNotification(message, 'success');
    }

    // Notification d'erreur (raccourci)
    error(message) {
        this.showNotification(message, 'error');
    }

    // Notification d'avertissement (raccourci)
    warning(message) {
        this.showNotification(message, 'warning');
    }

    // Notification d'info (raccourci)
    info(message) {
        this.showNotification(message, 'info');
    }
}

// Instance globale
const modalManager = new ModalManager();
