
const NOTIFICATION_STYLES = `
.ska-notification-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 100vh;
  overflow:hidden; /* Hides vertical overflow */
  flex-wrap: wrap;
  padding: 10px;
  pointer-events: none;
}
.ska-notification-container::-webkit-scrollbar {
  display: none; /* Hides scrollbar for WebKit browsers (Chrome, Safari, etc.) */
}

.ska-top-right { top: 0; right: 0; }
.ska-top-left { top: 0; left: 0; }
.ska-bottom-right { bottom: 0; right: 0; }
.ska-bottom-left { bottom: 0; left: 0; }
.ska-top-center { top: 0; left: 50%; transform: translateX(-50%); }
.ska-bottom-center { bottom: 0; left: 50%; transform: translateX(-50%); }

.ska-notification {
  position: relative;
  min-width: 300px;
  max-width: 450px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 12px;
  align-items: start;
  pointer-events: all;
  overflow: hidden;
}

.ska-notification.ska-success { border-left: 4px solid #10B981; }
.ska-notification.ska-error { border-left: 4px solid #EF4444; }
.ska-notification.ska-warning { border-left: 4px solid #F59E0B; }
.ska-notification.ska-info { border-left: 4px solid #3B82F6; }

.ska-content {
  flex: 1;
  margin-right: 8px;
}

.ska-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.ska-close {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.ska-close:hover {
  opacity: 1;
}

.ska-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.ska-action {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #F3F4F6;
  cursor: pointer;
  transition: background 0.2s;
}

.ska-action:hover {
  background: #E5E7EB;
}

.ska-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.2;
  transition: width 0.1s linear;
}

@keyframes ska-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes ska-slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
`;
// Core Notification System
class NotificationSystem {
    constructor() {
      this.notifications = new Map();
      this.counter = 0;
      this.positions = new Set([
        'top-right', 'top-left', 'bottom-right', 'bottom-left',
        'top-center', 'bottom-center'
      ]);
      this.init();
    }
  
    init() {
      // Create container for each position
      this.positions.forEach(position => {
        const container = document.createElement('div');
        container.className = `ska-notification-container ska-${position}`;
        document.body.appendChild(container);
      });
  
      // Add styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = NOTIFICATION_STYLES;
      document.head.appendChild(styleSheet);
    }
  
    show({
      title = '',
      message = '',
      type = 'info',
      position = 'top-right',
      duration = 5000,
      actions = [],
      progress = false,
      pauseOnHover = true,
      dismissible = true,
      icon = null,
      template = null,
      customClass = '',
      zIndex = 1000,
      onShow = () => {},
      onDismiss = () => {},
      onAction = () => {}
    } = {}) {
      const id = `notification-${this.counter++}`;
      const container = document.querySelector(`.ska-${position}`);
      
      // Create notification element
      const notificationEl = document.createElement('div');
      notificationEl.id = id;
      notificationEl.className = `ska-notification ska-${type} ${customClass}`;
      notificationEl.style.zIndex = zIndex;
  
      // Custom template or default layout
      const content = template ? template : `
        ${icon ? `<div class="ska-icon">${icon}</div>` : ''}
        <div class="ska-content">
          ${title ? `<div class="ska-title">${title}</div>` : ''}
          <div class="ska-message">${message}</div>
        </div>
        ${dismissible ? '<button class="ska-close">×</button>' : ''}
        ${actions.length ? `
          <div class="ska-actions">
            ${actions.map((action, index) => `
              <button class="ska-action" data-action-index="${index}">
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
        ${progress ? '<div class="ska-progress"></div>' : ''}
      `;
  
      notificationEl.innerHTML = content;
  
      // Add to container with enter animation
      notificationEl.style.animation = 'ska-slide-in 0.3s ease-out';
      container.appendChild(notificationEl);
  
      // Setup event listeners
      let timeoutId;
      let progressInterval;
  
      const dismiss = () => {
        notificationEl.style.animation = 'ska-slide-out 0.3s ease-out';
        notificationEl.addEventListener('animationend', () => {
          notificationEl.remove();
          this.notifications.delete(id);
          onDismiss();
        });
      };
  
      // Handle actions
      notificationEl.addEventListener('click', (e) => {
        const actionButton = e.target.closest('.ska-action');
        if (actionButton) {
          const index = parseInt(actionButton.dataset.actionIndex);
          const action = actions[index];
          if (action && action.onClick) {
            action.onClick();
            onAction(action);
            if (action.dismiss) dismiss();
          }
        }
  
        if (e.target.classList.contains('ska-close')) {
          dismiss();
        }
      });
  
      // Handle pause on hover
      if (pauseOnHover && duration !== 0) {
        notificationEl.addEventListener('mouseenter', () => {
          clearTimeout(timeoutId);
          if (progress) clearInterval(progressInterval);
        });
  
        notificationEl.addEventListener('mouseleave', () => {
          if (duration) setupTimeout();
          if (progress) setupProgress();
        });
      }
  
      // Setup auto-dismiss timeout
      const setupTimeout = () => {
        if (duration) {
          timeoutId = setTimeout(dismiss, duration);
        }
      };
  
      // Setup progress bar
      const setupProgress = () => {
        if (!progress) return;
        
        const progressBar = notificationEl.querySelector('.ska-progress');
        let width = 100;
        const step = 100 / (duration / 10); // Update every 10ms
  
        progressInterval = setInterval(() => {
          width -= step;
          if (width <= 0) {
            clearInterval(progressInterval);
          } else {
            progressBar.style.width = `${width}%`;
          }
        }, 10);
      };
  
      // Store notification data
      this.notifications.set(id, {
        element: notificationEl,
        dismiss,
        timeoutId,
        progressInterval
      });
  
      // Initialize timeout and progress
      setupTimeout();
      setupProgress();
      onShow();
  
      // Return control methods
      return {
        id,
        dismiss,
        update: (newOptions) => {
          const notification = this.notifications.get(id);
          if (notification) {
            // Update content and options
            const updatedOptions = { ...arguments[0], ...newOptions };
            notification.element.innerHTML = content;
            // Reset timeout if duration changed
            if (newOptions.duration) {
              clearTimeout(notification.timeoutId);
              setupTimeout();
            }
          }
        }
      };
    }
  
    // Clear all notifications
    clearAll() {
      this.notifications.forEach(notification => notification.dismiss());
    }
  
    // Update global settings
    updateSettings(settings = {}) {
      Object.assign(this, settings);
    }
  }
  
  // Create singleton instance
  const Notify = new NotificationSystem();
  export default Notify;
 
