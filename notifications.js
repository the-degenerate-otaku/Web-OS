const NotificationEngine = {
    history: [],
    unread: 0,

    init() {
        try {
            const saved = localStorage.getItem('flux_notifications');
            if (saved) {
                this.history = JSON.parse(saved);
                this.renderHistory();
            }
        } catch (e) { }
    },

    save() {
        localStorage.setItem('flux_notifications', JSON.stringify(this.history));
    },

    push(title, message) {
        const notif = { title, message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        this.history.unshift(notif);
        if (this.history.length > 50) this.history.pop();

        this.unread++;
        this.save();
        this.renderHistory();
        this.updateBadge();
        this.showToast(notif);
    },

    showToast(notif) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';

        const tTitle = document.createElement('strong');
        tTitle.textContent = notif.title;

        const tMsg = document.createElement('span');
        tMsg.textContent = notif.message;

        toast.append(tTitle, tMsg);
        container.appendChild(toast);

        if (window.gsap) {
            gsap.fromTo(toast, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
            setTimeout(() => {
                gsap.to(toast, { x: 100, opacity: 0, duration: 0.3, onComplete: () => toast.remove() });
            }, 3500);
        } else {
            setTimeout(() => toast.remove(), 3500);
        }
    },

    renderHistory() {
        const list = document.getElementById('notif-list');
        if (!list) return;
        list.innerHTML = ''; 

        this.history.forEach(n => {
            const item = document.createElement('div');
            item.className = 'notif-item';

            const header = document.createElement('div');
            header.className = 'notif-header';

            const title = document.createElement('strong');
            title.textContent = n.title;

            const time = document.createElement('small');
            time.textContent = n.time;

            header.append(title, time);

            const msg = document.createElement('div');
            msg.textContent = n.message;

            item.append(header, msg);
            list.appendChild(item);
        });
    },

    updateBadge() {
        const badge = document.getElementById('notif-badge');
        if (!badge) return;
        if (this.unread > 0) {
            badge.textContent = this.unread;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },

    togglePanel() {
        const panel = document.getElementById('notification-panel');
        if (!panel) return;

        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            if (window.gsap) {
                gsap.fromTo(panel, { x: 300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
            }
            this.unread = 0;
            this.updateBadge();
        } else {
            if (window.gsap) {
                gsap.to(panel, { x: 300, opacity: 0, duration: 0.2, ease: "power2.in", onComplete: () => panel.classList.add('hidden') });
            } else {
                panel.classList.add('hidden');
            }
        }
    }
};

window.addEventListener('load', () => NotificationEngine.init());